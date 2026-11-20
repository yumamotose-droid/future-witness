import { describe, expect, it } from "vitest";
import {
  citationExists,
  renderCorpusForPrompt,
  retrieveSources,
} from "@/lib/evidence/retrieve";
import { ALL_FINDING_IDS } from "@/lib/evidence/corpus";

describe("retrieval", () => {
  it("finds the forest sources for a forest question", () => {
    const hits = retrieveSources(
      "経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
    );
    const ids = hits.map((h) => h.source.id);
    expect(ids).toContain("jp-forest-white-paper");
    expect(ids).toContain("jp-ghg-inventory-lulucf");
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it("works in English too", () => {
    const ids = retrieveSources(
      "Should we clear forest for a commercial complex?",
    ).map((h) => h.source.id);
    expect(ids.some((id) => id.includes("forest"))).toBe(true);
  });

  it("never returns an empty corpus, even for an unrelated question", () => {
    const hits = retrieveSources("宇宙エレベーターを建設するべきか？");
    expect(hits.length).toBeGreaterThanOrEqual(4);
  });

  it("renders every finding with a citable id the model can copy", () => {
    const text = renderCorpusForPrompt(retrieveSources("森林"));
    for (const hit of retrieveSources("森林")) {
      for (const finding of hit.source.findings) {
        expect(text).toContain(`[${hit.source.id}#${finding.id}]`);
      }
    }
    expect(text).toContain("limitation:");
  });

  it("reports whether a citation exists", () => {
    expect(citationExists(ALL_FINDING_IDS[0])).toBe(true);
    expect(citationExists("invented#id")).toBe(false);
  });
});
