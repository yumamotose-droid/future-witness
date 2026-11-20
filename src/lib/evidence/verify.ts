import { CORPUS, FINDING_INDEX } from "./corpus";
import type {
  AuditReport,
  Claim,
  EpistemicKind,
  RunMode,
  Scenario,
  Statement,
} from "@/lib/types";

/**
 * The verification layer.
 *
 * This is the part of FUTURE WITNESS that a general-purpose chatbot cannot
 * provide, and it is intentionally mechanical:
 *
 *  1. Every citation on every claim is resolved against the curated corpus.
 *     Ids that do not resolve are REMOVED — never shown to the user, not even
 *     greyed out, because a plausible-looking dead citation is worse than none.
 *  2. A claim marked `verified` that has no surviving citation is DOWNGRADED to
 *     `inference`, and the downgrade is recorded so the user can see it happened.
 *  3. A claim marked `unknown` is forced to carry no citations, so "we don't
 *     know" can never be dressed up with a reference.
 *
 * The result is that the `verified` badge in the UI means exactly one thing:
 * at least one id on this sentence resolves to a finding a human put in the
 * corpus.
 */

export interface VerificationOutcome {
  statements: Statement[];
  audit: Omit<AuditReport, "mode" | "model" | "elapsedMs">;
}

interface Mutable {
  citationsChecked: number;
  citationsRejected: number;
  rejectedIds: string[];
  rejectedMalformed: string[];
  rejectedInvented: string[];
  downgrades: AuditReport["downgrades"];
  sourcesUsed: Set<string>;
  byKind: Record<EpistemicKind, number>;
}

function verifyClaim(
  claim: Claim,
  statementId: string,
  m: Mutable,
): Claim {
  const kept: string[] = [];
  for (const raw of claim.sourceIds ?? []) {
    const id = raw.trim();
    if (!id) continue;
    m.citationsChecked += 1;
    const resolved = FINDING_INDEX.get(id);
    if (resolved) {
      kept.push(id);
      m.sourcesUsed.add(resolved.source.id);
    } else {
      m.citationsRejected += 1;
      if (!m.rejectedIds.includes(id)) {
        m.rejectedIds.push(id);
        const sourceId = id.split("#")[0];
        const bucket = CORPUS.some((s) => s.id === sourceId)
          ? m.rejectedMalformed
          : m.rejectedInvented;
        bucket.push(id);
      }
    }
  }

  let kind = claim.kind;
  let downgradedFrom: EpistemicKind | undefined;

  if (kind === "verified" && kept.length === 0) {
    downgradedFrom = "verified";
    kind = "inference";
    m.downgrades.push({
      statementId,
      from: "verified",
      to: "inference",
      reason:
        "出典として示されたIDがコーパスに存在しないか、出典が示されていないため。",
    });
  }

  if (kind === "unknown" && kept.length > 0) {
    // "Unknown" must not be decorated with references.
    kept.length = 0;
  }

  m.byKind[kind] += 1;

  return {
    kind,
    text: claim.text,
    ...(claim.textEn ? { textEn: claim.textEn } : {}),
    sourceIds: kind === "unknown" ? [] : kept,
    ...(downgradedFrom ? { downgradedFrom } : {}),
  };
}

/**
 * How different are the generated scenarios, really?
 *
 * CHRONOS is asked for genuinely divergent futures, but a language model will
 * happily produce three paraphrases of the same future. We measure divergence
 * as the share of indicator keys on which the scenarios disagree in direction.
 * A low score is reported to the user rather than hidden.
 */
export function scenarioDivergence(scenarios: Scenario[]): number {
  if (scenarios.length < 2) return 0;
  const keys = new Set(
    scenarios.flatMap((s) => s.indicators.map((i) => i.key)),
  );
  if (keys.size === 0) return 0;
  let disagreeing = 0;
  for (const key of keys) {
    const directions = new Set(
      scenarios
        .map((s) => s.indicators.find((i) => i.key === key)?.direction)
        .filter(Boolean),
    );
    if (directions.size > 1) disagreeing += 1;
  }
  return Number((disagreeing / keys.size).toFixed(2));
}

export function verifyStatements(
  statements: Statement[],
  scenarios: Scenario[],
): VerificationOutcome {
  const m: Mutable = {
    citationsChecked: 0,
    citationsRejected: 0,
    rejectedIds: [],
    rejectedMalformed: [],
    rejectedInvented: [],
    downgrades: [],
    sourcesUsed: new Set<string>(),
    byKind: { verified: 0, inference: 0, hypothetical: 0, unknown: 0 },
  };

  const verified = statements.map((statement) => ({
    ...statement,
    claims: statement.claims.map((claim) =>
      verifyClaim(claim, statement.id, m),
    ),
    ...(statement.selfCritique
      ? { selfCritique: verifyClaim(statement.selfCritique, statement.id, m) }
      : {}),
  }));

  // Indicator citations are verified with the same rule.
  for (const scenario of scenarios) {
    for (const indicator of scenario.indicators) {
      const kept: string[] = [];
      for (const id of indicator.sourceIds ?? []) {
        m.citationsChecked += 1;
        const resolved = FINDING_INDEX.get(id.trim());
        if (resolved) {
          kept.push(id.trim());
          m.sourcesUsed.add(resolved.source.id);
        } else {
          m.citationsRejected += 1;
          if (!m.rejectedIds.includes(id)) {
            m.rejectedIds.push(id);
            const sourceId = id.split("#")[0].trim();
            (CORPUS.some((s) => s.id === sourceId)
              ? m.rejectedMalformed
              : m.rejectedInvented
            ).push(id);
          }
        }
      }
      indicator.sourceIds = kept;
      if (kept.length === 0 && indicator.direction !== "unknown") {
        // An unsourced indicator keeps its direction but is explicitly marked.
        indicator.noteJa = `${indicator.noteJa}（出典なし・推論）`.replace(
          /（出典なし・推論）+$/,
          "（出典なし・推論）",
        );
      }
    }
  }

  const claimsTotal = Object.values(m.byKind).reduce((a, b) => a + b, 0);

  return {
    statements: verified,
    audit: {
      claimsTotal,
      byKind: m.byKind,
      citationsChecked: m.citationsChecked,
      citationsRejected: m.citationsRejected,
      rejectedIds: m.rejectedIds,
      rejectedMalformed: m.rejectedMalformed,
      rejectedInvented: m.rejectedInvented,
      downgrades: m.downgrades,
      scenarioDivergence: scenarioDivergence(scenarios),
      sourcesUsed: [...m.sourcesUsed],
    },
  };
}

export function finalizeAudit(
  partial: VerificationOutcome["audit"],
  meta: { mode: RunMode; model: string; elapsedMs: number },
): AuditReport {
  return { ...partial, ...meta };
}

/** Merge incremental audits produced while streaming statement by statement. */
export function mergeAudits(
  a: VerificationOutcome["audit"],
  b: VerificationOutcome["audit"],
): VerificationOutcome["audit"] {
  return {
    claimsTotal: a.claimsTotal + b.claimsTotal,
    byKind: {
      verified: a.byKind.verified + b.byKind.verified,
      inference: a.byKind.inference + b.byKind.inference,
      hypothetical: a.byKind.hypothetical + b.byKind.hypothetical,
      unknown: a.byKind.unknown + b.byKind.unknown,
    },
    citationsChecked: a.citationsChecked + b.citationsChecked,
    citationsRejected: a.citationsRejected + b.citationsRejected,
    rejectedIds: [...new Set([...a.rejectedIds, ...b.rejectedIds])],
    rejectedMalformed: [...new Set([...a.rejectedMalformed, ...b.rejectedMalformed])],
    rejectedInvented: [...new Set([...a.rejectedInvented, ...b.rejectedInvented])],
    downgrades: [...a.downgrades, ...b.downgrades],
    scenarioDivergence: Math.max(a.scenarioDivergence, b.scenarioDivergence),
    sourcesUsed: [...new Set([...a.sourcesUsed, ...b.sourcesUsed])],
  };
}

export function emptyAudit(): VerificationOutcome["audit"] {
  return {
    claimsTotal: 0,
    byKind: { verified: 0, inference: 0, hypothetical: 0, unknown: 0 },
    citationsChecked: 0,
    citationsRejected: 0,
    rejectedIds: [],
    rejectedMalformed: [],
    rejectedInvented: [],
    downgrades: [],
    scenarioDivergence: 0,
    sourcesUsed: [],
  };
}
