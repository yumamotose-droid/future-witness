"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AgentId } from "@/lib/types";
import { Stage } from "./Stage";
import { useVoicePlayer } from "@/hooks/useVoicePlayer";

/**
 * The voice, and the controls for it.
 *
 * One player for the whole page. Four agents must not talk at once — the
 * brief is explicit — and the simplest way to guarantee that is for there to
 * be one thing that can be speaking. Asking it to speak while it is speaking
 * stops the first passage.
 *
 * The console appears only once something has been said, so a reader who
 * never presses play never meets it. Everything it offers is also available
 * as text on the page; speech is an enhancement and says so when it fails.
 */

type VoiceApi = ReturnType<typeof useVoicePlayer>;

const VoiceContext = createContext<VoiceApi | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const player = useVoicePlayer();
  return <VoiceContext.Provider value={player}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceApi {
  const value = useContext(VoiceContext);
  if (!value) throw new Error("useVoice must be used inside VoiceProvider");
  return value;
}

const AGENT_LABEL: Record<AgentId, { ja: string; role: string }> = {
  MIRAI: { ja: "ミライ", role: "2050年を生きる一人" },
  EVIDENCE: { ja: "エビデンス", role: "確認できることだけを述べる" },
  COUNTER: { ja: "カウンター", role: "すべてに反証する" },
  CHRONOS: { ja: "クロノス", role: "時間を分岐させる" },
};

export function VoiceConsole() {
  const voice = useVoice();
  const { status, agent, segments, spokenIndex, level, error } = voice;

  const open = status !== "idle" || error !== null;
  const speaking = status === "speaking";
  const who = agent ?? "MIRAI";
  const label = AGENT_LABEL[who];

  // The passage, with the sounding segment marked. This is the pairing the
  // brief asks for: the words lit are the words being said, because both come
  // from the same string.
  const transcript = useMemo(
    () =>
      segments.map((text, index) => (
        <span
          key={`${index}-${text.slice(0, 8)}`}
          className={index === spokenIndex ? "vc__said is-now" : "vc__said"}
        >
          {text}
        </span>
      )),
    [segments, spokenIndex],
  );

  if (!open) return null;

  return (
    <aside className="vc no-print" aria-live="polite">
      <div className="vc__form" aria-hidden="true">
        <Stage agent={who} level={level} active={speaking} label="" />
      </div>

      <div className="vc__body">
        <p className="vc__who">
          <span className="t-mono">{who}</span>
          <span className="vc__role">{label.role}</span>
        </p>

        {error ? (
          <p className="vc__error">
            {error}
            <span className="vc__note">本文は画面でお読みいただけます。</span>
          </p>
        ) : (
          <p className="vc__text">
            {status === "loading" && spokenIndex < 0 ? (
              <span className="vc__waiting">声を用意しています…</span>
            ) : (
              transcript
            )}
          </p>
        )}

        <div className="vc__controls">
          {speaking ? (
            <button type="button" className="vc__btn" onClick={voice.pause}>
              一時停止
            </button>
          ) : status === "paused" ? (
            <button type="button" className="vc__btn" onClick={voice.resume}>
              再開
            </button>
          ) : null}

          <button
            type="button"
            className="vc__btn"
            onClick={() => {
              const passage = segments.join("");
              if (passage && agent) void voice.play(passage, agent);
            }}
            disabled={segments.length === 0 || !agent}
          >
            もう一度
          </button>

          <button type="button" className="vc__btn" onClick={voice.stop}>
            停止
          </button>

          <button
            type="button"
            className="vc__btn"
            onClick={voice.toggleMuted}
            aria-pressed={voice.muted}
          >
            {voice.muted ? "音を出す" : "消音"}
          </button>

          <label className="vc__slider">
            <span>音量</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={voice.volume}
              onChange={(event) => voice.setVolume(Number(event.target.value))}
            />
          </label>

          <label className="vc__slider">
            <span>速さ</span>
            <input
              type="range"
              min={0.75}
              max={1.5}
              step={0.05}
              value={voice.rate}
              onChange={(event) => voice.setRate(Number(event.target.value))}
            />
            <span className="vc__rate">{voice.rate.toFixed(2)}×</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
