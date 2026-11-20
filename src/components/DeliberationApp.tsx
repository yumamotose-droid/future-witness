"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import type {
  DeliberationResult,
  Lang,
  SessionRecord,
  Stance,
} from "@/lib/types";
import { t, PHASE_META } from "@/lib/i18n/dictionary";
import { useDeliberation } from "@/hooks/useDeliberation";
import { useDictation, useNarration } from "@/hooks/useSpeech";
import {
  clearSessions,
  loadSessions,
  saveSession,
  serverSessions,
  subscribeSessions,
} from "@/lib/store/local";
import { TopBar } from "./TopBar";
import { StatementBlock } from "./StatementBlock";
import { CoreSamples } from "./CoreSamples";
import { VoicePanel } from "./VoicePanel";
import { AuditPanel } from "./AuditPanel";
import { SourcesPanel } from "./SourcesPanel";
import { StanceForm } from "./StanceForm";
import { BaselinePanel } from "./BaselinePanel";
import { ReportPanel } from "./ReportPanel";
import { HistoryPanel } from "./HistoryPanel";
import { Stamp } from "./Stamp";

const DEMO_QUESTION =
  "経済発展のために森林を切り開き、大型商業施設を建設するべきか？";

export function DeliberationApp({ demo = false }: { demo?: boolean }) {
  const [lang, setLang] = useState<Lang>("ja");
  const L = t(lang);

  const [draft, setDraft] = useState(demo ? DEMO_QUESTION : "");
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [before, setBefore] = useState<Stance | null>(null);
  const [after, setAfter] = useState<Stance | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [openQuestions, setOpenQuestions] = useState("");

  const sessions = useSyncExternalStore(
    subscribeSessions,
    loadSessions,
    serverSessions,
  );

  const { state, start, reset } = useDeliberation();
  const dictation = useDictation(lang, setDraft);
  const narration = useNarration(lang);
  const startedDemo = useRef(false);
  const ledgerRef = useRef<HTMLDivElement | null>(null);

  const begin = useCallback(
    (text: string, topicKey?: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 8) return;
      narration.stop();
      setQuestion(trimmed);
      setSessionId(
        `fw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      );
      setBefore(null);
      setAfter(null);
      setRevealed(false);
      setOpenQuestions("");
      void start({ question: trimmed, lang, topicKey });
    },
    [lang, start, narration],
  );

  useEffect(() => {
    if (!demo || startedDemo.current) return;
    startedDemo.current = true;
    begin(DEMO_QUESTION, "forest");
  }, [demo, begin]);

  /** Footnote numbering, assigned in order of first appearance in the record. */
  const citationIndex = useMemo(() => {
    const index = new Map<string, number>();
    let n = 1;
    const add = (id: string) => {
      if (!index.has(id)) index.set(id, n++);
    };
    for (const claim of state.framing?.assumptions ?? []) {
      claim.sourceIds.forEach(add);
    }
    for (const statement of state.statements) {
      for (const claim of statement.claims) claim.sourceIds.forEach(add);
    }
    for (const scenario of state.scenarios) {
      for (const indicator of scenario.indicators) {
        indicator.sourceIds.forEach(add);
      }
    }
    return index;
  }, [state.framing, state.statements, state.scenarios]);

  const result: DeliberationResult | null = useMemo(() => {
    if (!state.framing || !state.audit) return null;
    return {
      id: sessionId,
      lang,
      question,
      framing: state.framing,
      options: state.options,
      scenarios: state.scenarios,
      statements: state.statements,
      voices: state.voices,
      audit: state.audit,
      createdAt: new Date().toISOString(),
    };
  }, [state, sessionId, lang, question]);

  const session: SessionRecord = useMemo(
    () => ({
      id: sessionId,
      question,
      lang,
      before: before ?? undefined,
      after: after ?? undefined,
      openQuestions: openQuestions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
    }),
    [sessionId, question, lang, before, after, openQuestions],
  );

  const recordAfter = useCallback(
    (stance: Stance) => {
      setAfter(stance);
      const record: SessionRecord = {
        ...session,
        after: stance,
      };
      saveSession(record);
    },
    [session],
  );

  const evidence = state.statements.find(
    (s) => s.agent === "EVIDENCE" && s.id.endsWith("evidence"),
  );
  const counter = state.statements.find((s) => s.agent === "COUNTER");
  const uncertainty = state.statements.find((s) =>
    s.id.endsWith("uncertainty"),
  );

  const gateOpen = revealed || before !== null;
  const running = state.status === "running";

  return (
    <>
      <TopBar
        lang={lang}
        onLangChange={setLang}
        mode={state.mode ?? undefined}
        modeNote={
          state.mode === "live" ? L.liveExplain : L.scriptedExplain
        }
      />

      <main id="main" className="px-4 pb-24 sm:px-8">
        <div className="mx-auto max-w-[72rem]">
          {/* ---------- the question ---------- */}
          <section className="pt-12 pb-2">
            <label htmlFor="question" className="t-mono text-ink-faint">
              {L.questionLabel}
            </label>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end">
              <textarea
                id="question"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                maxLength={600}
                placeholder={L.questionPlaceholder}
                className="field t-display max-w-[46rem] flex-1 resize-y text-[clamp(1.0625rem,2.4vw,1.5rem)] leading-[1.7]"
              />
              <div className="no-print flex flex-wrap gap-4">
                {dictation.supported ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      dictation.listening
                        ? dictation.stop()
                        : dictation.start()
                    }
                  >
                    {dictation.listening ? L.stopSpeaking : L.speak}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn"
                  data-variant="primary"
                  disabled={running || draft.trim().length < 8}
                  onClick={() => begin(draft)}
                >
                  {running ? L.submitting : L.submit}
                </button>
              </div>
            </div>

            {!question ? (
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="t-mono text-ink-faint">
                  {lang === "ja" ? "用意された問い" : "A prepared question"}
                </span>
                <button
                  type="button"
                  className="link t-mono-plain text-left"
                  onClick={() => {
                    setDraft(DEMO_QUESTION);
                    begin(DEMO_QUESTION, "forest");
                  }}
                >
                  {DEMO_QUESTION}
                </button>
              </div>
            ) : null}
          </section>

          {/* ---------- notices and errors ---------- */}
          {state.notices.length > 0 || state.error ? (
            <ul className="mt-8 border-t border-rule">
              {state.notices.map((notice, index) => (
                <li
                  key={`${notice.code}-${index}`}
                  className="rule-b flex gap-4 py-3"
                >
                  <span className="t-mono shrink-0 text-[var(--gold)]">
                    注記
                  </span>
                  <p className="max-w-[48rem] text-[0.8125rem] leading-[1.9] text-ink-soft">
                    {lang === "ja" ? notice.messageJa : notice.messageEn}
                  </p>
                </li>
              ))}
              {state.error ? (
                <li className="rule-b flex gap-4 py-3">
                  <span className="t-mono shrink-0 text-[var(--gold)]">
                    {lang === "ja" ? "中断" : "Halted"}
                  </span>
                  <div>
                    <p className="max-w-[48rem] text-[0.8125rem] leading-[1.9] text-ink">
                      {lang === "ja"
                        ? state.error.messageJa
                        : state.error.messageEn}
                    </p>
                    <button
                      type="button"
                      className="link t-mono-plain no-print mt-2"
                      onClick={() => {
                        reset();
                        begin(question || draft);
                      }}
                    >
                      {L.retry}
                    </button>
                  </div>
                </li>
              ) : null}
            </ul>
          ) : null}

          {/* ---------- progress ---------- */}
          {running && state.phase ? (
            <p
              className="t-mono mt-8 text-ink-faint"
              aria-live="polite"
            >
              <span className="caret">
                {lang === "ja"
                  ? PHASE_META[state.phase].ja
                  : PHASE_META[state.phase].en}
              </span>
            </p>
          ) : null}

          <div ref={ledgerRef} className="mt-14 space-y-14">
            {/* ---------- STEP 1 — the question restated ---------- */}
            {state.framing ? (
              <section className="anim-settle rule-t pt-8">
                <header className="flex flex-wrap items-baseline gap-x-4">
                  <span className="t-mono text-ink">CHRONOS</span>
                  <span className="t-mono-plain text-ink-faint">
                    {lang === "ja"
                      ? "問いを立て直す"
                      : "Restating the question"}
                  </span>
                </header>
                <p className="t-display mt-4 max-w-[46rem] text-[1.125rem] leading-[1.85]">
                  {lang === "ja"
                    ? state.framing.coreJa
                    : state.framing.coreEn}
                </p>

                <h3 className="t-mono mt-10 text-ink-faint">{L.premises}</h3>
                <ul className="mt-4 border-t border-rule">
                  {state.framing.assumptions.map((claim, index) => (
                    <li
                      key={index}
                      className="rule-b flex gap-4 py-4 sm:gap-6"
                    >
                      <span className="pt-1">
                        <Stamp kind={claim.kind} lang={lang} pressed />
                      </span>
                      <p
                        className="claim max-w-[46rem] text-[0.9375rem] leading-[1.95]"
                        data-kind={claim.kind}
                      >
                        {lang === "en"
                          ? (claim.textEn ?? claim.text)
                          : claim.text}
                        {claim.sourceIds.map((id) => {
                          const n = citationIndex.get(id);
                          return n ? (
                            <a
                              key={id}
                              href={`#source-${id.split("#")[0]}`}
                              className="t-mono ml-1 align-super text-[0.5625rem] text-[var(--gold)]"
                            >
                              [{n}]
                            </a>
                          ) : null;
                        })}
                      </p>
                    </li>
                  ))}
                </ul>

                <h3 className="t-mono mt-10 text-ink-faint">
                  {L.stakeholders}
                </h3>
                <ul className="mt-4 border-t border-rule">
                  {state.framing.stakeholders.map((person, index) => (
                    <li
                      key={index}
                      className="rule-b flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4"
                    >
                      <span
                        className="t-mono w-[7.5rem] shrink-0"
                        style={{
                          color: person.hasVote
                            ? "var(--olive)"
                            : "var(--gold)",
                        }}
                      >
                        {person.hasVote
                          ? lang === "ja"
                            ? "投票できる"
                            : "has a vote"
                          : lang === "ja"
                            ? "投票できない"
                            : "no vote"}
                      </span>
                      <span className="t-display text-[1rem]">
                        {lang === "ja" ? person.nameJa : person.nameEn}
                      </span>
                      <span className="max-w-[32rem] text-[0.8125rem] leading-[1.9] text-ink-faint">
                        {lang === "ja" ? person.horizonJa : person.horizonEn}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ---------- STEP 2 + the pre-deliberation record ---------- */}
            {state.options.length > 0 && !gateOpen ? (
              <StanceForm
                options={state.options}
                lang={lang}
                when="before"
                onSubmit={(stance) => {
                  setBefore(stance);
                  setRevealed(true);
                }}
                onSkip={() => setRevealed(true)}
              />
            ) : null}

            {gateOpen ? (
              <>
                {state.options.length > 0 ? (
                  <section className="rule-t pt-8">
                    <h2 className="t-display text-[1.5rem]">{L.options}</h2>
                    <ul className="mt-6 border-t border-rule">
                      {state.options.map((option) => (
                        <li key={option.id} className="rule-b py-4">
                          <span className="t-mono mr-4 text-[var(--gold)]">
                            {option.id}
                          </span>
                          <span className="t-display text-[1rem]">
                            {lang === "ja" ? option.labelJa : option.labelEn}
                          </span>
                          <p className="mt-2 max-w-[46rem] text-[0.875rem] leading-[1.95] text-ink-soft">
                            {lang === "ja"
                              ? option.summaryJa
                              : option.summaryEn}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {evidence ? (
                  <StatementBlock
                    statement={evidence}
                    lang={lang}
                    citationIndex={citationIndex}
                  />
                ) : null}

                {state.scenarios.length > 0 ? (
                  <CoreSamples
                    scenarios={state.scenarios}
                    options={state.options}
                    lang={lang}
                  />
                ) : null}

                {state.voices.length > 0 ? (
                  <VoicePanel
                    scenarios={state.scenarios}
                    voices={state.voices}
                    activeVoice={state.activeVoice}
                    lang={lang}
                    runLang={state.runLang}
                    narration={narration}
                  />
                ) : null}

                {counter ? (
                  <StatementBlock
                    statement={counter}
                    lang={lang}
                    citationIndex={citationIndex}
                  />
                ) : null}

                {uncertainty ? (
                  <StatementBlock
                    statement={uncertainty}
                    lang={lang}
                    citationIndex={citationIndex}
                  />
                ) : null}

                {state.audit ? (
                  <AuditPanel audit={state.audit} lang={lang} />
                ) : null}

                {citationIndex.size > 0 ? (
                  <SourcesPanel citationIndex={citationIndex} lang={lang} />
                ) : null}

                {/* ---------- STEP 8 — the decision is the user's ---------- */}
                {state.status === "done" && state.options.length > 0 ? (
                  after ? (
                    <section className="rule-t pt-8">
                      <h2 className="t-display text-[1.5rem]">
                        {L.stanceDeltaTitle}
                      </h2>
                      <dl className="mt-6 grid gap-x-10 border-t border-rule sm:grid-cols-2">
                        <div className="rule-b flex items-baseline justify-between gap-4 py-3">
                          <dt className="t-mono-plain text-ink-faint">
                            {lang === "ja" ? "選択" : "Choice"}
                          </dt>
                          <dd className="t-mono-plain">
                            {before
                              ? before.optionId === after.optionId
                                ? L.stanceUnchanged
                                : `${before.optionId} → ${after.optionId}`
                              : after.optionId}
                          </dd>
                        </div>
                        <div className="rule-b flex items-baseline justify-between gap-4 py-3">
                          <dt className="t-mono-plain text-ink-faint">
                            {L.confidenceDelta}
                          </dt>
                          <dd className="t-mono-plain">
                            {before
                              ? `${before.confidence}% → ${after.confidence}%`
                              : `${after.confidence}%`}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-5 max-w-[40rem] text-[0.8125rem] leading-[1.9] text-ink-faint">
                        {lang === "ja"
                          ? "変化があったことは、判断が良くなったことを意味しません。システムはこの区別を検証していません。"
                          : "That something moved does not mean the decision improved. The system has not tested that distinction."}
                      </p>
                    </section>
                  ) : (
                    <StanceForm
                      options={state.options}
                      lang={lang}
                      when="after"
                      initial={before ?? undefined}
                      onSubmit={recordAfter}
                    />
                  )
                ) : null}

                {state.status === "done" && result ? (
                  <ReportPanel
                    session={session}
                    result={result}
                    lang={lang}
                    openQuestions={openQuestions}
                    onOpenQuestionsChange={setOpenQuestions}
                  />
                ) : null}

                {state.status === "done" && question ? (
                  <BaselinePanel
                    question={question}
                    lang={lang}
                    audit={state.audit}
                  />
                ) : null}
              </>
            ) : null}

            <HistoryPanel
              sessions={sessions}
              lang={lang}
              onClear={clearSessions}
            />

            <section className="rule-t pt-8">
              <h2 className="t-mono text-ink">{L.disclaimerTitle}</h2>
              <ul className="mt-5 max-w-[42rem] space-y-3 text-[0.8125rem] leading-[1.9] text-ink-faint">
                {L.disclaimer.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link href="/" className="link t-mono-plain mt-8 inline-block">
                ← Future Witness
              </Link>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
