import { NextResponse } from "next/server";
import { requestSchema } from "@/lib/agents/schemas";
import { runDeliberation } from "@/lib/agents/orchestrator";
import { validateQuestionShape } from "@/lib/security/sanitize";
import { clientKey, consume } from "@/lib/security/ratelimit";
import { BUDGET } from "@/lib/security/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const encoder = new TextEncoder();

function sse(data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です。", code: "bad_json" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "入力を検証できませんでした。",
        code: "invalid_input",
        issues: parsed.error.issues.slice(0, 5).map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const shapeError = validateQuestionShape(parsed.data.question);
  if (shapeError) {
    return NextResponse.json(
      {
        error: shapeError.messageJa,
        errorEn: shapeError.messageEn,
        code: shapeError.code,
      },
      { status: 400 },
    );
  }

  const limit = consume(clientKey(request.headers, "deliberate"));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `リクエストが集中しています。${limit.retryAfterSeconds}秒後に再試行してください。`,
        errorEn: `Too many requests. Retry in ${limit.retryAfterSeconds}s.`,
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BUDGET.maxRunMs);
  request.signal.addEventListener("abort", () => controller.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      try {
        for await (const event of runDeliberation(parsed.data, {
          signal: controller.signal,
        })) {
          streamController.enqueue(sse(event));
        }
      } catch (error) {
        streamController.enqueue(
          sse({
            type: "error",
            code: "internal",
            messageJa: "サーバー内部でエラーが発生しました。",
            messageEn: "An internal server error occurred.",
            detail:
              process.env.NODE_ENV === "development"
                ? String(error)
                : undefined,
          }),
        );
      } finally {
        clearTimeout(timeout);
        streamController.close();
      }
    },
    cancel() {
      clearTimeout(timeout);
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      "x-ratelimit-remaining": String(limit.remaining),
    },
  });
}
