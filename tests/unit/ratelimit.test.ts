import { beforeEach, describe, expect, it } from "vitest";
import {
  clientKey,
  consume,
  resetRateLimiter,
  DELIBERATE_LIMIT,
} from "@/lib/security/ratelimit";

describe("rate limiting", () => {
  beforeEach(() => resetRateLimiter());

  it("allows up to the bucket capacity then refuses", () => {
    const now = 1_000_000;
    for (let i = 0; i < DELIBERATE_LIMIT.capacity; i += 1) {
      expect(consume("ip:1", 1, DELIBERATE_LIMIT, now).ok).toBe(true);
    }
    const refused = consume("ip:1", 1, DELIBERATE_LIMIT, now);
    expect(refused.ok).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("refills over time", () => {
    const now = 1_000_000;
    for (let i = 0; i < DELIBERATE_LIMIT.capacity; i += 1) {
      consume("ip:2", 1, DELIBERATE_LIMIT, now);
    }
    expect(consume("ip:2", 1, DELIBERATE_LIMIT, now).ok).toBe(false);
    // One token refills every 30s.
    expect(consume("ip:2", 1, DELIBERATE_LIMIT, now + 31_000).ok).toBe(true);
  });

  it("keeps separate buckets per client", () => {
    const now = 1_000_000;
    for (let i = 0; i < DELIBERATE_LIMIT.capacity; i += 1) {
      consume("ip:3", 1, DELIBERATE_LIMIT, now);
    }
    expect(consume("ip:3", 1, DELIBERATE_LIMIT, now).ok).toBe(false);
    expect(consume("ip:4", 1, DELIBERATE_LIMIT, now).ok).toBe(true);
  });

  it("derives a key from the forwarding headers", () => {
    // The last entry is the one the nearest proxy appended. This test used to
    // expect the first, which is whatever the caller typed — keying on it let
    // anyone mint a fresh bucket per request.
    expect(
      clientKey(
        new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
        "deliberate",
      ),
    ).toBe("deliberate:10.0.0.1");
    expect(clientKey(new Headers({ "x-real-ip": "203.0.113.8" }))).toBe(
      "default:203.0.113.8",
    );
    expect(clientKey(new Headers())).toBe("default:unknown");
  });
});
