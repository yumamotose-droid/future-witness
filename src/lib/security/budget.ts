/**
 * Token and cost ceilings.
 *
 * A public demo with no sign-in is an open invitation to burn an API quota, so
 * the orchestrator refuses to start a run that could exceed these numbers and
 * stops mid-pipeline if a run overshoots.
 */

export const BUDGET = {
  /** Hard cap for one deliberation across all agent calls. */
  maxOutputTokensPerRun: 9_000,
  /** Per-call cap handed to the provider. */
  maxOutputTokensPerCall: 2_200,
  /** Wall-clock ceiling for one run. */
  maxRunMs: 110_000,
  /** Process-lifetime ceiling, a crude circuit breaker for a runaway demo. */
  maxOutputTokensPerProcess: 2_000_000,
} as const;

let processTokens = 0;

export interface BudgetLedger {
  spent: number;
  startedAt: number;
}

export function openLedger(now = Date.now()): BudgetLedger {
  return { spent: 0, startedAt: now };
}

export function recordSpend(ledger: BudgetLedger, tokens: number): void {
  ledger.spent += Math.max(0, tokens);
  processTokens += Math.max(0, tokens);
}

export function remainingTokens(ledger: BudgetLedger): number {
  return Math.max(0, BUDGET.maxOutputTokensPerRun - ledger.spent);
}

export type BudgetStop = "run_tokens" | "run_time" | "process_tokens" | null;

export function budgetStop(
  ledger: BudgetLedger,
  now = Date.now(),
): BudgetStop {
  if (processTokens >= BUDGET.maxOutputTokensPerProcess)
    return "process_tokens";
  if (ledger.spent >= BUDGET.maxOutputTokensPerRun) return "run_tokens";
  if (now - ledger.startedAt >= BUDGET.maxRunMs) return "run_time";
  return null;
}

/** Rough token estimate for accounting when the provider omits usage. */
export function estimateTokens(text: string): number {
  // Japanese text is roughly one token per character; Latin ~4 chars/token.
  const cjk = (text.match(/[぀-ヿ一-鿿]/g) ?? []).length;
  const rest = text.length - cjk;
  return Math.ceil(cjk + rest / 4);
}

export function processTokensSpent(): number {
  return processTokens;
}

/** Test seam. */
export function resetProcessBudget(): void {
  processTokens = 0;
}
