"use client";

import { useState } from "react";
import type { Lang, Option, Stance } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";

/**
 * The instrument.
 *
 * The same form is shown before and after the deliberation, and the difference
 * between the two is the only thing this project measures about itself. It is
 * never pre-filled from the AI's output and the system has no preferred answer,
 * so there is no default selection.
 */
export function StanceForm({
  options,
  lang,
  when,
  initial,
  onSubmit,
  onSkip,
}: {
  options: Option[];
  lang: Lang;
  when: "before" | "after";
  initial?: Stance;
  onSubmit: (stance: Stance) => void;
  onSkip?: () => void;
}) {
  const L = t(lang);
  const [optionId, setOptionId] = useState(initial?.optionId ?? "");
  const [confidence, setConfidence] = useState(initial?.confidence ?? 50);
  const [reason, setReason] = useState(initial?.reason ?? "");

  const fieldId = `stance-${when}`;

  return (
    <section className="rule-t pt-8">
      <h2 className="t-display text-[1.5rem]">
        {when === "before" ? L.stanceBeforeTitle : L.stanceAfterTitle}
      </h2>
      <p className="mt-3 max-w-[40rem] text-[0.875rem] leading-[1.95] text-ink-soft">
        {when === "before" ? L.stanceBeforeBody : L.stanceAfterBody}
      </p>

      <fieldset className="mt-8">
        <legend className="t-mono text-ink-faint">{L.options}</legend>
        <ul className="mt-4 border-t border-rule">
          {options.map((option) => (
            <li key={option.id} className="rule-b">
              <label className="flex cursor-pointer gap-4 py-4 sm:gap-6">
                <input
                  type="radio"
                  name={fieldId}
                  value={option.id}
                  checked={optionId === option.id}
                  onChange={() => setOptionId(option.id)}
                  className="mt-1.5 h-3.5 w-3.5 shrink-0 accent-[var(--olive)]"
                />
                <span className="min-w-0">
                  <span className="t-mono mr-3 text-[var(--gold)]">
                    {option.id}
                  </span>
                  <span className="t-display text-[1rem]">
                    {lang === "ja" ? option.labelJa : option.labelEn}
                  </span>
                  <span className="mt-2 block max-w-[42rem] text-[0.8125rem] leading-[1.9] text-ink-soft">
                    {lang === "ja" ? option.summaryJa : option.summaryEn}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="mt-8 max-w-[28rem]">
        <label
          htmlFor={`${fieldId}-confidence`}
          className="t-mono flex items-baseline justify-between text-ink-faint"
        >
          <span>{L.confidence}</span>
          <span className="t-mono-plain text-ink">{confidence}%</span>
        </label>
        <input
          id={`${fieldId}-confidence`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={confidence}
          onChange={(event) => setConfidence(Number(event.target.value))}
          // A 16px-tall range control is not draggable with a thumb.
          className="mt-3 h-11 w-full accent-[var(--olive)]"
        />
      </div>

      <div className="mt-8 max-w-[42rem]">
        <label htmlFor={`${fieldId}-reason`} className="t-mono text-ink-faint">
          {L.reasonLabel}
        </label>
        <textarea
          id={`${fieldId}-reason`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={600}
          placeholder={L.reasonPlaceholder}
          className="field mt-2 resize-y"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button
          type="button"
          className="btn"
          data-variant="primary"
          disabled={!optionId}
          onClick={() =>
            onSubmit({
              optionId,
              confidence,
              reason: reason.trim(),
              at: new Date().toISOString(),
            })
          }
        >
          {L.recordStance}
        </button>
        {onSkip ? (
          <button type="button" className="link t-mono-plain" onClick={onSkip}>
            {lang === "ja" ? "記録せずに読む" : "Read without recording"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
