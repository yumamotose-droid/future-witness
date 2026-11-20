"use client";

import type { AuditReport, Lang } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";
import { StampLegend } from "./Stamp";

/**
 * The verification record.
 *
 * This panel is the project's central claim made checkable: it reports what the
 * verifier did on this run, including the numbers that make the system look
 * worse. A rejected-citation count above zero means the model tried to cite
 * something that does not exist and was stopped — and showing that is more
 * convincing than never mentioning it.
 */
export function AuditPanel({
  audit,
  lang,
}: {
  audit: AuditReport;
  lang: Lang;
}) {
  const L = t(lang);
  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    { label: L.auditClaims, value: String(audit.claimsTotal) },
    {
      label: L.auditCitations,
      value: String(audit.citationsChecked),
    },
    {
      label: L.auditRejected,
      value: audit.citationsRejected
        ? `${audit.citationsRejected} — ${audit.rejectedIds.join(", ")}`
        : "0",
      emphasis: audit.citationsRejected > 0,
    },
    {
      label: L.auditDowngrades,
      value: String(audit.downgrades.length),
      emphasis: audit.downgrades.length > 0,
    },
    {
      label: L.auditDivergence,
      value: `${(audit.scenarioDivergence * 100).toFixed(0)}%`,
    },
    { label: L.auditSources, value: String(audit.sourcesUsed.length) },
    { label: L.auditModel, value: audit.model },
    { label: L.auditElapsed, value: `${(audit.elapsedMs / 1000).toFixed(1)}s` },
  ];

  return (
    <section className="rule-t pt-8">
      <h2 className="t-display text-[1.5rem]">{L.audit}</h2>
      <p className="mt-3 max-w-[42rem] text-[0.875rem] leading-[1.95] text-ink-soft">
        {L.auditBody}
      </p>

      <dl className="mt-8 grid gap-x-10 border-t border-rule sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rule-b flex flex-wrap items-baseline justify-between gap-3 py-3"
          >
            <dt className="t-mono-plain text-ink-faint">{row.label}</dt>
            <dd
              className="t-mono-plain max-w-[22rem] text-right"
              style={{
                color: row.emphasis ? "var(--gold)" : "var(--ink)",
              }}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4">
        <StampLegend lang={lang} />
      </div>

      <ul className="t-mono-plain mt-6 flex flex-wrap gap-x-6 gap-y-2 text-ink-faint">
        <li>証 {audit.byKind.verified}</li>
        <li>推 {audit.byKind.inference}</li>
        <li>仮 {audit.byKind.hypothetical}</li>
        <li>？ {audit.byKind.unknown}</li>
      </ul>

      {audit.downgrades.length > 0 ? (
        <ul className="mt-6 border-t border-rule">
          {audit.downgrades.map((d, i) => (
            <li
              key={`${d.statementId}-${i}`}
              className="rule-b py-3 text-[0.8125rem] leading-[1.9] text-ink-soft"
            >
              <span className="t-mono mr-3 text-[var(--gold)]">
                {d.from} → {d.to}
              </span>
              {d.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
