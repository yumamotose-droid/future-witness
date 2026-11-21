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
  /**
   * The shape this bucket is measured against.
   *
   * All three routes share one map, so eviction cannot judge a bucket by the
   * config of whichever route happens to be asking: a deliberation bucket
   * (ten, refilling every 30s) read with the speech config (forty, every 4s)
   * looks full when it is empty.
   */
  capacity: number;
  refillPerMs: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Free one slot, but only by dropping a bucket that is already full.
 *
 * Evicting the least recently used key is exploitable: exhaust your own
 * bucket, flood the map until it is the oldest, and it comes back empty — a
 * reset on demand. Evicting the *fullest* bucket is better but still erases
 * limit state once every bucket is partly spent. So only a bucket that has
 * refilled to capacity may go: those carry no information at all.
 *
 * Each bucket is measured against the limits it was created with, since all
 * three routes share this map and the config of whichever route is asking
 * says nothing about the others.
 */
const EVICTION_SCAN = 256;

function makeRoom(now: number): boolean {
  let scanned = 0;
  for (const [key, bucket] of buckets) {
    if (scanned++ >= EVICTION_SCAN) break;
    if (key.endsWith(OVERFLOW_SUFFIX)) continue;
    const refilled = Math.min(
      bucket.capacity,
      bucket.tokens + Math.max(0, now - bucket.updatedAt) * bucket.refillPerMs,
    );
    if (refilled >= bucket.capacity) {
      buckets.delete(key);
      return true;
    }
  }
  return false;
}

/**
 * Where a new caller goes when the map is full of callers being limited.
 *
 * The two obvious answers are both wrong. Handing out a fresh private bucket
 * forgets whoever was evicted to make space, which is what a flood is trying
 * to arrange. Refusing outright means filling the map locks out every new
 * reader, a cheaper denial of service than the one being prevented.
 *
 * So the newcomer shares one coarse bucket per route instead. Nobody's limit
 * is erased, service continues, and the crowd that caused the overflow is
 * rate limited together rather than individually — which is the right answer
 * when individual identity can no longer be tracked.
 */
const OVERFLOW_SUFFIX = ":__overflow";

function overflowKey(key: string): string {
  const colon = key.indexOf(":");
  return `${colon > 0 ? key.slice(0, colon) : "default"}${OVERFLOW_SUFFIX}`;
}

export function consume(
  requested: string,
  cost = 1,
  config: RateLimitConfig = DELIBERATE_LIMIT,
  now = Date.now(),
): RateLimitResult {
  let key = requested;
  let existing = buckets.get(key);
  if (existing) {
    // Refresh insertion order so an active caller is scanned last.
    buckets.delete(key);
  } else if (buckets.size >= MAX_KEYS && !makeRoom(now)) {
    key = overflowKey(key);
    existing = buckets.get(key);
    if (existing) buckets.delete(key);
  }
  const bucket = existing ?? {
    tokens: config.capacity,
    updatedAt: now,
    capacity: config.capacity,
    refillPerMs: config.refillPerMs,
  };
  const elapsed = Math.max(0, now - bucket.updatedAt);
  const tokens = Math.min(
    config.capacity,
    bucket.tokens + elapsed * config.refillPerMs,
  );
  if (tokens < cost) {
    buckets.set(key, { ...bucket, tokens, updatedAt: now });
    const deficit = cost - tokens;
    return {
      ok: false,
      remaining: Math.floor(tokens),
      retryAfterSeconds: Math.ceil(deficit / config.refillPerMs / 1000),
    };
  }
  buckets.set(key, { ...bucket, tokens: tokens - cost, updatedAt: now });
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
