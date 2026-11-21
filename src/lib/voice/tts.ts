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

let audioSecondsSpent = 0;

export function speechSecondsSpent(): number {
  return audioSecondsSpent;
}

/** Test seam. */
export function resetSpeechBudget(): void {
  audioSecondsSpent = 0;
  cache.clear();
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

  if (audioSecondsSpent >= MAX_AUDIO_SECONDS_PER_PROCESS) {
    throw new SpeechError("この処理系の音声生成の上限に達しました", "budget");
  }

  let lastError: SpeechError | undefined;
  for (const model of [TTS_MODEL, TTS_FALLBACK_MODEL]) {
    try {
      const wav = await callModel(model, text, casting.voice, casting.styleJa, req.signal);
      const seconds = secondsOf(wav);
      audioSecondsSpent += seconds;
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
      if (!mapped.retryable) throw mapped;
      lastError = mapped;
    }
  }
  throw lastError ?? new SpeechError("no TTS model answered", "upstream", true);
}

export function speechConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
