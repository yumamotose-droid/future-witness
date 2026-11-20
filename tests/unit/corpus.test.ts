import { describe, expect, it } from "vitest";
import { ALL_FINDING_IDS, CORPUS, resolveFinding } from "@/lib/evidence/corpus";

/**
 * The corpus is the system's trust anchor, so its shape is tested rather than
 * assumed. A malformed record here would silently weaken every citation.
 */
describe("evidence corpus", () => {
  it("is not empty", () => {
    expect(CORPUS.length).toBeGreaterThan(5);
    expect(ALL_FINDING_IDS.length).toBeGreaterThan(10);
  });

  it("has unique source ids", () => {
    const ids = CORPUS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique, resolvable finding ids", () => {
    expect(new Set(ALL_FINDING_IDS).size).toBe(ALL_FINDING_IDS.length);
    for (const id of ALL_FINDING_IDS) {
      expect(resolveFinding(id)).toBeDefined();
    }
  });

  it("gives every source the full provenance the spec requires", () => {
    for (const source of CORPUS) {
      expect(source.titleJa.length, source.id).toBeGreaterThan(0);
      expect(source.titleEn.length, source.id).toBeGreaterThan(0);
      expect(source.org.length, source.id).toBeGreaterThan(0);
      expect(source.year, source.id).toBeGreaterThan(1990);
      expect(source.year, source.id).toBeLessThanOrEqual(
        new Date().getFullYear() + 1,
      );
      expect(source.locator.length, source.id).toBeGreaterThan(0);
      expect(source.region.length, source.id).toBeGreaterThan(0);
      expect(source.scopeJa.length, source.id).toBeGreaterThan(0);
      expect(source.scopeEn.length, source.id).toBeGreaterThan(0);
      expect(source.checkedOn, source.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.url, source.id).toMatch(/^https:\/\//);
      expect(source.findings.length, source.id).toBeGreaterThan(0);
      expect(source.topics.length, source.id).toBeGreaterThan(0);
    }
  });

  it("gives every finding both languages and a stated limitation", () => {
    for (const source of CORPUS) {
      for (const finding of source.findings) {
        const key = `${source.id}#${finding.id}`;
        expect(finding.ja.length, key).toBeGreaterThan(10);
        expect(finding.en.length, key).toBeGreaterThan(10);
        expect(finding.caveatJa.length, key).toBeGreaterThan(5);
        expect(finding.caveatEn.length, key).toBeGreaterThan(5);
      }
    }
  });

  it("returns undefined for an id that is not in the corpus", () => {
    expect(resolveFinding("nope#nope")).toBeUndefined();
    expect(resolveFinding("")).toBeUndefined();
  });
});
