"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/types";

/**
 * Web Speech API wrappers.
 *
 * Both features are progressive enhancement: the hooks report `supported:
 * false` on browsers without them and the UI hides the controls rather than
 * showing something that silently does nothing. Recognition runs entirely in
 * the user's browser — no audio is sent to this server.
 *
 * Support is read through `useSyncExternalStore` rather than an effect, so the
 * server render and the first client render agree (both "unsupported") and the
 * controls appear on the first commit after hydration without a cascading
 * state update.
 */

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};
const falseSnapshot = () => false;

function useFeature(probe: () => boolean): boolean {
  return useSyncExternalStore(noopSubscribe, probe, falseSnapshot);
}

/**
 * Dictation. The transcript is pushed to the caller as it arrives rather than
 * stored here, so the consuming form field is the single source of truth.
 */
export function useDictation(lang: Lang, onTranscript: (text: string) => void) {
  const supported = useFeature(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    },
    [],
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = lang === "ja" ? "ja-JP" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0]?.transcript ?? "";
      }
      onTranscript(text);
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [lang, onTranscript]);

  return { supported, listening, start, stop };
}

export function useNarration(lang: Lang) {
  const supported = useFeature(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (id: string, text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window))
        return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "ja" ? "ja-JP" : "en-US";
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [lang],
  );

  return { supported, speakingId, speak, stop };
}
