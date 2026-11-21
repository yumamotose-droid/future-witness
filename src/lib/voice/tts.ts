import type { AgentId } from "@/lib/types";
import { castingFor } from "./casting";

/**
 * Speech synthesis.
 *
 * The key is read from the server environment and never leaves this module;
 * the browser reaches it only through `/api/speak`. Nothing here is imported
 * by a client component.
 *
 * The text sent here is read verbatim — it is a transcript, not a prompt. That
 * is why delivery is carried by a `speech_metadata` annotation beside the text
 * rather than by an instruction inside it: an earlier attempt put the
 * direction in the prompt and all four voices read the direction aloud, which
 * `scripts/check-voices.mts` caught by transcribing the audio back. Because
 * the field is a transcript, a reader's words cannot redirect the model; they
 * can only be spoken.
 */

export const TTS_MODEL = "gemini-3.8-flash-tts";
/** Same schema, lower fidelity, two thirds the price. Used when the first is busy. */
export const TTS_FALLBACK_MODEL = "gemini-3.8-flash-lite-tts";

/**
 * Audio is billed by the second (25 tokens per second), so the limit that
 * matters is how much speech one press of a button can produce. Roughly 20
 * seconds of Japanese, which is longer than any single passage the UI offers.
 */
export const MAX_SPEAKABLE_CHARS = 420;

/**
 * A ceiling for the whole server process.
 *
 * The free tier has no published rate limit, which is a reason to impose one
 * rather than to assume none applies. At 25 tokens per second this is about
 * three hours of generated speech before the process refuses to make more —
 * generous for a demo, and bounded if something loops.
 */
export const MAX_AUDIO_SECONDS_PER_PROCESS = 10_000;

const SAMPLE_RATE = 24_000;
const BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;

export class SpeechError extends Error {
  constructor(
    message: string,
    readonly code:
      | "no_key"
      | "too_long"
      | "empty"
      | "budget"
      | "rejected_before_generating"
      | "upstream"
      | "timeout"
      | "blocked",
    readonly retryable = false,
  ) {
    super(message);
    this.name = "SpeechError";
  }
}

export interface SpeechResult {
  /** A complete RIFF WAV: 24 kHz, mono, 16-bit signed little-endian. */
  readonly wav: Uint8Array;
  readonly seconds: number;
  readonly voice: string;
  readonly model: string;
  /** True when this came from the cache and cost nothing. */
  readonly cached: boolean;
}

/**
 * How much speech one request could possibly produce.
 *
 * Measured Japanese runs at roughly four characters a second; three is the
 * pessimistic figure, which is the one a reservation needs. The point is that
 * the ceiling is checked against what a call *might* cost before it is made,
 * not against what the last one did.
 */
const SECONDS_PER_CHAR = 1 / 3;

/**
 * A ceiling per minute as well as per process.
 *
 * The process ceiling bounds a long-running leak; it does nothing about a
 * burst, and a burst is what an expensive endpoint has to survive. Audio
 * seconds refill at this rate no matter how many addresses the requests
 * appear to come from, so this is the cap that holds when per-client keying
 * is defeated.
 */
const SECONDS_PER_MINUTE_CAP = 300;

/**
 * At most this many syntheses in flight at once.
 *
 * Reservations make the ceilings correct under concurrency; they do not stop
 * a hundred simultaneous calls from being issued in the window before any of
 * them return. This does.
 */
const MAX_CONCURRENT = 4;

let audioSecondsSpent = 0;
let inFlight = 0;
const minuteBucket = { seconds: SECONDS_PER_MINUTE_CAP, updatedAt: Date.now() };

export function speechSecondsSpent(): number {
  return audioSecondsSpent;
}

/** Test seam. */
export function resetSpeechBudget(): void {
  audioSecondsSpent = 0;
  inFlight = 0;
  minuteBucket.seconds = SECONDS_PER_MINUTE_CAP;
  minuteBucket.updatedAt = Date.now();
  cache.clear();
}

/**
 * Take the worst case out of every budget before calling the model.
 *
 * Checking a counter that is only incremented after the call returns lets any
 * number of requests pass the check together and bill in parallel. Reserving
 * first and reconciling afterwards means the ceilings hold whatever the
 * concurrency, at the cost of briefly over-counting a call that turns out
 * shorter than feared.
 */
function reserve(estimate: number, now = Date.now()): void {
  if (inFlight >= MAX_CONCURRENT) {
    throw new SpeechError("音声の生成が混み合っています", "budget", true);
  }
  const refill = ((now - minuteBucket.updatedAt) / 60_000) * SECONDS_PER_MINUTE_CAP;
  minuteBucket.seconds = Math.min(SECONDS_PER_MINUTE_CAP, minuteBucket.seconds + refill);
  minuteBucket.updatedAt = now;

  if (audioSecondsSpent + estimate > MAX_AUDIO_SECONDS_PER_PROCESS) {
    throw new SpeechError("この処理系の音声生成の上限に達しました", "budget");
  }
  if (minuteBucket.seconds < estimate) {
    throw new SpeechError("音声の生成が集中しています", "budget", true);
  }
  minuteBucket.seconds -= estimate;
  audioSecondsSpent += estimate;
  inFlight += 1;
}

/**
 * Replace the reservation with what the call actually cost.
 *
 * A call that produced audio is reconciled against its real duration. A call
 * that failed after the request was sent keeps its reservation: the service
 * may have generated and billed before failing, and refunding in full would
 * turn a flaky upstream into a way to spend past the ceiling. Only a refusal
 * that happened before generation — a 4xx that is not a quota error — is
 * given back.
 *
 * The per-minute figure is allowed to go negative so an overrun is carried
 * as debt into the next minute instead of being forgiven.
 */
function settle(estimate: number, actual: number, refund: boolean): void {
  const charged = actual > 0 ? actual : refund ? 0 : estimate;
  const difference = charged - estimate;
  audioSecondsSpent = Math.max(0, audioSecondsSpent + difference);
  minuteBucket.seconds = Math.min(SECONDS_PER_MINUTE_CAP, minuteBucket.seconds - difference);
  inFlight = Math.max(0, inFlight - 1);
}

/**
 * Identical text in the same voice is identical audio.
 *
 * "Play it again" is one of the controls the brief asks for, and re-billing
 * for a replay would be both wasteful and slower than the audio the reader
 * already heard. Bounded because a long session must not grow without limit.
 */
const CACHE_LIMIT = 64;
const cache = new Map<string, SpeechResult>();

function cacheKey(text: string, voice: string): string {
  return `${voice}\u0000${text}`;
}

function remember(key: string, result: SpeechResult): void {
  cache.set(key, result);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new SpeechError("GEMINI_API_KEY is not set", "no_key");
  return key;
}

function secondsOf(wav: Uint8Array): number {
  const samples = Math.max(0, wav.byteLength - WAV_HEADER_BYTES) / BYTES_PER_SAMPLE;
  return samples / SAMPLE_RATE;
}

function mapError(error: unknown): SpeechError {
  if (error instanceof SpeechError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return new SpeechError(message, "upstream", true);
  }
  // Refused before generation, so nothing was billed: a malformed request,
  // a bad key, no permission, no such model. Deliberately not every 4xx —
  // 408 and 409 can follow work the service has already done.
  if (/^4(00|01|03|04)\b/.test(message)) {
    return new SpeechError(message, "rejected_before_generating", false);
  }
  if (/503|UNAVAILABLE|overloaded/i.test(message)) {
    return new SpeechError(message, "upstream", true);
  }
  if (/abort|timeout|deadline/i.test(message)) {
    return new SpeechError(message, "timeout", true);
  }
  if (/safety|blocked|PROHIBITED/i.test(message)) {
    return new SpeechError(message, "blocked", false);
  }
  return new SpeechError(message, "upstream", true);
}

/**
 * Called over REST rather than through the SDK.
 *
 * @google/genai 3.6.1 nests `speechConfig` under a snake_case parent and the
 * API rejects the result outright ("Unknown name speechConfig"), so TTS would
 * otherwise wait on an SDK release. This is the Interactions shape the service
 * documents, which is also the only one with a field for delivery.
 */
async function callModel(
  model: string,
  text: string,
  voice: string,
  styleJa: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(`${ENDPOINT}/interactions`, {
    method: "POST",
    signal,
    headers: {
      "x-goog-api-key": apiKey(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text,
              annotations: [{ type: "speech_metadata", style: styleJa }],
            },
          ],
        },
      ],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice }] },
    }),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${(await response.text()).slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    steps?: { type?: string; content?: { type?: string; data?: string }[] }[];
  };
  const data = payload.steps
    ?.find((step) => step.type === "model_output")
    ?.content?.find((item) => item.type === "audio")?.data;
  if (!data) {
    throw new SpeechError("the model returned no audio", "upstream", true);
  }
  return Uint8Array.from(Buffer.from(data, "base64"));
}

export interface SpeakRequest {
  readonly text: string;
  readonly agent: AgentId;
  readonly signal?: AbortSignal;
}

export async function synthesize(req: SpeakRequest): Promise<SpeechResult> {
  const text = req.text.trim();
  if (!text) throw new SpeechError("nothing to say", "empty");
  if (text.length > MAX_SPEAKABLE_CHARS) {
    throw new SpeechError(
      `${MAX_SPEAKABLE_CHARS}文字までです（${text.length}文字）`,
      "too_long",
    );
  }

  const casting = castingFor(req.agent);
  const key = cacheKey(text, casting.voice);
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency: a passage the reader keeps replaying should be the last
    // thing evicted.
    cache.delete(key);
    cache.set(key, hit);
    return { ...hit, cached: true };
  }

  const estimate = text.length * SECONDS_PER_CHAR;
  reserve(estimate);
  let produced = 0;
  // Sticky in the strict direction: one attempt that may have been billed
  // forfeits the refund, however the next attempt fails. Overwriting this per
  // attempt meant a 503 followed by a 400 looked like a clean refusal.
  let refundable = true;
  try {
    let lastError: SpeechError | undefined;
    for (const model of [TTS_MODEL, TTS_FALLBACK_MODEL]) {
      try {
        const wav = await callModel(model, text, casting.voice, casting.styleJa, req.signal);
        const seconds = secondsOf(wav);
        produced = seconds;
        const result: SpeechResult = {
          wav,
          seconds,
          voice: casting.voice,
          model,
          cached: false,
        };
        remember(key, result);
        return result;
      } catch (error) {
        const mapped = mapError(error);
        refundable = refundable && mapped.code === "rejected_before_generating";
        if (!mapped.retryable) throw mapped;
        lastError = mapped;
      }
    }
    throw lastError ?? new SpeechError("no TTS model answered", "upstream", true);
  } finally {
    settle(estimate, produced, refundable);
  }
}

export function speechConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
