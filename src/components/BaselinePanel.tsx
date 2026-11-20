"use client";

import { useState } from "react";
import type { AuditReport, Lang } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";

interface BaselineResult {
  mode: "live" | "scripted";
  model: string;
  text: string;
  disclosureJa?: string;
  disclosureEn?: string;
}

/**
 * The comparison the sceptic would run anyway.
 *
 * Shipping this is a risk — a strong single-chat answer undercuts the project's
 * pitch — but a claim the reader cannot check is worth less than a claim that
 * survives checking. What the comparison shows is not that the baseline is
 * stupid; it is that the baseline has no mechanism for the four things listed
 * beside it.
 */
export function BaselinePanel({
  question,
  lang,
  audit,
}: {
  question: string;
  lang: Lang;
  audit: AuditReport | null;
}) {
  const L = t(lang);
  const [result, setResult] = useState<BaselineResult | null>(null);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    setRunning(true);
    setFailed(false);
    try {
      const response = await fetch("/api/baseline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setResult((await response.json()) as BaselineResult);
    } catch {
      setFailed(true);
    } finally {
      setRunning(false);
    }
  }

  const differences = [
    {
      ja: "出典が存在するかを照合していない",
      en: "No citation is checked against anything",
      ours: audit
        ? lang === "ja"
          ? `この審議では${audit.citationsChecked}件を照合し、${audit.citationsRejected}件を削除`
          : `This run resolved ${audit.citationsChecked} citations and removed ${audit.citationsRejected}`
        : "",
    },
    {
      ja: "事実・推論・仮想・不明が同じ文体で並ぶ",
      en: "Fact, inference, hypothetical and unknown arrive in one voice",
      ours: audit
        ? lang === "ja"
          ? `証${audit.byKind.verified} / 推${audit.byKind.inference} / 仮${audit.byKind.hypothetical} / ？${audit.byKind.unknown}`
          : `verified ${audit.byKind.verified} / inference ${audit.byKind.inference} / hypothetical ${audit.byKind.hypothetical} / unknown ${audit.byKind.unknown}`
        : "",
    },
    {
      ja: "反証する役が存在せず、最後は中庸にまとまる",
      en: "No adversary; it settles on balance and a recommendation",
      ours:
        lang === "ja"
          ? "COUNTERが自分自身の演出まで攻撃する"
          : "COUNTER attacks even our own narration",
    },
    {
      ja: "読む前と読んだ後の立場を記録しない",
      en: "Nothing is recorded before and after",
      ours:
        lang === "ja"
          ? "事前・事後の立場と確信を記録する"
          : "Positions and certainty are recorded on both sides",
    },
  ];

  return (
    <section className="rule-t pt-8">
      <h2 className="t-display text-[1.5rem]">{L.baselineTitle}</h2>
      <p className="mt-3 max-w-[42rem] text-[0.875rem] leading-[1.95] text-ink-soft">
        {L.baselineBody}
      </p>

      {!result ? (
        <button
          type="button"
          className="btn no-print mt-6"
          onClick={run}
          disabled={running}
        >
          {running ? L.baselineRunning : L.runBaseline}
        </button>
      ) : null}

      {failed ? (
        <p className="mt-4 text-[0.875rem] text-[var(--gold)]">
          {lang === "ja"
            ? "比較の実行に失敗しました。もう一度試してください。"
            : "The comparison failed to run. Please try again."}
        </p>
      ) : null}

      {result ? (
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <h3 className="t-mono text-ink-faint">
              {lang === "ja" ? "通常のチャット" : "An ordinary chat"}
            </h3>
            <p className="t-mono-plain mt-2 text-ink-faint">{result.model}</p>
            <p className="mt-5 max-w-[34rem] text-[0.9375rem] leading-[2] text-ink-soft">
              {result.text}
            </p>
            {result.disclosureJa ? (
              <p className="mt-5 max-w-[34rem] text-[0.8125rem] leading-[1.9] text-[var(--gold)]">
                {lang === "ja" ? result.disclosureJa : result.disclosureEn}
              </p>
            ) : null}
          </div>
          <div>
            <h3 className="t-mono text-ink-faint">
              {lang === "ja"
                ? "そこに無いもの / ここにあるもの"
                : "What it lacks / what this has"}
            </h3>
            <ul className="mt-5 border-t border-rule">
              {differences.map((item) => (
                <li key={item.ja} className="rule-b py-4">
                  <p className="text-[0.875rem] leading-[1.9]">
                    {lang === "ja" ? item.ja : item.en}
                  </p>
                  {item.ours ? (
                    <p className="t-mono-plain mt-2 text-[var(--olive)]">
                      → {item.ours}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-[32rem] text-[0.8125rem] leading-[1.9] text-ink-faint">
              {lang === "ja"
                ? "通常のチャットの回答が劣っていると言いたいのではありません。読みやすく、妥当なことも多い。違いは、その妥当さを読者が確かめる手段があるかどうかです。"
                : "The point is not that the ordinary answer is bad — it is often readable and reasonable. The difference is whether the reader has any way to check that."}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
