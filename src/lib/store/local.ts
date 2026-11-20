import type { SessionRecord } from "@/lib/types";

/**
 * History lives in the browser only.
 *
 * The spec allows a Supabase-backed history, but storing deliberations about
 * contested local decisions on a server would collect exactly the kind of data
 * this project argues for minimising — and the demo needs no account. The
 * Supabase adapter exists for a deployment that decides otherwise; this is the
 * default, and the UI says where the data is.
 *
 * Exposed as an external store so React can subscribe to it without an effect
 * that writes state on mount. The snapshot is cached against the raw string so
 * the reference stays stable between renders, which `useSyncExternalStore`
 * requires.
 */

const KEY = "future-witness/sessions/v1";
const EVENT = "future-witness:sessions";
const MAX = 20;

const EMPTY: SessionRecord[] = [];
let cachedRaw: string | null = null;
let cachedValue: SessionRecord[] = EMPTY;

function available(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function readRaw(): string | null {
  if (!available()) return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function loadSessions(): SessionRecord[] {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (!raw) {
    cachedValue = EMPTY;
    return cachedValue;
  }
  try {
    const parsed = JSON.parse(raw);
    cachedValue = Array.isArray(parsed) ? (parsed as SessionRecord[]) : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

function announce(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function saveSession(session: SessionRecord): void {
  if (!available()) return;
  try {
    const existing = loadSessions().filter((s) => s.id !== session.id);
    const next = [session, ...existing].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    announce();
  } catch {
    /* Storage can be unavailable or full; history is not load-bearing. */
  }
}

export function clearSessions(): void {
  if (!available()) return;
  try {
    window.localStorage.removeItem(KEY);
    announce();
  } catch {
    /* ignore */
  }
}

export function subscribeSessions(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Server render has no browser storage, so it starts from nothing. */
export function serverSessions(): SessionRecord[] {
  return EMPTY;
}
