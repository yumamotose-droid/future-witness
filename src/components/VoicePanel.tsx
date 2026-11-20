"use client";

import type { Lang, Scenario, Voice } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";
import { Stamp } from "./Stamp";

/**
 * The 2050 testimony.
 *
 * Set in the display face at reading size with generous leading, because this
 * is the one place on the page where the reader is meant to slow down. The
 * hypothetical stamp sits at the head of every entry and the frame is restated
 * in words underneath — a narrative is the easiest thing on this page to
 * mistake for a forecast, so it carries the heaviest labelling.
 */
export function VoicePanel({
  scenarios,
  voices,
  activeVoice,
  lang,
  narration,
}: {
  scenarios: Scenario[];
  voices: Voice[];
  activeVoice: string | null;
  lang: Lang;
  narration: {
    supported: boolean;
    speakingId: string | null;
    speak: (id: string, text: string) => void;
    stop: () => void;
  };
}) {
  const L = t(lang);
  if (voices.length === 0) return null;

  return (
    <section className="rule-t pt-8">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-4">
          <span className="t-mono text-ink">MIRAI</span>
          <span className="t-mono-plain text-ink-faint">
            {lang === "ja"
              ? "2050年を生きる一人の生活"
              : "One life lived in 2050"}
          </span>
        </div>
        <span className="t-mono text-[var(--gold)]">
          {lang === "ja" ? "仮想シナリオ" : "hypothetical"}
        </span>
      </header>

      <p className="mt-3 max-w-[42rem] text-[0.875rem] leading-[1.95] text-ink-soft">
        {lang === "ja"
          ? "以下はすべて、その選択がなされた世界で暮らす一人の架空の人物の語りです。予測ではなく、設定された条件のもとでの仮想です。統計の代わりに使わないでください。"
          : "Each passage below is a fictional person speaking from inside a world where that choice was made. It is a conditional hypothetical, not a prediction, and it is not a substitute for the evidence."}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
        {scenarios.map((scenario) => {
          const voice = voices.find((v) => v.scenarioId === scenario.id);
          if (!voice) return null;
          const speaking = narration.speakingId === scenario.id;
          const streaming = activeVoice === scenario.id;
          return (
            <figure key={scenario.id} className="flex flex-col">
              <figcaption className="rule-b flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-3">
                <Stamp kind="hypothetical" lang={lang} />
                <span className="t-display text-[1rem]">
                  {lang === "ja"
                    ? voice.witness.nameJa
                    : voice.witness.nameEn}
                </span>
                <span className="t-mono-plain text-ink-faint">
                  {voice.witness.age}
                  {lang === "ja" ? "歳" : " yrs"} ·{" "}
                  {lang === "ja"
                    ? voice.witness.placeJa
                    : voice.witness.placeEn}
                </span>
              </figcaption>

              <blockquote
                className={`t-display mt-5 text-[0.9375rem] leading-[2.1] text-ink${
                  streaming ? " caret" : ""
                }`}
              >
                {voice.body}
              </blockquote>

              <p className="t-mono-plain mt-4 text-ink-faint">
                {scenario.id} ·{" "}
                {lang === "ja" ? scenario.nameJa : scenario.nameEn}
              </p>

              {narration.supported ? (
                <button
                  type="button"
                  className="btn no-print mt-4 self-start"
                  onClick={() =>
                    speaking
                      ? narration.stop()
                      : narration.speak(scenario.id, voice.body)
                  }
                  disabled={streaming}
                >
                  {speaking ? L.stopListening : L.listen}
                </button>
              ) : null}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
