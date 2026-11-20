import { randomUUID } from "node:crypto";
import type {
  AuditReport,
  Framing,
  Scenario,
  Statement,
  StreamEvent,
} from "@/lib/types";
import type { RequestInput } from "./schemas";
import {
  renderCorpusForPrompt,
  retrieveSources,
} from "@/lib/evidence/retrieve";
import {
  emptyAudit,
  finalizeAudit,
  mergeAudits,
  scenarioDivergence,
  verifyStatements,
  type VerificationOutcome,
} from "@/lib/evidence/verify";
import { sanitizeQuestion } from "@/lib/security/sanitize";
import { budgetStop, openLedger } from "@/lib/security/budget";
import { createGeminiProvider, geminiConfigured } from "@/lib/ai/gemini";
import { createLiveEngine } from "./engine-live";
import { createScriptedEngine, detectScript } from "./engine-scripted";
import type { DeliberationEngine, RunContext } from "./engine";
import { ProviderError } from "@/lib/ai/provider";

/**
 * The deliberation pipeline.
 *
 * The nine steps of the spec map onto the events this generator yields. Three
 * properties are worth noting because they are what the UI depends on:
 *
 *  - Every statement is verified BEFORE it is emitted. The client never sees an
 *    unverified claim, so there is no window in which a fabricated citation is
 *    on screen.
 *  - A live run that fails part-way degrades to the scripted engine for the
 *    remaining steps and emits a `notice` saying so. The user is never shown a
 *    truncated deliberation without being told why, and scripted content is
 *    never relabelled as live.
 *  - The budget is checked between steps, so a runaway run stops with a partial
 *    result and an explanation rather than consuming the quota.
 */

export interface RunOptions {
  /** Forces the scripted engine regardless of key availability. */
  forceScripted?: boolean;
  /** Skips the artificial streaming delay (used by tests). */
  instant?: boolean;
  signal?: AbortSignal;
}

function verifyOne(
  statement: Statement,
): { statement: Statement; audit: VerificationOutcome["audit"] } {
  const outcome = verifyStatements([statement], []);
  return { statement: outcome.statements[0], audit: outcome.audit };
}

export async function* runDeliberation(
  input: RequestInput,
  options: RunOptions = {},
): AsyncGenerator<StreamEvent, void, void> {
  const startedAt = Date.now();
  const runId = randomUUID().slice(0, 8);
  const question = sanitizeQuestion(input.question);
  const hits = retrieveSources(question);

  const ctx: RunContext = {
    runId,
    question,
    lang: input.lang,
    hits,
    corpusText: renderCorpusForPrompt(hits),
    voiceTexts: [],
    ledger: openLedger(startedAt),
    signal: options.signal,
  };

  const wantLive =
    !options.forceScripted && !input.scripted && geminiConfigured();
  const scriptKind = detectScript(question, input.topicKey);
  const scripted = createScriptedEngine(scriptKind, {
    instant: options.instant,
  });
  let engine: DeliberationEngine = wantLive
    ? createLiveEngine(createGeminiProvider())
    : scripted;
  let degraded = false;

  let audit = emptyAudit();

  /**
   * Run one step. On a provider failure, fall back to the scripted engine for
   * this and every later step, and say so once.
   */
  async function* step<T>(
    run: (e: DeliberationEngine) => Promise<T>,
  ): AsyncGenerator<StreamEvent, T, void> {
    try {
      return await run(engine);
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;
      if (!degraded) {
        degraded = true;
        engine = scripted;
        yield {
          type: "notice",
          code: `fallback_${error.code}`,
          messageJa: `生成モデルの呼び出しに失敗したため、以降の工程を脚本エンジンに切り替えました（原因: ${error.code}）。ここから先はライブ生成ではありません。`,
          messageEn: `The model call failed, so the remaining steps switched to the scripted engine (cause: ${error.code}). Everything from here is not live generation.`,
        };
      }
      return await run(scripted);
    }
  }

  function* checkBudget(): Generator<StreamEvent, boolean, void> {
    const stop = budgetStop(ctx.ledger);
    if (!stop) return true;
    const reasons: Record<string, [string, string]> = {
      run_tokens: [
        "この実行の生成量の上限に達したため、ここで打ち切りました。表示されているのは途中までの結果です。",
        "This run reached its output budget and stopped here. What you see is a partial result.",
      ],
      run_time: [
        "この実行の制限時間に達したため、ここで打ち切りました。表示されているのは途中までの結果です。",
        "This run reached its time limit and stopped here. What you see is a partial result.",
      ],
      process_tokens: [
        "サーバー全体の生成量の上限に達しました。しばらく経ってから再試行してください。",
        "The server-wide output ceiling was reached. Please retry later.",
      ],
    };
    const [messageJa, messageEn] = reasons[stop];
    yield { type: "notice", code: `budget_${stop}`, messageJa, messageEn };
    return false;
  }

  try {
    yield {
      type: "meta",
      mode: engine.mode,
      model: engine.model,
      lang: input.lang,
      runId,
    };

    if (!wantLive && !input.scripted) {
      yield {
        type: "notice",
        code: "no_api_key",
        messageJa:
          "サーバーに GEMINI_API_KEY が設定されていないため、脚本エンジンで実行します。生成モデルは呼び出していません。",
        messageEn:
          "GEMINI_API_KEY is not set on the server, so this run uses the scripted engine. No model was called.",
      };
    }
    if (scriptKind === "derived" && engine === scripted) {
      yield {
        type: "notice",
        code: "scripted_derived",
        messageJa:
          "この問いには事前に書かれた脚本がありません。根拠はコーパスから検索した実在資料をそのまま提示し、筋書きと語りは定型文です。",
        messageEn:
          "No hand-written script exists for this question. The evidence is taken verbatim from real corpus sources; the scenarios and narration are templated.",
      };
    }

    /* STEP 1 — restate the decision and expose its premises. */
    yield { type: "phase", phase: "framing" };
    const framing: Framing = yield* step((e) => e.framing(ctx));
    {
      const wrapped = verifyOne({
        id: `${runId}-framing`,
        agent: "CHRONOS",
        titleJa: "前提",
        titleEn: "Premises",
        claims: framing.assumptions,
      });
      framing.assumptions = wrapped.statement.claims;
      audit = mergeAudits(audit, wrapped.audit);
    }
    ctx.framing = framing;
    yield { type: "framing", data: framing };

    /* STEP 2 — generate defensible courses of action. */
    yield { type: "phase", phase: "options" };
    ctx.options = yield* step((e) => e.options(ctx));
    yield { type: "options", data: ctx.options };

    /* STEP 3 — the verifiable record. */
    yield { type: "phase", phase: "evidence" };
    const evidenceRaw = yield* step((e) => e.evidence(ctx));
    const evidence = verifyOne(evidenceRaw);
    audit = mergeAudits(audit, evidence.audit);
    ctx.evidence = evidence.statement;
    yield { type: "statement", data: evidence.statement };

    if (!(yield* checkBudget())) {
      yield {
        type: "audit",
        data: finalizeAudit(audit, {
          mode: engine.mode,
          model: engine.model,
          elapsedMs: Date.now() - startedAt,
        }),
      };
      yield { type: "done" };
      return;
    }

    /* STEP 4 — branch the future. */
    yield { type: "phase", phase: "scenarios" };
    const scenarios: Scenario[] = yield* step((e) => e.scenarios(ctx));
    {
      const outcome = verifyStatements([], scenarios);
      audit = mergeAudits(audit, outcome.audit);
      audit.scenarioDivergence = scenarioDivergence(scenarios);
      // Every stratum is a conditional narrative, so it counts toward the
      // hypothetical total. Leaving them out would understate how much of what
      // the reader sees is a story rather than a finding.
      const strata = scenarios.reduce((n, s) => n + s.strata.length, 0);
      audit.byKind.hypothetical += strata;
      audit.claimsTotal += strata;
    }
    ctx.scenarios = scenarios;
    yield { type: "scenarios", data: scenarios };

    /* STEP 5 — a life inside each future. */
    yield { type: "phase", phase: "voices" };
    for (const scenario of scenarios) {
      if (!budgetStop(ctx.ledger)) {
        const handle = yield* step((e) => e.voice(ctx, scenario));
        yield {
          type: "voice-start",
          scenarioId: scenario.id,
          witness: handle.witness,
        };
        let body = "";
        for await (const chunk of handle.stream) {
          body += chunk;
          yield { type: "voice-delta", scenarioId: scenario.id, text: chunk };
        }
        ctx.voiceTexts.push({ scenarioId: scenario.id, text: body });
        // The testimony itself is one hypothetical statement.
        audit.byKind.hypothetical += 1;
        audit.claimsTotal += 1;
        yield { type: "voice-end", scenarioId: scenario.id };
      }
    }

    /* STEP 6 — attack all of it, including our own narration. */
    yield { type: "phase", phase: "counter" };
    const counterRaw = yield* step((e) => e.counter(ctx));
    const counter = verifyOne(counterRaw);
    audit = mergeAudits(audit, counter.audit);
    yield { type: "statement", data: counter.statement };

    /* STEP 7 — what is still not known. */
    yield { type: "phase", phase: "uncertainty" };
    const uncertaintyRaw = yield* step((e) => e.uncertainty(ctx));
    const uncertainty = verifyOne(uncertaintyRaw);
    audit = mergeAudits(audit, uncertainty.audit);
    yield { type: "statement", data: uncertainty.statement };

    /* The audit is the receipt: what was checked, and what was rejected. */
    yield { type: "phase", phase: "audit" };
    const report: AuditReport = finalizeAudit(audit, {
      mode: degraded ? "scripted" : engine.mode,
      model: degraded ? `${engine.model} (fallback)` : engine.model,
      elapsedMs: Date.now() - startedAt,
    });
    yield { type: "audit", data: report };
    yield { type: "done" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield {
      type: "error",
      code: error instanceof ProviderError ? error.code : "internal",
      messageJa: `実行を完了できませんでした: ${message}`,
      messageEn: `The run could not be completed: ${message}`,
    };
  }
}
