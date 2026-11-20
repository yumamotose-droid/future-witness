/**
 * FUTURE WITNESS — core domain types.
 *
 * The central design rule of this system: every sentence an agent produces is
 * wrapped in a `Claim` carrying an explicit epistemic `kind`. The UI never
 * renders free-form agent prose outside of a Claim, so the separation between
 * verified evidence, inference, hypothetical scenario and unknown is a
 * structural property of the data model rather than something we hope the
 * prompt achieved.
 */

export type Lang = "ja" | "en";

/** How much epistemic weight a single statement carries. */
export type EpistemicKind =
  /** Traceable to at least one finding in the curated corpus. */
  | "verified"
  /** Reasoning built on verified findings; not itself sourced. */
  | "inference"
  /** A conditional "what if" narrative. Never a prediction. */
  | "hypothetical"
  /** The system does not know, and says so. */
  | "unknown";

export const EPISTEMIC_KINDS: EpistemicKind[] = [
  "verified",
  "inference",
  "hypothetical",
  "unknown",
];

export type AgentId = "CHRONOS" | "EVIDENCE" | "MIRAI" | "COUNTER";

export type Phase =
  | "framing"
  | "options"
  | "evidence"
  | "scenarios"
  | "voices"
  | "counter"
  | "uncertainty"
  | "audit";

/** One quantitative or qualitative finding extracted from a source document. */
export interface SourceFinding {
  /** Stable citation key. Agents may ONLY cite keys that exist here. */
  id: string;
  ja: string;
  en: string;
  /** The limitation that must travel with the number. */
  caveatJa: string;
  caveatEn: string;
}

/** A source document with the full provenance metadata required by the spec. */
export interface SourceRecord {
  id: string;
  titleJa: string;
  titleEn: string;
  /** 発行機関 */
  org: string;
  /** 発行年 */
  year: number;
  /** 出典URL */
  url: string;
  /** 参照箇所 */
  locator: string;
  /** 地域 */
  region: string;
  /** 適用範囲 — where this source may and may not be applied. */
  scopeJa: string;
  scopeEn: string;
  /** 確認日 (ISO date) — when a human last confirmed this URL resolved. */
  checkedOn: string;
  topics: string[];
  findings: SourceFinding[];
}

export interface Claim {
  kind: EpistemicKind;
  /** Primary text. Japanese is the product's primary language. */
  text: string;
  /**
   * English rendering of the same sentence. Optional because a live model may
   * fail to produce it; the UI falls back to `text` rather than showing a gap,
   * and never shows a machine-translated-looking placeholder.
   */
  textEn?: string;
  /** Finding ids (`<sourceId>#<findingId>`). Required when kind === "verified". */
  sourceIds: string[];
  /** Set by the verifier when a claim was demoted for lack of valid citations. */
  downgradedFrom?: EpistemicKind;
}

export interface Statement {
  id: string;
  agent: AgentId;
  /** Present when the statement is bound to one future scenario. */
  scenarioId?: string;
  titleJa: string;
  titleEn: string;
  claims: Claim[];
}

export interface Option {
  id: string;
  labelJa: string;
  labelEn: string;
  summaryJa: string;
  summaryEn: string;
}

export interface Framing {
  /** The decision restated without loaded language. */
  coreJa: string;
  coreEn: string;
  /** Premises the question smuggles in. */
  assumptions: Claim[];
  stakeholders: {
    nameJa: string;
    nameEn: string;
    /** Which time horizon this party can actually vote in. */
    horizonJa: string;
    horizonEn: string;
    hasVote: boolean;
  }[];
}

export type Horizon = 2030 | 2040 | 2050;
export const HORIZONS: Horizon[] = [2030, 2040, 2050];

/** One decade-layer of a scenario — a stratum in the "future core sample". */
export interface Stratum {
  year: Horizon;
  headlineJa: string;
  headlineEn: string;
  detailJa: string;
  detailEn: string;
  /** -1 (degraded) .. +1 (improved). Qualitative direction, never a probability. */
  tone: number;
}

export interface Indicator {
  key: string;
  labelJa: string;
  labelEn: string;
  direction: "up" | "down" | "mixed" | "unknown";
  noteJa: string;
  noteEn: string;
  sourceIds: string[];
}

export interface Scenario {
  id: string;
  optionId: string;
  nameJa: string;
  nameEn: string;
  premiseJa: string;
  premiseEn: string;
  strata: Stratum[];
  indicators: Indicator[];
}

export interface Witness {
  nameJa: string;
  nameEn: string;
  age: number;
  bornIn: number;
  placeJa: string;
  placeEn: string;
}

export interface Voice {
  scenarioId: string;
  witness: Witness;
  /** Streamed narrative, in the language the run was started in. */
  body: string;
  /**
   * The same testimony in the other language, when the engine has one written.
   * The scripted engine does; a live model produces only the run's language, so
   * switching afterwards falls back to `body` and the UI says which language it
   * is in rather than pretending to translate.
   */
  bodyAlt?: string;
}

/** What the verification layer actually did — surfaced in the UI. */
export interface AuditReport {
  claimsTotal: number;
  byKind: Record<EpistemicKind, number>;
  citationsChecked: number;
  /** Citations pointing at finding ids that do not exist. Removed, not shown. */
  citationsRejected: number;
  rejectedIds: string[];
  downgrades: {
    statementId: string;
    from: EpistemicKind;
    to: EpistemicKind;
    reason: string;
  }[];
  /** 0..1 — how far apart the generated scenarios actually are. */
  scenarioDivergence: number;
  sourcesUsed: string[];
  mode: RunMode;
  model: string;
  elapsedMs: number;
}

export type RunMode = "live" | "scripted";

export interface Stance {
  optionId: string;
  /** 0..100 — how sure the user is. */
  confidence: number;
  reason: string;
  at: string;
}

export interface DeliberationResult {
  id: string;
  lang: Lang;
  question: string;
  framing: Framing;
  options: Option[];
  scenarios: Scenario[];
  statements: Statement[];
  voices: Voice[];
  audit: AuditReport;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  question: string;
  lang: Lang;
  before?: Stance;
  after?: Stance;
  result?: DeliberationResult;
  openQuestions: string[];
  createdAt: string;
}

export type StreamEvent =
  | { type: "meta"; mode: RunMode; model: string; lang: Lang; runId: string }
  | { type: "phase"; phase: Phase }
  | { type: "framing"; data: Framing }
  | { type: "options"; data: Option[] }
  | { type: "statement"; data: Statement }
  | { type: "scenarios"; data: Scenario[] }
  | { type: "voice-start"; scenarioId: string; witness: Witness }
  | { type: "voice-delta"; scenarioId: string; text: string }
  | { type: "voice-end"; scenarioId: string; bodyAlt?: string }
  | { type: "audit"; data: AuditReport }
  | { type: "notice"; code: string; messageJa: string; messageEn: string }
  | { type: "error"; code: string; messageJa: string; messageEn: string }
  | { type: "done" };
