"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Lang, Scenario, Voice } from "@/lib/types";
import { t } from "@/lib/i18n/dictionary";
import { Stamp } from "./Stamp";
import { useVoice } from "./VoiceConsole";

/**
 * The 2050 testimony.
 *
 * Set in the display face at reading size with generous leading, because this
 * is the one place on the page where the reader is meant to slow down. The
 * hypothetical stamp sits at the head of every entry and the frame is restated
 * in words underneath — a narrative is the easiest thing on this page to
 * mistake for a forecast, so it carries the heaviest labelling.
 */
/**
 * Reveals the testimony at reading pace.
 *
 * The deliberation starts as soon as the page loads, so by the time a reader
 * has recorded their position at the gate the narrative has already arrived in
 * full. Rendering it instantly threw away the one moment on the page that is
 * meant to slow somebody down. This advances the visible text at roughly the
 * speed it was streamed, whether it is still arriving or was buffered while
 * the reader was elsewhere.
 *
 * It paces presentation, not generation: the words were produced and verified
 * before any of them appeared.
 */
const CHARS_PER_SECOND = 55;

const noSubscribe = () => () => {};

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    () => false,
  );
}

function useRevealed(body: string, streaming: boolean): string {
  const reduce = usePrefersReducedMotion();
  const [count, setCount] = useState(0);
  const frame = useRef<number | undefined>(undefined);
  const startedAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (reduce) return;
    const tick = (now: number) => {
      startedAt.current ??= now;
      const elapsed = (now - startedAt.current) / 1000;
      const next = Math.min(body.length, Math.ceil(elapsed * CHARS_PER_SECOND));
      setCount(next);
      if (next < body.length) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
    // Restart when the passage itself changes (a new run, or a language switch).
  }, [body, reduce]);

  // Reduced motion gets the whole passage at once; otherwise never show more
  // than has actually arrived from the server.
  if (reduce) return body;
  return body.slice(0, streaming ? Math.min(count, body.length) : count);
}

function Testimony({
  body,
  streaming,
}: {
  body: string;
  streaming: boolean;
}) {
  const shown = useRevealed(body, streaming);
  const writing = shown.length < body.length;
  return (
    <blockquote
      className={`t-display mt-5 text-[0.9375rem] leading-[2.1] text-ink${
        writing ? " caret" : ""
      }`}
      aria-live="off"
    >
      {shown}
      {/* The whole passage stays in the accessibility tree and in the page
          source, so a screen reader and the decision record are never given a
          half-written sentence. */}
      {writing ? <span className="sr-only">{body.slice(shown.length)}</span> : null}
    </blockquote>
  );
}

export function VoicePanel({
  scenarios,
  voices,
  activeVoice,
  lang,
  runLang,
}: {
  scenarios: Scenario[];
  voices: Voice[];
  activeVoice: string | null;
  lang: Lang;
  /** The language the run was generated in. */
  runLang: Lang | null;
}) {
  const L = t(lang);
  const voicePlayer = useVoice();
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
          // Speaking is now a property of the one player, not of this panel:
          // whichever passage it is reading is the one that is sounding.
          const spokenHere = voicePlayer.segments.join("");
          const streaming = activeVoice === scenario.id;
          const needsOther = runLang !== null && runLang !== lang;
          const body =
            needsOther && voice.bodyAlt ? voice.bodyAlt : voice.body;
          // A live model writes one language. Rather than machine-translating
          // a testimony, we show it as generated and name the language.
          const untranslated = needsOther && !voice.bodyAlt;
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

              <Testimony body={body} streaming={streaming} />

              {untranslated ? (
                <p className="t-mono mt-3 text-ink-faint">
                  {lang === "en"
                    ? "Generated in Japanese; shown as written."
                    : "英語で生成されたため、そのまま表示しています。"}
                </p>
              ) : null}

              <p className="t-mono-plain mt-4 text-ink-faint">
                {scenario.id} ·{" "}
                {lang === "ja" ? scenario.nameJa : scenario.nameEn}
              </p>

              <button
                type="button"
                className="btn no-print mt-4 self-start"
                onClick={() => {
                  const reading =
                    spokenHere === body.replace(/\s+/g, " ").trim() &&
                    voicePlayer.status !== "idle";
                  if (reading) voicePlayer.stop();
                  else void voicePlayer.play(body, "MIRAI");
                }}
                disabled={streaming}
              >
                {spokenHere === body.replace(/\s+/g, " ").trim() &&
                voicePlayer.status !== "idle"
                  ? L.stopListening
                  : L.listen}
              </button>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
