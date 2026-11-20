import { describe, expect, it } from "vitest";
import { buildReportMarkdown } from "@/lib/report/markdown";
import { runDeliberation } from "@/lib/agents/orchestrator";
import { requestSchema } from "@/lib/agents/schemas";
import type {
  AuditReport,
  DeliberationResult,
  SessionRecord,
  StreamEvent,
} from "@/lib/types";

async function buildResult(): Promise<DeliberationResult> {
  const input = requestSchema.parse({
    question: "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
    lang: "ja",
    topicKey: "forest",
  });
  const events: StreamEvent[] = [];
  for await (const event of runDeliberation(input, {
    forceScripted: true,
    instant: true,
  })) {
    events.push(event);
  }
  const framing = events.find((e) => e.type === "framing");
  const options = events.find((e) => e.type === "options");
  const scenarios = events.find((e) => e.type === "scenarios");
  const audit = events.find((e) => e.type === "audit");
  if (
    framing?.type !== "framing" ||
    options?.type !== "options" ||
    scenarios?.type !== "scenarios" ||
    audit?.type !== "audit"
  ) {
    throw new Error("incomplete run");
  }
  const voices = new Map<string, { witness: unknown; body: string }>();
  for (const event of events) {
    if (event.type === "voice-start") {
      voices.set(event.scenarioId, { witness: event.witness, body: "" });
    }
    if (event.type === "voice-delta") {
      const v = voices.get(event.scenarioId);
      if (v) v.body += event.text;
    }
  }
  return {
    id: "test-session",
    lang: "ja",
    question: input.question,
    framing: framing.data,
    options: options.data,
    scenarios: scenarios.data,
    statements: events
      .filter((e) => e.type === "statement")
      .map((e) => (e.type === "statement" ? e.data : null))
      .filter(Boolean) as DeliberationResult["statements"],
    voices: [...voices.entries()].map(([scenarioId, v]) => ({
      scenarioId,
      witness: v.witness as DeliberationResult["voices"][number]["witness"],
      body: v.body,
    })),
    audit: audit.data as AuditReport,
    createdAt: "2026-11-20T00:00:00.000Z",
  };
}

describe("decision record", () => {
  it("records both positions, the movement, the sources and the unknowns", async () => {
    const result = await buildResult();
    const session: SessionRecord = {
      id: "test-session",
      question: result.question,
      lang: "ja",
      before: {
        optionId: "A",
        confidence: 70,
        reason: "雇用を重く見た",
        at: "2026-11-20T00:00:00.000Z",
      },
      after: {
        optionId: "C",
        confidence: 55,
        reason: "撤退条項の不在が決め手になった",
        at: "2026-11-20T00:10:00.000Z",
      },
      openQuestions: ["取水点との位置関係を確認していない"],
      createdAt: "2026-11-20T00:00:00.000Z",
    };

    const md = buildReportMarkdown(session, result, "ja");

    expect(md).toContain("# 意思決定レポート");
    expect(md).toContain("雇用を重く見た");
    expect(md).toContain("撤退条項の不在が決め手になった");
    expect(md).toContain("選択が変わった");
    expect(md).toContain("確信 -15");
    expect(md).toContain("取水点との位置関係を確認していない");
    // Full provenance for every cited document.
    expect(md).toContain("https://www.rinya.maff.go.jp");
    expect(md).toContain("URL確認日");
    expect(md).toContain("適用範囲");
    // The verification receipt.
    expect(md).toContain("存在せず削除した出典: 0");
    // And the standing disclaimer.
    expect(md).toContain("システムは結論を出していません");
  });

  it("says plainly when no prior position was recorded", async () => {
    const result = await buildResult();
    const md = buildReportMarkdown(
      {
        id: "x",
        question: result.question,
        lang: "ja",
        openQuestions: [],
        createdAt: "2026-11-20T00:00:00.000Z",
      },
      result,
      "ja",
    );
    expect(md).toContain("審議前の立場は記録されていません");
    expect(md).toContain("- 記録されていません。");
  });
});
