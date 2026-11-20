"use client";

import { resolveFinding } from "@/lib/evidence/corpus";
import type { Lang, SourceRecord } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";

/**
 * Full provenance for everything cited in the run.
 *
 * The spec requires title, publisher, year, URL, passage, region, applicability
 * and the date the URL was checked. All eight are shown, and applicability is
 * given the same weight as the title, because the most common way to mislead
 * with a real citation is to apply it outside the scope its authors claimed.
 */
export function SourcesPanel({
  citationIndex,
  lang,
}: {
  citationIndex: Map<string, number>;
  lang: Lang;
}) {
  const L = t(lang);
  const bySource = new Map<string, { n: number; source: SourceRecord }>();
  for (const [citationId, n] of citationIndex) {
    const hit = resolveFinding(citationId);
    if (!hit) continue;
    const existing = bySource.get(hit.source.id);
    if (!existing || n < existing.n) {
      bySource.set(hit.source.id, { n, source: hit.source });
    }
  }
  const ordered = [...bySource.values()].sort((a, b) => a.n - b.n);
  if (ordered.length === 0) return null;

  return (
    <section className="rule-t pt-8">
      <h2 className="t-display text-[1.5rem]">{L.sources}</h2>
      <p className="mt-3 max-w-[42rem] text-[0.875rem] leading-[1.95] text-ink-soft">
        {L.sourcesBody}
      </p>

      <ol className="mt-8 border-t border-rule">
        {ordered.map(({ n, source }) => (
          <li
            key={source.id}
            id={`source-${source.id}`}
            className="rule-b scroll-mt-20 py-6"
          >
            <div className="flex gap-4 sm:gap-6">
              <span className="t-mono pt-1 text-[var(--gold)]">
                [{n}]
              </span>
              <div className="min-w-0">
                <h3 className="t-display text-[1rem] leading-[1.6]">
                  {lang === "ja" ? source.titleJa : source.titleEn}
                </h3>
                <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
                  {(
                    [
                      [L.publisher, source.org],
                      [L.year, String(source.year)],
                      [L.locator, source.locator],
                      [L.region, source.region],
                      [
                        L.scope,
                        lang === "ja" ? source.scopeJa : source.scopeEn,
                      ],
                      [L.checkedOn, source.checkedOn],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="contents sm:contents"
                    >
                      <dt className="t-mono text-ink-faint">{label}</dt>
                      <dd className="mb-2 max-w-[44rem] text-[0.8125rem] leading-[1.9] text-ink-soft sm:mb-0">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link t-mono-plain mt-3 inline-block break-all"
                >
                  {source.url}
                </a>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
