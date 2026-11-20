"use client";

import type { Lang, Statement } from "@/lib/types";
import { AGENT_META } from "@/lib/i18n/dictionary";
import { ClaimList } from "./ClaimList";

export function StatementBlock({
  statement,
  lang,
  citationIndex,
}: {
  statement: Statement;
  lang: Lang;
  citationIndex: Map<string, number>;
}) {
  const meta = AGENT_META[statement.agent];
  return (
    <section className="anim-settle rule-t pt-8">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="t-mono text-ink">{statement.agent}</span>
        <span className="t-mono-plain text-ink-faint">
          {lang === "ja" ? meta.roleJa : meta.roleEn}
        </span>
      </header>
      <h3 className="t-display mt-3 max-w-[40rem] text-[1.25rem] leading-[1.6]">
        {lang === "ja" ? statement.titleJa : statement.titleEn}
      </h3>
      <ClaimList
        claims={statement.claims}
        lang={lang}
        citationIndex={citationIndex}
      />

      {statement.selfCritique ? (
        <div className="mt-10 border-l-2 border-[var(--gold)] pl-5 sm:pl-6">
          <h4 className="t-mono text-[var(--gold)]">
            {lang === "ja"
              ? "このシステム自身への反証"
              : "An objection to this system itself"}
          </h4>
          <ClaimList
            claims={[statement.selfCritique]}
            lang={lang}
            citationIndex={citationIndex}
          />
        </div>
      ) : null}
    </section>
  );
}
