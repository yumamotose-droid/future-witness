"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether this reader has asked for less motion.
 *
 * Read through `useSyncExternalStore` rather than an effect so the server
 * render and the first client render agree — otherwise an animation starts
 * and is then taken away, which is the opposite of what the setting asks for.
 *
 * The preference is read once per render rather than subscribed to: it
 * changes about as often as a person changes their system settings, and a
 * subscription here would cost every component that uses it a listener.
 */
const noSubscribe = () => () => {};

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    () => false,
  );
}
