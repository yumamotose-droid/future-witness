"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentId } from "@/lib/types";
import { leadSegment, segmentForSpeech } from "@/lib/voice/segment";

/**
 * Playback for the spoken passages.
 *
 * Three things shape this hook.
 *
 * A passage is spoken segment by segment. The first segment is fetched and
 * played while the next is still being generated, so the voice starts in
 * about two seconds instead of nine. `spokenIndex` says which segment is
 * sounding, which is what lets the text highlight follow the voice.
 *
 * Nothing plays until the reader asks for it. Browsers require a gesture
 * before audio, and iOS requires the AudioContext to be created or resumed
 * inside that gesture — so the context is opened on the first play() call,
 * which only ever runs from a click.
 *
 * Speech is an enhancement. Every failure path leaves the text on screen and
 * reports itself; nothing here can make the page unusable.
 */

export type VoiceStatus = "idle" | "loading" | "speaking" | "paused" | "error";

export interface VoicePlayerState {
  readonly status: VoiceStatus;
  /** Which segment is sounding, or -1. */
  readonly spokenIndex: number;
  readonly segments: readonly string[];
  readonly agent: AgentId | null;
  /** 0–1, for a visual that answers the voice. Not a waveform. */
  readonly level: number;
  readonly error: string | null;
  readonly muted: boolean;
  readonly volume: number;
  readonly rate: number;
}

const DEFAULTS = { volume: 0.9, rate: 1 };

export function useVoicePlayer() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [spokenIndex, setSpokenIndex] = useState(-1);
  const [segments, setSegments] = useState<readonly string[]>([]);
  const [agent, setAgent] = useState<AgentId | null>(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULTS.volume);
  const [rate, setRateState] = useState(DEFAULTS.rate);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  /** Bumped on every stop so a late fetch from a previous passage is dropped. */
  const runRef = useRef(0);
  const urlsRef = useRef<string[]>([]);

  const releaseUrls = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  }, []);

  const stopMeter = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    runRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    stopMeter();
    releaseUrls();
    setStatus("idle");
    setSpokenIndex(-1);
  }, [releaseUrls, stopMeter]);

  useEffect(() => stop, [stop]);

  /** Open the audio graph. Must be called from inside a user gesture. */
  const ensureGraph = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      // Lets iOS play inline rather than taking over the screen.
      audio.setAttribute("playsinline", "");
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    audio.volume = muted ? 0 : volume;
    audio.playbackRate = rate;

    if (!contextRef.current) {
      type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
      if (Ctor) {
        try {
          const context = new Ctor();
          const source = context.createMediaElementSource(audio);
          const analyser = context.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.82;
          source.connect(analyser);
          analyser.connect(context.destination);
          contextRef.current = context;
          analyserRef.current = analyser;
        } catch {
          // Without an analyser the voice still plays; only the visual loses
          // its input, and the stage falls back to a resting animation.
          contextRef.current = null;
          analyserRef.current = null;
        }
      }
    }
    void contextRef.current?.resume().catch(() => {});
    return audio;
  }, [muted, rate, volume]);

  const runMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const sample of data) {
        const centred = (sample - 128) / 128;
        sum += centred * centred;
      }
      // Root mean square, lifted into a range a visual can use directly.
      const rms = Math.sqrt(sum / data.length);
      setLevel(Math.min(1, rms * 3.2));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  const fetchSegment = useCallback(
    async (text: string, forAgent: AgentId, signal: AbortSignal): Promise<string> => {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, agent: forAgent }),
        signal,
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? "音声を生成できませんでした。");
      }
      const url = URL.createObjectURL(await response.blob());
      urlsRef.current.push(url);
      return url;
    },
    [],
  );

  const playUrl = useCallback(
    (audio: HTMLAudioElement, url: string) =>
      new Promise<void>((resolve, reject) => {
        const done = () => {
          audio.removeEventListener("ended", done);
          audio.removeEventListener("error", failed);
          resolve();
        };
        const failed = () => {
          audio.removeEventListener("ended", done);
          audio.removeEventListener("error", failed);
          reject(new Error("再生できませんでした。"));
        };
        audio.addEventListener("ended", done);
        audio.addEventListener("error", failed);
        audio.src = url;
        audio.play().catch(reject);
      }),
    [],
  );

  /**
   * Speak a passage. Call from a click.
   *
   * The next segment is requested while the current one plays, so generation
   * and playback overlap; by the second segment the fetch is usually already
   * finished and the voice does not break.
   */
  const play = useCallback(
    async (passage: string, forAgent: AgentId) => {
      stop();
      const run = runRef.current;
      const parts = leadSegment(segmentForSpeech(passage));
      if (parts.length === 0) return;

      const audio = ensureGraph();
      const controller = new AbortController();
      setSegments(parts);
      setAgent(forAgent);
      setError(null);
      setStatus("loading");

      try {
        let pending = fetchSegment(parts[0], forAgent, controller.signal);
        for (let i = 0; i < parts.length; i++) {
          const url = await pending;
          if (runRef.current !== run) return;
          pending =
            i + 1 < parts.length
              ? fetchSegment(parts[i + 1], forAgent, controller.signal)
              : Promise.resolve("");
          // A rejected lookahead must not surface as an unhandled rejection
          // if playback is stopped before we await it.
          pending.catch(() => {});

          setSpokenIndex(i);
          setStatus("speaking");
          if (frameRef.current === null) runMeter();
          await playUrl(audio, url);
          if (runRef.current !== run) return;
        }
        stopMeter();
        setStatus("idle");
        setSpokenIndex(-1);
      } catch (cause) {
        if (runRef.current !== run) return;
        controller.abort();
        stopMeter();
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "音声を再生できませんでした。");
      }
    },
    [ensureGraph, fetchSegment, playUrl, runMeter, stop, stopMeter],
  );

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    audio.pause();
    stopMeter();
    setStatus("paused");
  }, [stopMeter]);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    void contextRef.current?.resume().catch(() => {});
    void audio.play().then(() => {
      setStatus("speaking");
      if (frameRef.current === null) runMeter();
    });
  }, [runMeter]);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const setRate = useCallback((next: number) => {
    const clamped = Math.min(1.5, Math.max(0.75, next));
    setRateState(clamped);
    if (audioRef.current) audioRef.current.playbackRate = clamped;
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((wasMuted) => {
      const next = !wasMuted;
      if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
      return next;
    });
  }, [volume]);

  const state: VoicePlayerState = {
    status,
    spokenIndex,
    segments,
    agent,
    level,
    error,
    muted,
    volume,
    rate,
  };

  return { ...state, play, pause, resume, stop, setVolume, setRate, toggleMuted };
}
