import { describe, expect, it } from "vitest";
import { runDeliberation } from "@/lib/agents/orchestrator";
import { requestSchema } from "@/lib/agents/schemas";
import { counterSchema } from "@/lib/agents/schemas";
import type { StreamEvent } from "@/lib/types";

/**
 * The adversary turning on this system's own staging is the project's most
 * distinctive claim. It was an instruction in a prompt, and a live run showed
 * the model quietly not following it — which left the claim depending on the
 * model's mood. These tests hold it to the data model instead.
 */
async function counterOf(question: string, topicKey?: string) {
  const input = requestSchema.parse({ question, lang: "ja", topicKey });
  const events: StreamEvent[] = [];
  for await (const e of runDeliberation(input, {
    forceScripted: true,
    instant: true,
  })) {
    events.push(e);
  }
  const counter = events.find(
    (e) => e.type === "statement" && e.data.agent === "COUNTER",
  );
  if (counter?.type !== "statement") throw new Error("no COUNTER statement");
  return counter.data;
}

describe("the objection to ourselves", () => {
  it("is present on the curated deliberation", async () => {
    const c = await counterOf(
      "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
      "forest",
    );
    expect(c.selfCritique?.text).toBeTruthy();
    expect(c.selfCritique!.text).toMatch(/このシステム|演出|非対称/);
  });

  it("is present on a question with no written script", async () => {
    const c = await counterOf("宇宙エレベーターを建設するべきか？");
    expect(c.selfCritique?.text).toBeTruthy();
  });

  it("is not duplicated inside the ordinary claims", async () => {
    const c = await counterOf(
      "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
      "forest",
    );
    const inClaims = c.claims.filter((x) =>
      x.text.includes("このシステム自体への反証"),
    );
    expect(inClaims).toHaveLength(0);
  });

  it("carries an English rendering like any other claim", async () => {
    const c = await counterOf(
      "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
      "forest",
    );
    expect(c.selfCritique?.textEn).toBeTruthy();
    expect(/[぀-ヿ一-鿿]/.test(c.selfCritique!.textEn!)).toBe(
      false,
    );
  });

  it("a model response without it does not validate", () => {
    const withoutField = {
      titleJa: "反証",
      titleEn: "Objections",
      claims: [
        { kind: "inference", text: "異議", sourceIds: [] },
        { kind: "inference", text: "異議2", sourceIds: [] },
        { kind: "inference", text: "異議3", sourceIds: [] },
      ],
    };
    expect(counterSchema.safeParse(withoutField).success).toBe(false);
    expect(
      counterSchema.safeParse({
        ...withoutField,
        selfCritique: { kind: "inference", text: "自己への反証", sourceIds: [] },
      }).success,
    ).toBe(true);
  });
});
