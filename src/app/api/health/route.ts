import { NextResponse } from "next/server";
import { geminiConfigured, DEFAULT_GEMINI_MODEL } from "@/lib/ai/gemini";
import { CORPUS, ALL_FINDING_IDS } from "@/lib/evidence/corpus";
import { BUDGET, processTokensSpent } from "@/lib/security/budget";
import { DELIBERATE_LIMIT } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational truth, deliberately including the uncomfortable parts: whether a
 * key is present at all, and therefore whether anything the app shows is live.
 * No secret values are returned — only whether a key exists.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: geminiConfigured() ? "live" : "scripted",
    geminiConfigured: geminiConfigured(),
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    corpus: {
      sources: CORPUS.length,
      citableFindings: ALL_FINDING_IDS.length,
      lastCheckedOn: CORPUS.map((c) => c.checkedOn).sort().at(-1),
    },
    budget: {
      maxOutputTokensPerRun: BUDGET.maxOutputTokensPerRun,
      maxRunMs: BUDGET.maxRunMs,
      processTokensSpent: processTokensSpent(),
    },
    rateLimit: {
      deliberationsPerBurst: DELIBERATE_LIMIT.capacity,
      refillSeconds: Math.round(1 / DELIBERATE_LIMIT.refillPerMs / 1000),
      overridden: Boolean(process.env.RATE_LIMIT_CAPACITY),
    },
  });
}
