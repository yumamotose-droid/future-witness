import { describe, expect, it } from "vitest";
import { runDeliberation } from "@/lib/agents/orchestrator";
import { requestSchema } from "@/lib/agents/schemas";
import { CORPUS } from "@/lib/evidence/corpus";
import { UI } from "@/lib/i18n/dictionary";
import type { StreamEvent } from "@/lib/types";

/**
 * The language toggle has to switch the substance, not just the chrome.
 * An English reader seeing the structure in English and every claim in
 * Japanese gets the shape of the argument and none of it, which is worse than
 * not offering the toggle at all.
 */
async function run(question: string, topicKey?: string) {
  const input = requestSchema.parse({ question, lang: "en", topicKey });
  const events: StreamEvent[] = [];
  for await (const event of runDeliberation(input, {
    forceScripted: true,
    instant: true,
  })) {
    events.push(event);
  }
  return events;
}

function claimsOf(events: StreamEvent[]) {
  const claims = [];
  for (const event of events) {
    if (event.type === "statement") claims.push(...event.data.claims);
    if (event.type === "framing") claims.push(...event.data.assumptions);
  }
  return claims;
}

describe("the two languages", () => {
  it("gives every curated claim an English rendering", async () => {
    const claims = claimsOf(
      await run(
        "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
        "forest",
      ),
    );
    expect(claims.length).toBeGreaterThan(15);
    const missing = claims.filter((c) => !c.textEn?.trim());
    expect(
      missing.map((c) => c.text.slice(0, 30)),
      "claims with no English",
    ).toEqual([]);
  });

  it("gives every derived claim an English rendering", async () => {
    const claims = claimsOf(await run("宇宙エレベーターを建設するべきか？"));
    expect(claims.length).toBeGreaterThan(8);
    const missing = claims.filter((c) => !c.textEn?.trim());
    expect(missing.map((c) => c.text.slice(0, 30))).toEqual([]);
  });

  it("never leaves the English text identical to the Japanese", async () => {
    const claims = claimsOf(
      await run(
        "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
        "forest",
      ),
    );
    for (const claim of claims) {
      expect(claim.textEn).not.toBe(claim.text);
      // A Japanese character in the English field means a missed translation.
      expect(
        /[぀-ヿ一-鿿]/.test(claim.textEn ?? ""),
        `untranslated: ${claim.text.slice(0, 24)}`,
      ).toBe(false);
    }
  });

  it("gives the 2050 testimony in English too", async () => {
    const events = await run(
      "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
      "forest",
    );
    const bodies = new Map<string, string>();
    for (const event of events) {
      if (event.type === "voice-delta") {
        bodies.set(
          event.scenarioId,
          (bodies.get(event.scenarioId) ?? "") + event.text,
        );
      }
    }
    expect(bodies.size).toBeGreaterThan(0);
    for (const [id, body] of bodies) {
      expect(
        /[぀-ヿ一-鿿]/.test(body),
        `testimony ${id} is still Japanese`,
      ).toBe(false);
      expect(body.length).toBeGreaterThan(80);
    }
  });

  it("gives every scenario and option both languages", async () => {
    const events = await run(
      "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
      "forest",
    );
    for (const event of events) {
      if (event.type === "options") {
        for (const option of event.data) {
          expect(option.labelEn.length).toBeGreaterThan(0);
          expect(option.summaryEn.length).toBeGreaterThan(0);
          expect(option.labelEn).not.toBe(option.labelJa);
        }
      }
      if (event.type === "scenarios") {
        for (const scenario of event.data) {
          expect(scenario.nameEn.length).toBeGreaterThan(0);
          for (const stratum of scenario.strata) {
            expect(stratum.headlineEn.length).toBeGreaterThan(0);
            expect(stratum.detailEn.length).toBeGreaterThan(0);
          }
          for (const indicator of scenario.indicators) {
            expect(indicator.labelEn.length).toBeGreaterThan(0);
            expect(indicator.noteEn.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("gives every corpus record and UI string both languages", () => {
    for (const source of CORPUS) {
      expect(source.titleEn.length, source.id).toBeGreaterThan(0);
      expect(source.scopeEn.length, source.id).toBeGreaterThan(0);
      for (const finding of source.findings) {
        expect(finding.en.length).toBeGreaterThan(10);
        expect(finding.caveatEn.length).toBeGreaterThan(5);
      }
    }
    expect(Object.keys(UI.ja).sort()).toEqual(Object.keys(UI.en).sort());
  });
});
