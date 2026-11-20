import type {
  Framing,
  Lang,
  Option,
  RunMode,
  Scenario,
  Statement,
  Witness,
} from "@/lib/types";
import type { RetrievalHit } from "@/lib/evidence/retrieve";
import type { BudgetLedger } from "@/lib/security/budget";

export interface RunContext {
  runId: string;
  /** Sanitized user question. Never the raw input. */
  question: string;
  lang: Lang;
  hits: RetrievalHit[];
  corpusText: string;
  framing?: Framing;
  options?: Option[];
  evidence?: Statement;
  scenarios?: Scenario[];
  /** Narratives already produced, so COUNTER can attack them. */
  voiceTexts: { scenarioId: string; text: string }[];
  ledger: BudgetLedger;
  signal?: AbortSignal;
}

export interface VoiceHandle {
  witness: Witness;
  stream: AsyncIterable<string>;
  /** The same testimony in the other language, when one is already written. */
  alternate?: string;
}

/**
 * One deliberation pipeline, implemented twice: once against a live model and
 * once as a deterministic script. The orchestrator is written against this
 * interface so the verification, budgeting and streaming logic is identical in
 * both modes — which is what makes the scripted demo an honest preview of the
 * live system rather than a separate fake.
 */
export interface DeliberationEngine {
  readonly mode: RunMode;
  readonly model: string;
  framing(ctx: RunContext): Promise<Framing>;
  options(ctx: RunContext): Promise<Option[]>;
  evidence(ctx: RunContext): Promise<Statement>;
  scenarios(ctx: RunContext): Promise<Scenario[]>;
  voice(ctx: RunContext, scenario: Scenario): Promise<VoiceHandle>;
  counter(ctx: RunContext): Promise<Statement>;
  uncertainty(ctx: RunContext): Promise<Statement>;
}
