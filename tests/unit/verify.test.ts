import { describe, expect, it } from "vitest";
import {
  emptyAudit,
  mergeAudits,
  scenarioDivergence,
  verifyStatements,
} from "@/lib/evidence/verify";
import { ALL_FINDING_IDS } from "@/lib/evidence/corpus";
import type { Scenario, Statement } from "@/lib/types";

const REAL = ALL_FINDING_IDS[0];

function statement(claims: Statement["claims"]): Statement {
  return {
    id: "test-1",
    agent: "EVIDENCE",
    titleJa: "t",
    titleEn: "t",
    claims,
  };
}

describe("citation verification", () => {
  it("keeps a verified claim whose citation exists in the corpus", () => {
    const { statements, audit } = verifyStatements(
      [statement([{ kind: "verified", text: "a", sourceIds: [REAL] }])],
      [],
    );
    expect(statements[0].claims[0].kind).toBe("verified");
    expect(statements[0].claims[0].sourceIds).toEqual([REAL]);
    expect(audit.citationsRejected).toBe(0);
  });

  it("removes a fabricated citation and downgrades the claim", () => {
    const { statements, audit } = verifyStatements(
      [
        statement([
          {
            kind: "verified",
            text: "森林は年間999兆円の価値がある",
            sourceIds: ["not-a-real-source#invented-finding"],
          },
        ]),
      ],
      [],
    );
    const claim = statements[0].claims[0];
    expect(claim.kind).toBe("inference");
    expect(claim.downgradedFrom).toBe("verified");
    expect(claim.sourceIds).toEqual([]);
    expect(audit.citationsRejected).toBe(1);
    expect(audit.rejectedIds).toEqual(["not-a-real-source#invented-finding"]);
    expect(audit.downgrades).toHaveLength(1);
  });

  it("keeps only the real citations when a claim mixes real and invented", () => {
    const { statements, audit } = verifyStatements(
      [
        statement([
          {
            kind: "verified",
            text: "mixed",
            sourceIds: [REAL, "ghost#id"],
          },
        ]),
      ],
      [],
    );
    expect(statements[0].claims[0].kind).toBe("verified");
    expect(statements[0].claims[0].sourceIds).toEqual([REAL]);
    expect(audit.citationsRejected).toBe(1);
    expect(audit.citationsChecked).toBe(2);
  });

  it("downgrades a verified claim that cites nothing at all", () => {
    const { statements } = verifyStatements(
      [statement([{ kind: "verified", text: "bare", sourceIds: [] }])],
      [],
    );
    expect(statements[0].claims[0].kind).toBe("inference");
    expect(statements[0].claims[0].downgradedFrom).toBe("verified");
  });

  it("strips citations from an unknown claim so ignorance cannot be dressed up", () => {
    const { statements } = verifyStatements(
      [statement([{ kind: "unknown", text: "we do not know", sourceIds: [REAL] }])],
      [],
    );
    expect(statements[0].claims[0].kind).toBe("unknown");
    expect(statements[0].claims[0].sourceIds).toEqual([]);
  });

  it("leaves inference and hypothetical kinds alone", () => {
    const { statements } = verifyStatements(
      [
        statement([
          { kind: "inference", text: "i", sourceIds: [] },
          { kind: "hypothetical", text: "h", sourceIds: [] },
        ]),
      ],
      [],
    );
    expect(statements[0].claims.map((c) => c.kind)).toEqual([
      "inference",
      "hypothetical",
    ]);
  });

  it("verifies indicator citations on scenarios too", () => {
    const scenarios: Scenario[] = [
      {
        id: "A",
        optionId: "A",
        nameJa: "a",
        nameEn: "a",
        premiseJa: "p",
        premiseEn: "p",
        strata: [],
        indicators: [
          {
            key: "carbon",
            labelJa: "炭素",
            labelEn: "carbon",
            direction: "down",
            noteJa: "note",
            noteEn: "note",
            sourceIds: [REAL, "fake#one"],
          },
        ],
      },
    ];
    const { audit } = verifyStatements([], scenarios);
    expect(scenarios[0].indicators[0].sourceIds).toEqual([REAL]);
    expect(audit.citationsRejected).toBe(1);
  });
});

describe("scenario divergence", () => {
  function scenario(id: string, dirs: Record<string, "up" | "down" | "mixed">) {
    return {
      id,
      optionId: id,
      nameJa: id,
      nameEn: id,
      premiseJa: "",
      premiseEn: "",
      strata: [],
      indicators: Object.entries(dirs).map(([key, direction]) => ({
        key,
        labelJa: key,
        labelEn: key,
        direction,
        noteJa: "",
        noteEn: "",
        sourceIds: [],
      })),
    } as Scenario;
  }

  it("is 0 when every scenario agrees on every indicator", () => {
    expect(
      scenarioDivergence([
        scenario("A", { carbon: "down", jobs: "up" }),
        scenario("B", { carbon: "down", jobs: "up" }),
      ]),
    ).toBe(0);
  });

  it("is 1 when they disagree on everything", () => {
    expect(
      scenarioDivergence([
        scenario("A", { carbon: "down", jobs: "up" }),
        scenario("B", { carbon: "up", jobs: "down" }),
      ]),
    ).toBe(1);
  });

  it("is a fraction when they partly agree", () => {
    expect(
      scenarioDivergence([
        scenario("A", { carbon: "down", jobs: "up" }),
        scenario("B", { carbon: "down", jobs: "down" }),
      ]),
    ).toBe(0.5);
  });

  it("is 0 with fewer than two scenarios", () => {
    expect(scenarioDivergence([])).toBe(0);
    expect(scenarioDivergence([scenario("A", { carbon: "down" })])).toBe(0);
  });
});

describe("audit merging", () => {
  it("sums counts and de-duplicates rejected ids", () => {
    const a = { ...emptyAudit(), claimsTotal: 2, rejectedIds: ["x"] };
    const b = { ...emptyAudit(), claimsTotal: 3, rejectedIds: ["x", "y"] };
    const merged = mergeAudits(a, b);
    expect(merged.claimsTotal).toBe(5);
    expect(merged.rejectedIds).toEqual(["x", "y"]);
  });
});
