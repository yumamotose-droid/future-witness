"use client";

import type { Lang, SessionRecord } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";

export function HistoryPanel({
  sessions,
  lang,
  onClear,
}: {
  sessions: SessionRecord[];
  lang: Lang;
  onClear: () => void;
}) {
  const L = t(lang);
  return (
    <section className="rule-t pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="t-display text-[1.5rem]">{L.history}</h2>
        {sessions.length > 0 ? (
          <button
            type="button"
            className="link t-mono-plain no-print"
            onClick={onClear}
          >
            {L.clearHistory}
          </button>
        ) : null}
      </div>
      <p className="mt-3 max-w-[40rem] text-[0.8125rem] leading-[1.9] text-ink-faint">
        {L.historyNote}
      </p>
      {sessions.length === 0 ? (
        <p className="mt-6 text-[0.875rem] text-ink-faint">{L.historyEmpty}</p>
      ) : (
        <ol className="mt-6 border-t border-rule">
          {sessions.map((session) => {
            const moved =
              session.before && session.after
                ? session.before.optionId !== session.after.optionId
                : null;
            return (
              <li key={session.id} className="rule-b py-4">
                <p className="t-mono-plain text-ink-faint">
                  {new Date(session.createdAt).toLocaleString(
                    lang === "ja" ? "ja-JP" : "en-GB",
                  )}
                </p>
                <p className="mt-1 max-w-[46rem] text-[0.9375rem] leading-[1.8]">
                  {session.question}
                </p>
                {moved !== null ? (
                  <p className="t-mono mt-2 text-[var(--olive)]">
                    {moved ? L.stanceChanged : L.stanceUnchanged}
                    {session.before && session.after
                      ? ` · ${L.confidenceDelta} ${
                          session.after.confidence -
                            session.before.confidence >=
                          0
                            ? "+"
                            : ""
                        }${session.after.confidence - session.before.confidence}`
                      : ""}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
