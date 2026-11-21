/**
 * In-process token bucket.
 *
 * Deliberately not backed by Redis: this app has no user accounts and the demo
 * runs on a single Vercel region, so a per-instance limiter plus a hard token
 * budget is the right amount of machinery. The limits are documented in
 * SECURITY.md along with what this does NOT protect against (a distributed
 * caller hitting many instances).
 */

export interface RateLimitConfig {
  capacity: number;
  refillPerMs: number;
}

/**
 * Capacity can be raised for an end-to-end test run, which performs many
 * deliberations in a few minutes from one address. It must never be set in a
 * production deployment; SECURITY.md says so and the health endpoint reports
 * the value in effect so a misconfiguration is visible rather than silent.
 */
const CONFIGURED_CAPACITY = Number(process.env.RATE_LIMIT_CAPACITY ?? "");

export const DELIBERATE_LIMIT: RateLimitConfig = {
  // Ten full deliberations, refilling one every 30s. A complete run takes most
  // of a minute, so this is generous for a reader and still bounds a script.
  capacity:
    Number.isFinite(CONFIGURED_CAPACITY) && CONFIGURED_CAPACITY > 0
      ? CONFIGURED_CAPACITY
      : 10,
  refillPerMs: 1 / 30_000,
};

/** The single-chat comparison is one cheap call, so it gets its own bucket. */
export const BASELINE_LIMIT: RateLimitConfig = {
  capacity:
    Number.isFinite(CONFIGURED_CAPACITY) && CONFIGURED_CAPACITY > 0
      ? CONFIGURED_CAPACITY
      : 15,
  refillPerMs: 1 / 20_000,
};

/**
 * Speech is requested far more often than a deliberation: every passage the
 * reader plays, replays or skips ahead to is one call. The bucket is wide
 * enough that nobody meets it by listening, and refills fast enough that a
 * long session never stalls — while still bounding a script that asks for
 * audio in a loop, which is the expensive thing to leave open.
 */
export const SPEAK_LIMIT: RateLimitConfig = {
  capacity:
    Number.isFinite(CONFIGURED_CAPACITY) && CONFIGURED_CAPACITY > 0
      ? CONFIGURED_CAPACITY
      : 40,
  refillPerMs: 1 / 4_000,
};

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function consume(
  key: string,
  cost = 1,
  config: RateLimitConfig = DELIBERATE_LIMIT,
  now = Date.now(),
): RateLimitResult {
  if (buckets.size > MAX_KEYS) buckets.clear();
  const bucket = buckets.get(key) ?? {
    tokens: config.capacity,
    updatedAt: now,
  };
  const elapsed = Math.max(0, now - bucket.updatedAt);
  const tokens = Math.min(
    config.capacity,
    bucket.tokens + elapsed * config.refillPerMs,
  );
  if (tokens < cost) {
    buckets.set(key, { tokens, updatedAt: now });
    const deficit = cost - tokens;
    return {
      ok: false,
      remaining: Math.floor(tokens),
      retryAfterSeconds: Math.ceil(deficit / config.refillPerMs / 1000),
    };
  }
  buckets.set(key, { tokens: tokens - cost, updatedAt: now });
  return {
    ok: true,
    remaining: Math.floor(tokens - cost),
    retryAfterSeconds: 0,
  };
}

export function clientKey(headers: Headers, scope = "default"): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

/** Test seam. */
export function resetRateLimiter(): void {
  buckets.clear();
}
