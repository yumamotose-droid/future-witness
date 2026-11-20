import { beforeEach, describe, expect, it } from "vitest";
import {
  BUDGET,
  budgetStop,
  estimateTokens,
  openLedger,
  recordSpend,
  remainingTokens,
  resetProcessBudget,
} from "@/lib/security/budget";

describe("budget", () => {
  beforeEach(() => resetProcessBudget());

  it("tracks spend and remaining allowance", () => {
    const ledger = openLedger(0);
    recordSpend(ledger, 1_000);
    expect(ledger.spent).toBe(1_000);
    expect(remainingTokens(ledger)).toBe(
      BUDGET.maxOutputTokensPerRun - 1_000,
    );
  });

  it("stops a run that exceeds its token budget", () => {
    const ledger = openLedger(0);
    expect(budgetStop(ledger, 0)).toBeNull();
    recordSpend(ledger, BUDGET.maxOutputTokensPerRun);
    expect(budgetStop(ledger, 0)).toBe("run_tokens");
  });

  it("stops a run that exceeds its time budget", () => {
    const ledger = openLedger(0);
    expect(budgetStop(ledger, BUDGET.maxRunMs + 1)).toBe("run_time");
  });

  it("estimates Japanese text at roughly one token per character", () => {
    expect(estimateTokens("森林を伐採する")).toBe(7);
    expect(estimateTokens("hello world!")).toBe(3);
  });

  it("ignores negative spend", () => {
    const ledger = openLedger(0);
    recordSpend(ledger, -500);
    expect(ledger.spent).toBe(0);
  });
});
