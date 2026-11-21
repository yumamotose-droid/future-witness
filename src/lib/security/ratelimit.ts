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
  /**
   * A shared bucket standing in for callers that could not be tracked
   * individually. Marked on the object rather than detected from the key,
   * because the key contains a value the caller supplied.
   */
  overflow?: boolean;
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
  /**
   * A shared bucket standing in for callers that could not be tracked
   * individually. Marked on the object rather than detected from the key,
   * because the key contains a value the caller supplied.
   */
  overflow?: boolean;
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
    if (bucket.overflow) continue;
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
 * So the newcomer shares a bucket instead — but not one bucket for everyone,
 * which would let a single flooder drain the capacity meant for every other
 * overflowed reader. The address is hashed into a fixed set of shards, so an
 * attacker occupies a slice rather than the whole, and an unrelated reader
 * who lands elsewhere is unaffected.
 */
const OVERFLOW_SHARDS = 16;

function overflowKey(key: string): string {
  const colon = key.indexOf(":");
  const scope = colon > 0 ? key.slice(0, colon) : "default";
  const address = colon > 0 ? key.slice(colon + 1) : key;
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) | 0;
  }
  return `${scope}:__overflow:${Math.abs(hash) % OVERFLOW_SHARDS}`;
}

export function consume(
  requested: string,
  cost = 1,
  config: RateLimitConfig = DELIBERATE_LIMIT,
  now = Date.now(),
): RateLimitResult {
  let key = requested;
  let overflow = false;
  let existing = buckets.get(key);
  if (existing) {
    // Refresh insertion order so an active caller is scanned last.
    buckets.delete(key);
  } else if (buckets.size >= MAX_KEYS && !makeRoom(now)) {
    key = overflowKey(key);
    overflow = true;
    existing = buckets.get(key);
    if (existing) buckets.delete(key);
  }
  const bucket = existing ?? {
    tokens: config.capacity,
    updatedAt: now,
    capacity: config.capacity,
    refillPerMs: config.refillPerMs,
    ...(overflow ? { overflow: true } : {}),
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
 * The leftmost entry of `x-forwarded-for` is whatever the caller typed, so
 * keying on it hands out a fresh bucket to anyone who sends a different value
 * each time — which, now that one of these routes bills for audio, is a way
 * to spend the project's money rather than merely to skip a queue.
 *
 * `x-vercel-forwarded-for` is written by the platform's own proxy and cannot
 * be set from outside, so it is preferred. Behind any other single trusted
 * proxy the last entry is the one that proxy appended; forged entries sit to
 * its left and are ignored.
 *
 * Whatever is found is then checked against the shape of an address, because
 * the value ends up inside a map key and this module gives some keys meaning.
 * Anything that is not an address becomes `unknown` and shares one bucket.
 * IPv6 is counted per /64: a single assignment is a whole network's worth of
 * addresses, and tracking them separately would be tracking nothing.
 */
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_GROUP = /^[0-9a-f]{1,4}$/;

function asIpv4(value: string): string | null {
  const match = IPV4.exec(value);
  if (!match) return null;
  return match.slice(1).every((part) => Number(part) <= 255) ? value : null;
}

/**
 * Expand an IPv6 address to its eight groups.
 *
 * Writing out the groups matters because the result becomes a bucket key:
 * `2001:db8::1` and `2001:0db8:0:0:0:0:0:1` are one address, and treating
 * them as two would hand the same caller two limits. The `::` is filled in,
 * every group is padded, and an IPv4-mapped tail is folded into its two
 * groups so `::ffff:1.2.3.4` cannot pose as something else.
 */
function expandIpv6(value: string): string[] | null {
  if (!value.includes(":")) return null;

  let body = value;
  const lastColon = body.lastIndexOf(":");
  const tail = body.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = asIpv4(tail);
    if (!v4) return null;
    const [a, b, c, d] = v4.split(".").map(Number);
    body = `${body.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const halves = body.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const rear = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (![...head, ...rear].every((group) => IPV6_GROUP.test(group))) return null;

  if (halves.length === 1) {
    return head.length === 8 ? head.map((g) => g.padStart(4, "0")) : null;
  }
  const missing = 8 - head.length - rear.length;
  if (missing < 1) return null;
  return [...head, ...Array(missing).fill("0"), ...rear].map((g) => g.padStart(4, "0"));
}

function normalizeAddress(raw: string | undefined): string | null {
  const value = raw?.trim().toLowerCase();
  if (!value || value.length > 45) return null;

  const v4 = asIpv4(value);
  if (v4) return v4;

  const groups = expandIpv6(value);
  if (!groups) return null;

  // An IPv4 address written in IPv6 form is still that IPv4 address. Taking
  // a /64 of ::ffff:a.b.c.d would put every such caller in one bucket, since
  // the first four groups are zero for all of them — one limit shared by
  // everyone whose address arrives in this shape.
  const embedded = embeddedIpv4(groups);
  if (embedded) return embedded;

  // Otherwise only the routing prefix is kept: one assignment is a whole
  // network of addresses, so counting them separately would count nothing.
  return `${groups.slice(0, 4).join(":")}::/64`;
}

/** The IPv4 inside ::ffff:a.b.c.d or ::a.b.c.d, if that is what this is. */
function embeddedIpv4(groups: string[]): string | null {
  const leading = groups.slice(0, 5).every((group) => group === "0000");
  if (!leading) return null;
  const marker = groups[5];
  // ::ffff:a.b.c.d is mapped; ::a.b.c.d is the deprecated compatible form.
  // Anything else with five zero groups is loopback or unspecified.
  if (marker !== "ffff" && marker !== "0000") return null;
  const high = Number.parseInt(groups[6], 16);
  const low = Number.parseInt(groups[7], 16);
  if (marker === "0000" && high === 0 && low <= 1) return null;
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

export function clientKey(headers: Headers, scope = "default"): string {
  const chain = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const address =
    normalizeAddress(headers.get("x-vercel-forwarded-for") ?? undefined) ??
    normalizeAddress(chain?.[chain.length - 1]) ??
    normalizeAddress(headers.get("x-real-ip") ?? undefined) ??
    "unknown";
  return `${scope}:${address}`;
}

/** Test seam. */
export function resetRateLimiter(): void {
  buckets.clear();
}
