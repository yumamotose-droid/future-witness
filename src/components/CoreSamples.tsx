"use client";

import type { Indicator, Lang, Option, Scenario } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";

/**
 * Core samples of the future — the comparison view.
 *
 * Scenarios are drawn as vertical strata rather than cards or bars because the
 * thing being compared is a sequence of states laid down over time, and a core
 * sample is how that is read in the physical world: you look down the column
 * and you look across the columns. Tone darkens or greens the stratum; it is a
 * reading aid and is labelled as one, because a scale that looked quantitative
 * would be the exact dishonesty this project exists to avoid.
 */

function toneStyle(tone: number): React.CSSProperties {
  const magnitude = Math.min(1, Math.abs(tone));
  if (tone > 0.08) {
    return {
      "--tone-color": "var(--olive)",
      "--tone-a": `${(6 + magnitude * 16).toFixed(0)}%`,
      "--tone-b": "3%",
    } as React.CSSProperties;
  }
  if (tone < -0.08) {
    return {
      "--tone-color": "var(--ink)",
      "--tone-a": `${(5 + magnitude * 14).toFixed(0)}%`,
      "--tone-b": "2%",
    } as React.CSSProperties;
  }
  return {
    "--tone-color": "var(--rule-strong)",
    "--tone-a": "8%",
    "--tone-b": "3%",
  } as React.CSSProperties;
}

const DIRECTION_GLYPH: Record<Indicator["direction"], string> = {
  up: "↑",
  down: "↓",
  mixed: "⇄",
  unknown: "？",
};

const DIRECTION_LABEL: Record<
  Indicator["direction"],
  { ja: string; en: string }
> = {
  up: { ja: "向上の方向", en: "toward improvement" },
  down: { ja: "低下の方向", en: "toward decline" },
  mixed: { ja: "方向が定まらない", en: "no settled direction" },
  unknown: { ja: "分からない", en: "unknown" },
};

export function CoreSamples({
  scenarios,
  options,
  lang,
}: {
  scenarios: Scenario[];
  options: Option[];
  lang: Lang;
}) {
  const L = t(lang);
  if (scenarios.length === 0) return null;

  const keys: string[] = [];
  for (const scenario of scenarios) {
    for (const indicator of scenario.indicators) {
      if (!keys.includes(indicator.key)) keys.push(indicator.key);
    }
  }

  return (
    <section className="rule-t pt-8">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="t-display text-[1.5rem]">{L.cores}</h2>
        <span className="t-mono text-[var(--gold)]">
          {lang === "ja" ? "すべて仮想シナリオ" : "all hypothetical"}
        </span>
      </header>
      <p className="mt-3 max-w-[40rem] text-[0.875rem] leading-[1.95] text-ink-soft">
        {L.coresBody}
      </p>

      {/*
        The decade rows are aligned ACROSS the columns with a subgrid, not left
        to each column's own content height. A core sample is read horizontally
        as well as vertically: if 2040 sits at a different height in each
        column, the comparison the view exists for cannot be made.
      */}
      <div
        className="cores mt-10"
        style={
          { "--cores": Math.min(scenarios.length, 3) } as React.CSSProperties
        }
      >
        {scenarios.map((scenario) => {
          const option = options.find((o) => o.id === scenario.optionId);
          return (
            <article key={scenario.id} className="core">
              <header className="rule-b self-start pb-4">
                <div className="flex items-baseline gap-3">
                  <span className="t-mono text-[var(--gold)]">
                    {scenario.id}
                  </span>
                  <h3 className="t-display text-[1.0625rem] leading-[1.5]">
                    {lang === "ja" ? scenario.nameJa : scenario.nameEn}
                  </h3>
                </div>
                {option ? (
                  <p className="t-mono-plain mt-2 text-ink-faint">
                    {lang === "ja" ? option.labelJa : option.labelEn}
                  </p>
                ) : null}
              </header>

              <p className="self-start pt-4 pb-6 text-[0.8125rem] leading-[1.9] text-ink-faint">
                {lang === "ja" ? scenario.premiseJa : scenario.premiseEn}
              </p>

              <ol className="contents">
                {scenario.strata.map((stratum) => (
                  <li
                    key={stratum.year}
                    className="stratum relative ml-[3.25rem] border-t border-l border-rule px-4 py-5 last:border-b"
                    style={toneStyle(stratum.tone)}
                  >
                    <span
                      className="t-mono absolute top-5 -left-[3.25rem] text-ink-faint"
                      aria-hidden
                    >
                      {stratum.year}
                    </span>
                    <h4 className="t-display text-[0.9375rem] leading-[1.6]">
                      <span className="sr-only">{stratum.year}年: </span>
                      {lang === "ja"
                        ? stratum.headlineJa
                        : stratum.headlineEn}
                    </h4>
                    <p className="mt-2 text-[0.8125rem] leading-[1.9] text-ink-soft">
                      {lang === "ja" ? stratum.detailJa : stratum.detailEn}
                    </p>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>

      {/* ---- the cross-section: same indicator, read across scenarios ---- */}
      <div className="mt-14">
        <h3 className="t-mono text-ink">{L.indicators}</h3>

        {/* On a phone the comparison is stacked: one indicator, then each
            option under it. A horizontally scrolling table is the wrong
            shape for a column of thumb-width, and it drags the whole page
            sideways. The table below takes over from the small breakpoint. */}
        <ul className="mt-4 border-t border-rule sm:hidden">
          {keys.map((key) => {
            const label = scenarios
              .flatMap((s) => s.indicators)
              .find((i) => i.key === key);
            return (
              <li key={key} className="rule-b py-5">
                <h4 className="t-mono text-ink-faint">
                  {label
                    ? lang === "ja"
                      ? label.labelJa
                      : label.labelEn
                    : key}
                </h4>
                <dl className="mt-3">
                  {scenarios.map((scenario) => {
                    const indicator = scenario.indicators.find(
                      (i) => i.key === key,
                    );
                    if (!indicator) return null;
                    const dir = DIRECTION_LABEL[indicator.direction];
                    return (
                      <div
                        key={scenario.id}
                        className="flex gap-3 py-1.5"
                      >
                        <dt className="t-mono w-4 shrink-0 text-[var(--gold)]">
                          {scenario.id}
                        </dt>
                        <dd className="min-w-0 text-[0.8125rem] leading-[1.8] text-ink-soft">
                          <span
                            className="t-display mr-2 text-[1rem]"
                            style={{
                              color:
                                indicator.direction === "up"
                                  ? "var(--olive)"
                                  : indicator.direction === "down"
                                    ? "var(--ink)"
                                    : "var(--ink-faint)",
                            }}
                            aria-hidden
                          >
                            {DIRECTION_GLYPH[indicator.direction]}
                          </span>
                          <span className="sr-only">
                            {lang === "ja" ? dir.ja : dir.en} —{" "}
                          </span>
                          {lang === "ja" ? indicator.noteJa : indicator.noteEn}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 hidden w-full overflow-x-auto sm:block">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <caption className="sr-only">
              {lang === "ja"
                ? "選択肢ごとの指標の方向の比較"
                : "Indicator directions compared across options"}
            </caption>
            <thead>
              <tr className="rule-b rule-t">
                <th scope="col" className="t-mono py-3 pr-4 font-normal">
                  {lang === "ja" ? "指標" : "Indicator"}
                </th>
                {scenarios.map((scenario) => (
                  <th
                    key={scenario.id}
                    scope="col"
                    className="t-mono px-3 py-3 font-normal"
                  >
                    {scenario.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const label = scenarios
                  .flatMap((s) => s.indicators)
                  .find((i) => i.key === key);
                return (
                  <tr key={key} className="rule-b align-top">
                    <th
                      scope="row"
                      className="py-4 pr-4 text-[0.875rem] font-normal"
                    >
                      {label
                        ? lang === "ja"
                          ? label.labelJa
                          : label.labelEn
                        : key}
                    </th>
                    {scenarios.map((scenario) => {
                      const indicator = scenario.indicators.find(
                        (i) => i.key === key,
                      );
                      if (!indicator) {
                        return (
                          <td
                            key={scenario.id}
                            className="px-3 py-4 text-ink-faint"
                          >
                            —
                          </td>
                        );
                      }
                      const dir = DIRECTION_LABEL[indicator.direction];
                      return (
                        <td key={scenario.id} className="px-3 py-4">
                          <span
                            className="t-display text-[1.125rem]"
                            style={{
                              color:
                                indicator.direction === "up"
                                  ? "var(--olive)"
                                  : indicator.direction === "down"
                                    ? "var(--ink)"
                                    : "var(--ink-faint)",
                            }}
                            aria-hidden
                          >
                            {DIRECTION_GLYPH[indicator.direction]}
                          </span>
                          <span className="sr-only">
                            {lang === "ja" ? dir.ja : dir.en}
                          </span>
                          <p className="mt-1 max-w-[16rem] text-[0.8125rem] leading-[1.8] text-ink-faint">
                            {lang === "ja"
                              ? indicator.noteJa
                              : indicator.noteEn}
                          </p>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
