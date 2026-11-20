"use client";

import type { Claim, Lang } from "@/lib/types";
import { Stamp } from "./Stamp";

/**
 * One claim per row: the stamp sits in the margin, the sentence in the measure,
 * and the citations hang at the end as footnote markers that lead to the full
 * provenance block. Nothing is rendered as HTML — every string here is a React
 * text node.
 */
export function ClaimList({
  claims,
  lang,
  citationIndex,
}: {
  claims: Claim[];
  lang: Lang;
  citationIndex: Map<string, number>;
}) {
  return (
    <ul className="mt-5">
      {claims.map((claim, index) => (
        <li
          key={`${index}-${claim.text.slice(0, 12)}`}
          className="rule-b flex gap-4 py-4 sm:gap-6"
        >
          <span className="pt-1">
            <Stamp kind={claim.kind} lang={lang} pressed />
          </span>
          <p
            className="claim max-w-[46rem] text-[0.9375rem] leading-[1.95]"
            data-kind={claim.kind}
          >
            {claim.text}
            {claim.sourceIds.length > 0 ? (
              <span className="ml-1 whitespace-nowrap">
                {claim.sourceIds.map((id) => {
                  const n = citationIndex.get(id);
                  if (!n) return null;
                  return (
                    <a
                      key={id}
                      href={`#source-${id.split("#")[0]}`}
                      className="t-mono ml-1 align-super text-[0.5625rem] text-[var(--gold)] hover:underline"
                      title={id}
                    >
                      [{n}]
                    </a>
                  );
                })}
              </span>
            ) : null}
            {claim.downgradedFrom ? (
              <span className="t-mono ml-2 text-ink-faint">
                {lang === "ja"
                  ? "← 出典が確認できず格下げ"
                  : "← downgraded, citation unverifiable"}
              </span>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
