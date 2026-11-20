"use client";

import Link from "next/link";
import { useCallback } from "react";
import type { Lang, RunMode } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";

const THEME_KEY = "future-witness/theme";

/**
 * The appearance toggle keeps no React state: both labels are rendered and CSS
 * picks the right one from `data-theme`. That removes the hydration mismatch
 * and the first-paint flash you get from reading localStorage in an effect.
 */
export function TopBar({
  lang,
  onLangChange,
  mode,
  modeNote,
}: {
  lang: Lang;
  onLangChange?: (lang: Lang) => void;
  mode?: RunMode;
  modeNote?: string;
}) {
  const L = t(lang);

  const toggleTheme = useCallback(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    const isDark =
      attr === "dark" ||
      (attr === null &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  return (
    <header className="rule-b no-print sticky top-0 z-40 bg-paper/95 backdrop-blur-[2px]">
      <div className="mx-auto flex max-w-[78rem] items-baseline gap-4 px-4 py-3 sm:px-8">
        <Link href="/" className="t-mono text-ink">
          Future Witness
        </Link>
        <span className="t-mono-plain hidden text-ink-faint sm:inline">
          未来の証人
        </span>
        <div className="ml-auto flex items-center gap-4">
          {mode ? (
            <span
              className="t-mono border px-2 py-1"
              style={{
                color: mode === "live" ? "var(--olive)" : "var(--gold)",
                borderColor: mode === "live" ? "var(--olive)" : "var(--gold)",
              }}
              title={modeNote}
            >
              {mode === "live" ? L.liveBadge : L.scriptedBadge}
            </span>
          ) : null}
          {onLangChange ? (
            <button
              type="button"
              onClick={() => onLangChange(lang === "ja" ? "en" : "ja")}
              className="t-mono text-ink-soft hover:text-ink"
            >
              {L.langToggle}
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={L.themeToggle}
            className="t-mono text-ink-soft hover:text-ink"
          >
            <span className="theme-label-light">Dark</span>
            <span className="theme-label-dark">Light</span>
          </button>
        </div>
      </div>
    </header>
  );
}
