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

/**
 * Free one slot without forgetting anyone who is currently limited.
 *
 * Evicting the least recently used key looks reasonable and is exploitable:
 * exhaust your own bucket, flood the map with junk keys until your bucket is
 * the oldest, and it comes back empty — a full reset on demand. A bucket that
 * has refilled to capacity carries no information, so only those may be
 * dropped. The scan is bounded because this runs on every request.
 */
const EVICTION_SCAN = 256;

function makeRoom(now: number, config: RateLimitConfig): boolean {
  let scanned = 0;
  for (const [key, bucket] of buckets) {
    if (scanned++ >= EVICTION_SCAN) break;
    const refilled = Math.min(
      config.capacity,
      bucket.tokens + Math.max(0, now - bucket.updatedAt) * config.refillPerMs,
    );
    if (refilled >= config.capacity) {
      buckets.delete(key);
      return true;
    }
  }
  return false;
}

export function consume(
  key: string,
  cost = 1,
  config: RateLimitConfig = DELIBERATE_LIMIT,
  now = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);
  if (existing) {
    // Refresh recency so an active caller is never the eviction candidate.
    buckets.delete(key);
  } else if (buckets.size >= MAX_KEYS && !makeRoom(now, config)) {
    // Every tracked caller still owes tokens and there is nowhere to put a
    // new one. Refusing is the safe direction: admitting this key would mean
    // forgetting someone who is being limited, which is what an attacker
    // flooding the map is trying to arrange.
    return { ok: false, remaining: 0, retryAfterSeconds: 60 };
  }
  const bucket = existing ?? {
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

/**
 * Who to count this request against.
 *
 * The leftmost entry of `x-forwarded-for` is whatever the client typed, so
 * keying on it hands out a fresh bucket to anyone who sends a different value
 * each time — which, now that one of these routes bills for audio, is a way
 * to spend someone else's money rather than merely to skip a queue.
 *
 * `x-vercel-forwarded-for` is written by the platform's own proxy and cannot
 * be set from outside, so it is preferred. Behind any other single trusted
 * proxy the last entry is the one that proxy appended, so that is the one to
 * read; forged entries sit to its left and are ignored. With no proxy header
 * at all everything shares one bucket, which is strict rather than open.
 */
export function clientKey(headers: Headers, scope = "default"): string {
  const trusted = headers.get("x-vercel-forwarded-for")?.trim();
  const chain = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const ip =
    trusted ||
    chain?.[chain.length - 1] ||
    headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `${scope}:${ip}`;
}

/** Test seam. */
export function resetRateLimiter(): void {
  buckets.clear();
}
