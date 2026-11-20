import { describe, expect, it } from "vitest";
import { withHardLimit } from "@/lib/ai/gemini";
import { ProviderError } from "@/lib/ai/provider";

/**
 * A live run measured 32 minutes against a declared 110s budget because the
 * SDK kept streaming after its abort signal fired. The ceiling must therefore
 * hold without the callee's cooperation.
 */
describe("withHardLimit", () => {
  it("gives up on a call that ignores its abort signal", async () => {
    const controller = new AbortController();
    // Deliberately uncooperative: never settles, never watches the signal.
    const stubborn = new Promise<string>(() => {});
    const started = Date.now();
    controller.abort();

    await expect(withHardLimit(stubborn, 30, "stubborn-model")).rejects.toThrow(
      /did not answer within 30ms/,
    );
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("reports the failure as a retryable timeout, not a bad response", async () => {
    const error = await withHardLimit(new Promise<string>(() => {}), 10, "m").catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).code).toBe("timeout");
    expect((error as ProviderError).retryable).toBe(true);
  });

  it("returns the value untouched when the call answers in time", async () => {
    await expect(withHardLimit(Promise.resolve("ok"), 500, "m")).resolves.toBe("ok");
  });

  it("passes the original failure through rather than masking it as a timeout", async () => {
    const boom = new ProviderError("blocked by safety", "blocked", false);
    await expect(withHardLimit(Promise.reject(boom), 500, "m")).rejects.toBe(boom);
  });
});
