import { NextResponse } from "next/server";
import { z } from "zod";
import type { AgentId } from "@/lib/types";
import { SPEAK_LIMIT, clientKey, consume } from "@/lib/security/ratelimit";
import { sanitizeModelText } from "@/lib/security/sanitize";
import {
  MAX_SPEAKABLE_CHARS,
  SpeechError,
  speechConfigured,
  synthesize,
} from "@/lib/voice/tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Kept in step with `AgentId`; a new agent fails the type check here first. */
const AGENTS = ["CHRONOS", "EVIDENCE", "MIRAI", "COUNTER"] as const satisfies readonly AgentId[];

const speakSchema = z.object({
  text: z.string().min(1).max(MAX_SPEAKABLE_CHARS),
  agent: z.enum(AGENTS),
});

/**
 * Turn a passage into speech.
 *
 * The browser sends text it is already showing and gets back a WAV. It never
 * sees the key, and the model is only ever asked to read what the reader can
 * also read on screen — the audio and the transcript are the same words, which
 * is the whole point of pairing them.
 */
export async function POST(request: Request) {
  if (!speechConfigured()) {
    return NextResponse.json(
      {
        error: "この環境では音声を生成できません。文字でお読みください。",
        errorEn: "Speech is unavailable in this environment. The text is complete on its own.",
        code: "no_key",
      },
      { status: 503 },
    );
  }

  const limit = consume(clientKey(request.headers, "speak"), 1, SPEAK_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "音声の生成が集中しています。少し待ってからもう一度お試しください。",
        errorEn: "Too many speech requests. Please wait a moment.",
        code: "rate_limited",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です。", code: "bad_json" },
      { status: 400 },
    );
  }

  const parsed = speakSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "読み上げる文章を検証できませんでした。", code: "invalid_input" },
      { status: 400 },
    );
  }

  // The same scrubbing the deliberation output gets. Invisible characters
  // would be inaudible by definition, but they are also how a passage hides
  // instructions, and this text reaches a model.
  const text = sanitizeModelText(parsed.data.text);
  if (!text) {
    return NextResponse.json(
      { error: "読み上げる内容がありません。", code: "empty" },
      { status: 400 },
    );
  }

  try {
    const result = await synthesize({ text, agent: parsed.data.agent, signal: request.signal });
    return new NextResponse(new Uint8Array(result.wav), {
      status: 200,
      headers: {
        "content-type": "audio/wav",
        "content-length": String(result.wav.byteLength),
        // The audio is derived from text the client already has; letting the
        // browser keep it makes replay instant and costs nothing.
        "cache-control": "private, max-age=3600",
        "x-voice": result.voice,
        "x-voice-model": result.model,
        "x-voice-seconds": result.seconds.toFixed(2),
        "x-voice-cached": String(result.cached),
      },
    });
  } catch (error) {
    if (error instanceof SpeechError) {
      const status =
        error.code === "too_long" || error.code === "empty"
          ? 400
          : error.code === "budget"
            ? 429
            : 502;
      return NextResponse.json(
        {
          error: "音声を生成できませんでした。文字でお読みいただけます。",
          errorEn: "Speech could not be generated. The text is complete on its own.",
          code: error.code,
        },
        { status },
      );
    }
    return NextResponse.json(
      { error: "音声を生成できませんでした。", code: "upstream" },
      { status: 502 },
    );
  }
}
