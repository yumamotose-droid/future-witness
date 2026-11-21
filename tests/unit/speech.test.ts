import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPEAK_LIMIT, clientKey, consume, resetRateLimiter } from "@/lib/security/ratelimit";
import {
  MAX_SPEAKABLE_CHARS,
  SpeechError,
  resetSpeechBudget,
  speechSecondsSpent,
  synthesize,
} from "@/lib/voice/tts";
import { CASTING } from "@/lib/voice/casting";

/** A RIFF WAV header plus `seconds` of 24 kHz 16-bit mono silence. */
function wavOf(seconds: number): string {
  const samples = Math.round(seconds * 24_000);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.write("WAVE", 8);
  return buffer.toString("base64");
}

function audioResponse(seconds: number) {
  return {
    ok: true,
    json: async () => ({
      steps: [{ type: "model_output", content: [{ type: "audio", data: wavOf(seconds) }] }],
    }),
  } as unknown as Response;
}

describe("clientKey", () => {
  it("ignores a forwarded-for entry the caller wrote themselves", () => {
    // The leftmost entry is client input. Keying on it would hand a fresh
    // bucket to anyone willing to type a new value, which on a billed route
    // is a way to spend someone else's money.
    const forged = new Headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.9" });
    const alsoForged = new Headers({ "x-forwarded-for": "2.2.2.2, 203.0.113.9" });
    expect(clientKey(forged, "speak")).toBe(clientKey(alsoForged, "speak"));
    expect(clientKey(forged, "speak")).toContain("203.0.113.9");
  });

  it("prefers the header the platform writes over the one anyone can send", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "198.51.100.7",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(clientKey(headers, "speak")).toBe("speak:198.51.100.7");
  });

  it("keeps separate buckets per route", () => {
    const headers = new Headers({ "x-vercel-forwarded-for": "198.51.100.7" });
    expect(clientKey(headers, "speak")).not.toBe(clientKey(headers, "deliberate"));
  });

  it("falls back to one shared bucket rather than to no limit", () => {
    expect(clientKey(new Headers(), "speak")).toBe("speak:unknown");
  });
});

describe("rate limiter eviction", () => {
  beforeEach(() => resetRateLimiter());

  it("does not refill an existing bucket when other keys are evicted", () => {
    const mine = "speak:198.51.100.7";
    for (let i = 0; i < SPEAK_LIMIT.capacity; i++) {
      expect(consume(mine, 1, SPEAK_LIMIT, 1_000).ok).toBe(true);
    }
    expect(consume(mine, 1, SPEAK_LIMIT, 1_000).ok).toBe(false);

    // Flood the map with junk keys. If eviction cleared everything, the next
    // call on the exhausted key would succeed.
    for (let i = 0; i < 6_000; i++) {
      consume(`speak:junk-${i}`, 1, SPEAK_LIMIT, 1_000);
    }
    expect(consume(mine, 1, SPEAK_LIMIT, 1_000).ok).toBe(false);
  });
});

describe("synthesize", () => {
  beforeEach(() => {
    resetSpeechBudget();
    process.env.GEMINI_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it("refuses a passage longer than one press of a button should produce", async () => {
    await expect(
      synthesize({ text: "あ".repeat(MAX_SPEAKABLE_CHARS + 1), agent: "MIRAI" }),
    ).rejects.toMatchObject({ code: "too_long" });
  });

  it("sends the line verbatim and the direction beside it, never inside it", async () => {
    // Putting the direction in the text made every voice read it aloud.
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => audioResponse(2));
    vi.stubGlobal("fetch", fetchMock);

    await synthesize({ text: "ここだけを読む。", agent: "MIRAI" });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    const content = body.input[0].content[0];
    expect(content.text).toBe("ここだけを読む。");
    expect(content.annotations[0]).toMatchObject({
      type: "speech_metadata",
      style: CASTING.MIRAI.styleJa,
    });
    expect(body.generation_config.speech_config[0].voice).toBe(CASTING.MIRAI.voice);
  });

  it("serves a replay from the cache instead of billing for it again", async () => {
    const fetchMock = vi.fn(async () => audioResponse(2));
    vi.stubGlobal("fetch", fetchMock);

    const first = await synthesize({ text: "もう一度。", agent: "MIRAI" });
    const second = await synthesize({ text: "もう一度。", agent: "MIRAI" });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("counts a call against the budget before it is made, not after", async () => {
    // Twenty requests launched together must not all pass a check that only
    // rises once a response comes back.
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await gate;
        return audioResponse(2);
      }),
    );

    const attempts = Array.from({ length: 20 }, (_, i) =>
      synthesize({ text: `文章${i}。`, agent: "MIRAI" }).catch((e: unknown) => e),
    );
    release?.();
    const results = await Promise.all(attempts);

    const refused = results.filter(
      (r) => r instanceof SpeechError && r.code === "budget",
    );
    expect(refused.length).toBeGreaterThan(0);
    expect(speechSecondsSpent()).toBeGreaterThan(0);
  });

  it("keeps charging for a call that may already have been billed", async () => {
    // The request reached the service; whether it generated audio before
    // failing is not knowable from here. Refunding in full would let a
    // failing upstream be used to spend past the ceiling.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, text: async () => "503 unavailable" }) as unknown as Response),
    );
    await expect(synthesize({ text: "失敗する。", agent: "MIRAI" })).rejects.toBeInstanceOf(
      SpeechError,
    );
    expect(speechSecondsSpent()).toBeGreaterThan(0);
  });

  it("refunds only when the service refused before generating", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400, text: async () => "400 bad request" }) as unknown as Response),
    );
    await expect(synthesize({ text: "拒否される。", agent: "MIRAI" })).rejects.toBeInstanceOf(
      SpeechError,
    );
    expect(speechSecondsSpent()).toBe(0);
  });
});
