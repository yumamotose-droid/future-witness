"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AuditReport,
  Framing,
  Lang,
  Option,
  Phase,
  RunMode,
  Scenario,
  Statement,
  StreamEvent,
  Voice,
  Witness,
} from "@/lib/types";

export interface Notice {
  code: string;
  messageJa: string;
  messageEn: string;
}

export interface DeliberationState {
  status: "idle" | "running" | "done" | "error";
  phase: Phase | null;
  mode: RunMode | null;
  model: string | null;
  runId: string | null;
  framing: Framing | null;
  options: Option[];
  statements: Statement[];
  scenarios: Scenario[];
  voices: Voice[];
  activeVoice: string | null;
  audit: AuditReport | null;
  notices: Notice[];
  error: Notice | null;
}

const INITIAL: DeliberationState = {
  status: "idle",
  phase: null,
  mode: null,
  model: null,
  runId: null,
  framing: null,
  options: [],
  statements: [],
  scenarios: [],
  voices: [],
  activeVoice: null,
  audit: null,
  notices: [],
  error: null,
};

/**
 * Consumes the deliberation event stream.
 *
 * Narrative text arrives as deltas and is appended in place, so the 2050
 * testimony writes itself onto the page at reading speed; everything else
 * arrives already verified and is appended whole. The reducer never mutates a
 * statement after it lands, which is what lets the record be trusted as a
 * record.
 */
export function useDeliberation() {
  const [state, setState] = useState<DeliberationState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  const apply = useCallback((event: StreamEvent) => {
    setState((prev) => {
      switch (event.type) {
        case "meta":
          return {
            ...prev,
            mode: event.mode,
            model: event.model,
            runId: event.runId,
          };
        case "phase":
          return { ...prev, phase: event.phase };
        case "framing":
          return { ...prev, framing: event.data };
        case "options":
          return { ...prev, options: event.data };
        case "statement":
          return { ...prev, statements: [...prev.statements, event.data] };
        case "scenarios":
          return { ...prev, scenarios: event.data };
        case "voice-start":
          return {
            ...prev,
            activeVoice: event.scenarioId,
            voices: [
              ...prev.voices.filter((v) => v.scenarioId !== event.scenarioId),
              {
                scenarioId: event.scenarioId,
                witness: event.witness as Witness,
                body: "",
              },
            ],
          };
        case "voice-delta":
          return {
            ...prev,
            voices: prev.voices.map((v) =>
              v.scenarioId === event.scenarioId
                ? { ...v, body: v.body + event.text }
                : v,
            ),
          };
        case "voice-end":
          return { ...prev, activeVoice: null };
        case "audit":
          return { ...prev, audit: event.data };
        case "notice":
          return {
            ...prev,
            notices: [
              ...prev.notices,
              {
                code: event.code,
                messageJa: event.messageJa,
                messageEn: event.messageEn,
              },
            ],
          };
        case "error":
          return {
            ...prev,
            status: "error",
            error: {
              code: event.code,
              messageJa: event.messageJa,
              messageEn: event.messageEn,
            },
          };
        case "done":
          return { ...prev, status: "done", phase: null };
        default:
          return prev;
      }
    });
  }, []);

  const start = useCallback(
    async (input: { question: string; lang: Lang; topicKey?: string }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ ...INITIAL, status: "running" });

      let response: Response;
      try {
        response = await fetch("/api/deliberate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
      } catch {
        setState((p) => ({
          ...p,
          status: "error",
          error: {
            code: "network",
            messageJa:
              "サーバーに接続できませんでした。通信状況を確認して、やり直してください。",
            messageEn:
              "Could not reach the server. Check your connection and try again.",
          },
        }));
        return;
      }

      if (!response.ok || !response.body) {
        let messageJa = "サーバーが応答を返しませんでした。";
        let messageEn = "The server returned no response.";
        let code = String(response.status);
        try {
          const body = await response.json();
          messageJa = body.error ?? messageJa;
          messageEn = body.errorEn ?? body.error ?? messageEn;
          code = body.code ?? code;
        } catch {
          /* non-JSON error body */
        }
        setState((p) => ({
          ...p,
          status: "error",
          error: { code, messageJa, messageEn },
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;
            try {
              apply(JSON.parse(line.slice(5).trim()) as StreamEvent);
            } catch {
              /* a partial frame is not fatal; the next read completes it */
            }
          }
        }
        setState((p) =>
          p.status === "running" ? { ...p, status: "done", phase: null } : p,
        );
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        setState((p) => ({
          ...p,
          status: "error",
          error: {
            code: "stream",
            messageJa:
              "審議の途中で接続が切れました。表示されているのは途中までの結果です。",
            messageEn:
              "The connection dropped mid-deliberation. What you see is a partial result.",
          },
        }));
      }
    },
    [apply],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((p) => (p.status === "running" ? { ...p, status: "done" } : p));
  }, []);

  return { state, start, stop, reset };
}
