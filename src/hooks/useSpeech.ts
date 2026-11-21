"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/types";

/**
 * Web Speech API wrapper for dictation.
 *
 * Dictation is progressive enhancement: the hook reports `supported: false`
 * on browsers without it and the UI hides the control rather than showing
 * something that silently does nothing. Recognition runs entirely in the
 * user's browser — no audio is sent to this server.
 *
 * Reading aloud used to live here too, through `speechSynthesis`. It was
 * replaced by `useVoicePlayer`: the browser's built-in voices are a system
 * setting rather than a casting decision, and this piece needs four voices
 * that belong to it.
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

