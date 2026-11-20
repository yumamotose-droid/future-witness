import { GoogleGenAI } from "@google/genai";
import {
  ProviderError,
  type AIProvider,
  type GenerateJsonRequest,
  type GenerateTextRequest,
  type JsonResult,
} from "./provider";
import { estimateTokens } from "@/lib/security/budget";

/**
 * Gemini adapter.
 *
 * The API key is read from the server environment only and never leaves this
 * module. Nothing here is imported by a client component; the one entry point
 * for the browser is the `/api/deliberate` route.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

/**
 * Models to fall back to, in order, when the preferred one is busy.
 *
 * Gemini returns 503 UNAVAILABLE under load, and during this project's
 * testing the flash tier was unavailable for long stretches while the lite
 * tier answered in about a second. Trying the next model before giving up
 * keeps a public demo working; degrading to the scripted engine stays the
 * last resort, and the audit names whichever model actually answered.
 */
export const MODEL_FALLBACKS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

/**
 * How long one model gets before we move to the next.
 *
 * Measured during this project: a congested Gemini model may answer 503 in a
 * second, or simply not answer for the full request timeout. Walking the
 * fallback chain is only useful if a silent model is abandoned quickly —
 * otherwise the chain itself spends the run's whole budget.
 */
const PER_MODEL_TIMEOUT_MS = 12_000;
/** No chunk for this long means the body has stalled. */
const STREAM_IDLE_LIMIT_MS = 15_000;
/** A whole response body may not outlast this, however steadily it trickles. */
const STREAM_TOTAL_LIMIT_MS = 60_000;

/**
 * Models known to be busy, and when to try them again.
 *
 * Without this, every step of a run re-walks the whole chain against a tier
 * that is uniformly overloaded, and a deliberation spends its entire 110s
 * budget discovering the same thing nine times. Remembering the answer for a
 * minute lets the run give up in seconds and fall back to the scripted
 * engine, which is a far better thing to hand a reader than two minutes of
 * waiting followed by the same result.
 *
 * Process-local and deliberately short: congestion clears on its own, and a
 * stale entry would keep a recovered model out of service.
 */
const busyUntil = new Map<string, number>();
const BUSY_COOLDOWN_MS = 60_000;
/**
 * A timeout is weaker evidence than a 503. The request's own size can cause
 * one, so a single timeout must not take a model out of service for every
 * other request in this process. Two in a row, and a shorter cooldown.
 */
const TIMEOUT_COOLDOWN_MS = 20_000;
const TIMEOUT_STRIKES = 2;
const timeoutStrikes = new Map<string, number>();

function markBusy(model: string, code: string): void {
  if (code === "overloaded" || code === "rate_limited") {
    // Upstream said it has no capacity. Believe it.
    busyUntil.set(model, Date.now() + BUSY_COOLDOWN_MS);
    timeoutStrikes.delete(model);
    return;
  }
  const strikes = (timeoutStrikes.get(model) ?? 0) + 1;
  if (strikes >= TIMEOUT_STRIKES) {
    busyUntil.set(model, Date.now() + TIMEOUT_COOLDOWN_MS);
    timeoutStrikes.delete(model);
  } else {
    timeoutStrikes.set(model, strikes);
  }
}

/**
 * A hard ceiling that does not depend on the callee's cooperation.
 *
 * `AbortSignal` is a request, not a guarantee: a call already streaming a
 * response body can ignore it, and a live run measured 32 minutes against a
 * declared 110s budget because of exactly that. Racing a timer bounds the wait
 * whatever the SDK does. The losing promise keeps running, so its rejection is
 * handled here to avoid an unhandled rejection; its abort signal is already
 * firing, so it will wind down on its own.
 */
export function withHardLimit<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  work.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ProviderError(`${label} did not answer within ${ms}ms`, "timeout", true)),
      ms,
    );
  });
  return Promise.race([work, limit]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

function available(models: string[], now = Date.now()): string[] {
  const free = models.filter((m) => (busyUntil.get(m) ?? 0) <= now);
  // If everything is marked busy, try the preferred one anyway: the cooldown
  // is a hint, not a fact, and refusing to call at all would be worse.
  return free.length > 0 ? free : models.slice(0, 1);
}

function modelChain(preferred: string): string[] {
  const configured = process.env.GEMINI_MODEL_FALLBACKS?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const rest = configured ?? MODEL_FALLBACKS;
  return [preferred, ...rest.filter((m) => m !== preferred)];
}

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ProviderError(
      "GEMINI_API_KEY is not set on the server.",
      "no_key",
    );
  }
  return new GoogleGenAI({ apiKey });
}

function mapError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number })?.status;
  if (status === 429 || /quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(message)) {
    return new ProviderError(message, "rate_limited", true);
  }
  // 503 UNAVAILABLE is the model being busy, not the request being wrong.
  // It clears on its own, so it is worth waiting for rather than failing over.
  if (status === 503 || /UNAVAILABLE|high demand|overloaded/i.test(message)) {
    return new ProviderError(message, "overloaded", true);
  }
  if (/abort|timeout|deadline/i.test(message)) {
    return new ProviderError(message, "timeout", true);
  }
  if (/safety|blocked|PROHIBITED/i.test(message)) {
    return new ProviderError(message, "blocked", false);
  }
  return new ProviderError(message, "upstream", true);
}

export function createGeminiProvider(
  preferred = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
): AIProvider {
  const chain = modelChain(preferred);
  // Remembered across calls in one run: once a model has answered, keep using
  // it rather than re-trying a busy one at every step.
  let model = chain[0];

  /**
   * Run `attempt` against the current model, moving on if it is unavailable or
   * simply silent. Each candidate gets a bounded slice of time so a model that
   * never answers cannot consume the run.
   */
  async function withFallback<T>(
    attempt: (m: string, signal: AbortSignal) => Promise<T>,
    outer?: AbortSignal,
  ): Promise<T> {
    const order = available([model, ...chain.filter((m) => m !== model)]);
    let last: ProviderError | undefined;
    for (const candidate of order) {
      if (outer?.aborted) break;
      const perModel = AbortSignal.timeout(PER_MODEL_TIMEOUT_MS);
      const signal = outer
        ? AbortSignal.any([outer, perModel])
        : perModel;
      try {
        const result = await withHardLimit(
          attempt(candidate, signal),
          PER_MODEL_TIMEOUT_MS,
          candidate,
        );
        model = candidate;
        timeoutStrikes.delete(candidate);
        return result;
      } catch (error) {
        // The run's own deadline is not something another model can fix.
        if (outer?.aborted) throw mapError(error);
        const mapped = mapError(error);
        const movable =
          mapped.code === "overloaded" ||
          mapped.code === "rate_limited" ||
          mapped.code === "timeout";
        if (!movable) throw mapped;
        markBusy(candidate, mapped.code);
        last = mapped;
      }
    }
    throw last ?? new ProviderError("no model available", "overloaded", true);
  }

  return {
    id: "gemini",
    get model() {
      return model;
    },
    live: true,

    async generateJson(req: GenerateJsonRequest): Promise<JsonResult> {
      return withFallback(async (candidate, signal) => {
        const ai = client();
        const response = await ai.models.generateContent({
          model: candidate,
          contents: req.prompt,
          config: {
            systemInstruction: req.system,
            temperature: req.temperature ?? 0.4,
            maxOutputTokens: req.maxOutputTokens ?? 2_200,
            responseMimeType: "application/json",
            ...(req.jsonSchema
              ? { responseJsonSchema: req.jsonSchema }
              : {}),
            abortSignal: signal,
          },
        });
        const raw = response.text ?? "";
        if (!raw.trim()) {
          throw new ProviderError(
            "モデルが空の応答を返しました。",
            "invalid_output",
            true,
          );
        }
        const reported =
          response.usageMetadata?.candidatesTokenCount ??
          estimateTokens(raw);
        return { raw, usage: { outputTokens: reported } };
      }, req.signal);
    },

    async *streamText(req: GenerateTextRequest): AsyncIterable<string> {
      const stream = await withFallback(async (candidate, signal) => {
        const ai = client();
        return ai.models.generateContentStream({
          model: candidate,
          contents: req.prompt,
          config: {
            systemInstruction: req.system,
            temperature: req.temperature ?? 0.85,
            maxOutputTokens: req.maxOutputTokens ?? 1_200,
            abortSignal: signal,
          },
        });
      }, req.signal);
      // Getting the stream is bounded by withFallback; reading it was not.
      // A response body that trickles ignores its abort signal just as a
      // hanging request does, and a live run spent nine minutes here. Each
      // chunk gets an idle ceiling, and the whole body a total one.
      const iterator = (stream as AsyncIterable<{ text?: string }>)[
        Symbol.asyncIterator
      ]();
      const openedAt = Date.now();
      try {
        for (;;) {
          const remaining = STREAM_TOTAL_LIMIT_MS - (Date.now() - openedAt);
          if (remaining <= 0) {
            throw new ProviderError(
              `stream ran past ${STREAM_TOTAL_LIMIT_MS}ms`,
              "timeout",
              true,
            );
          }
          const next = await withHardLimit(
            Promise.resolve(iterator.next()),
            Math.min(STREAM_IDLE_LIMIT_MS, remaining),
            `${model} stream`,
          );
          if (next.done) break;
          const text = next.value?.text;
          if (text) yield text;
        }
      } catch (error) {
        throw error instanceof ProviderError ? error : mapError(error);
      } finally {
        // Tell the stream to wind down; it may already be gone.
        try {
          await iterator.return?.();
        } catch {
          /* nothing left to close */
        }
      }
    },
  };
}

/** Test seam, and a way for an operator to clear the cooldown deliberately. */
export function clearBusyModels(): void {
  busyUntil.clear();
  timeoutStrikes.clear();
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
