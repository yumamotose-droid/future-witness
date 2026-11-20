"use client";

import { useMemo, useState } from "react";
import type { DeliberationResult, Lang, SessionRecord } from "@/lib/types";
import { buildReportMarkdown } from "@/lib/report/markdown";
import { t } from "@/lib/i18n/dictionary";

export function ReportPanel({
  session,
  result,
  lang,
  openQuestions,
  onOpenQuestionsChange,
}: {
  session: SessionRecord;
  result: DeliberationResult;
  lang: Lang;
  openQuestions: string;
  onOpenQuestionsChange: (value: string) => void;
}) {
  const L = t(lang);
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(
    () =>
      buildReportMarkdown(
        {
          ...session,
          openQuestions: openQuestions
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        },
        result,
        lang,
      ),
    [session, result, lang, openQuestions],
  );

  function download() {
    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `future-witness-${session.id}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rule-t pt-8">
      <h2 className="t-display text-[1.5rem]">{L.report}</h2>

      <div className="mt-6 max-w-[42rem]">
        <label htmlFor="open-questions" className="t-mono text-ink-faint">
          {L.openQuestions}
        </label>
        <textarea
          id="open-questions"
          rows={3}
          value={openQuestions}
          maxLength={1200}
          onChange={(event) => onOpenQuestionsChange(event.target.value)}
          placeholder={L.openQuestionsPlaceholder}
          className="field mt-2 resize-y"
        />
      </div>

      <div className="no-print mt-6 flex flex-wrap gap-4">
        <button type="button" className="btn" data-variant="primary" onClick={download}>
          {L.downloadReport}
        </button>
        <button type="button" className="btn" onClick={copy}>
          {copied ? (lang === "ja" ? "コピーしました" : "Copied") : L.copyReport}
        </button>
      </div>

      <details className="mt-8">
        <summary className="t-mono tap cursor-pointer text-ink-faint hover:text-ink">
          {lang === "ja" ? "レポートの中身を見る" : "Preview the record"}
        </summary>
        <pre className="t-mono-plain mt-4 max-h-[26rem] overflow-auto border border-rule bg-paper-deep p-5 text-[0.75rem] leading-[1.8] whitespace-pre-wrap text-ink-soft">
          {markdown}
        </pre>
      </details>
    </section>
  );
}
