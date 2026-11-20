import { z } from "zod";
import type {
  Framing,
  Option,
  Scenario,
  Statement,
  Witness,
} from "@/lib/types";
import type {
  DeliberationEngine,
  RunContext,
  VoiceHandle,
} from "./engine";
import {
  CHRONOS_FRAMING_SYSTEM,
  CHRONOS_OPTIONS_SYSTEM,
  CHRONOS_SCENARIOS_SYSTEM,
  COUNTER_SYSTEM,
  EVIDENCE_SYSTEM,
  MIRAI_SYSTEM,
  MIRAI_WITNESS_SYSTEM,
  UNCERTAINTY_SYSTEM,
  citableFindingsBlock,
} from "./prompts";
import {
  counterSchema,
  evidenceSchema,
  extractJson,
  framingSchema,
  optionsSchema,
  scenariosSchema,
  uncertaintySchema,
  witnessSchema,
} from "./schemas";
import { wrapUserInput } from "@/lib/security/sanitize";
import { sanitizeClaims, sanitizeStatementText } from "./normalize";
import {
  BUDGET,
  estimateTokens,
  recordSpend,
  remainingTokens,
} from "@/lib/security/budget";
import { ProviderError, type AIProvider } from "@/lib/ai/provider";

/** JSON Schema generation is best-effort; the prompt also states the shape. */
function toJsonSchema(schema: z.ZodType): unknown | undefined {
  try {
    return z.toJSONSchema(schema, { io: "output", target: "draft-7" });
  } catch {
    return undefined;
  }
}

function cap(ctx: RunContext, want: number): number {
  return Math.max(
    256,
    Math.min(want, BUDGET.maxOutputTokensPerCall, remainingTokens(ctx.ledger)),
  );
}

export function createLiveEngine(provider: AIProvider): DeliberationEngine {
  /**
   * Call the model, parse, validate. One retry with the validation error
   * appended, then a final attempt without the JSON schema in case the schema
   * itself is what the endpoint rejected. After that we throw and the
   * orchestrator falls back to the scripted path rather than rendering
   * half-parsed output.
   */
  async function structured<T extends z.ZodType>(
    ctx: RunContext,
    schema: T,
    system: string,
    prompt: string,
    opts: { temperature?: number; maxOutputTokens?: number } = {},
  ): Promise<z.infer<T>> {
    const jsonSchema = toJsonSchema(schema);
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const useSchema = attempt < 2 ? jsonSchema : undefined;
      const body = lastError
        ? `${prompt}\n\n# Your previous output was rejected\n${lastError}\nReturn corrected JSON only.`
        : prompt;
      try {
        const { raw, usage } = await provider.generateJson({
          system,
          prompt: body,
          jsonSchema: useSchema,
          temperature: opts.temperature,
          maxOutputTokens: cap(ctx, opts.maxOutputTokens ?? 1_800),
          signal: ctx.signal,
        });
        recordSpend(ctx.ledger, usage.outputTokens);
        const parsed = schema.safeParse(extractJson(raw));
        if (parsed.success) return parsed.data;
        lastError = parsed.error.issues
          .slice(0, 6)
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ");
      } catch (error) {
        if (error instanceof ProviderError && !error.retryable) throw error;
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    throw new ProviderError(
      `構造化出力の検証に失敗しました: ${lastError}`,
      "invalid_output",
      false,
    );
  }

  function base(ctx: RunContext): string {
    return [
      citableFindingsBlock(ctx.corpusText),
      "",
      "# THE DECISION UNDER DELIBERATION",
      wrapUserInput(ctx.question),
    ].join("\n");
  }

  function framingBlock(ctx: RunContext): string {
    if (!ctx.framing) return "";
    return [
      "",
      "# ALREADY ESTABLISHED — the reframed decision",
      `core: ${ctx.framing.coreJa}`,
      `assumptions: ${ctx.framing.assumptions.map((a) => a.text).join(" / ")}`,
    ].join("\n");
  }

  function optionsBlock(ctx: RunContext): string {
    if (!ctx.options) return "";
    return [
      "",
      "# ALREADY ESTABLISHED — the options",
      ...ctx.options.map((o) => `${o.id}: ${o.labelJa} — ${o.summaryJa}`),
    ].join("\n");
  }

  return {
    mode: "live",
    model: provider.model,

    async framing(ctx): Promise<Framing> {
      const data = await structured(
        ctx,
        framingSchema,
        CHRONOS_FRAMING_SYSTEM,
        base(ctx),
        { temperature: 0.3, maxOutputTokens: 1_200 },
      );
      return {
        coreJa: sanitizeStatementText(data.coreJa),
        coreEn: sanitizeStatementText(data.coreEn),
        assumptions: sanitizeClaims(data.assumptions),
        stakeholders: data.stakeholders.map((s) => ({
          nameJa: sanitizeStatementText(s.nameJa, 60),
          nameEn: sanitizeStatementText(s.nameEn, 80),
          horizonJa: sanitizeStatementText(s.horizonJa, 120),
          horizonEn: sanitizeStatementText(s.horizonEn, 160),
          hasVote: s.hasVote,
        })),
      };
    },

    async options(ctx): Promise<Option[]> {
      const data = await structured(
        ctx,
        optionsSchema,
        CHRONOS_OPTIONS_SYSTEM,
        base(ctx) + framingBlock(ctx),
        { temperature: 0.6, maxOutputTokens: 1_200 },
      );
      return data.options.map((o, index) => ({
        id: /^[A-D]$/.test(o.id) ? o.id : String.fromCharCode(65 + index),
        labelJa: sanitizeStatementText(o.labelJa, 60),
        labelEn: sanitizeStatementText(o.labelEn, 80),
        summaryJa: sanitizeStatementText(o.summaryJa, 300),
        summaryEn: sanitizeStatementText(o.summaryEn, 400),
      }));
    },

    async evidence(ctx): Promise<Statement> {
      const data = await structured(
        ctx,
        evidenceSchema,
        EVIDENCE_SYSTEM,
        base(ctx) + framingBlock(ctx) + optionsBlock(ctx),
        { temperature: 0.15, maxOutputTokens: 2_200 },
      );
      return {
        id: `${ctx.runId}-evidence`,
        agent: "EVIDENCE",
        titleJa: sanitizeStatementText(data.titleJa, 80),
        titleEn: sanitizeStatementText(data.titleEn, 120),
        claims: sanitizeClaims(data.claims),
      };
    },

    async scenarios(ctx): Promise<Scenario[]> {
      const data = await structured(
        ctx,
        scenariosSchema,
        CHRONOS_SCENARIOS_SYSTEM,
        base(ctx) + framingBlock(ctx) + optionsBlock(ctx),
        { temperature: 0.55, maxOutputTokens: 2_200 },
      );
      const optionIds = new Set((ctx.options ?? []).map((o) => o.id));
      return data.scenarios.map((s, index) => ({
        id: /^[A-D]$/.test(s.id) ? s.id : String.fromCharCode(65 + index),
        optionId: optionIds.has(s.optionId)
          ? s.optionId
          : (ctx.options?.[index]?.id ?? String.fromCharCode(65 + index)),
        nameJa: sanitizeStatementText(s.nameJa, 40),
        nameEn: sanitizeStatementText(s.nameEn, 60),
        premiseJa: sanitizeStatementText(s.premiseJa, 300),
        premiseEn: sanitizeStatementText(s.premiseEn, 400),
        strata: [...s.strata]
          .sort((a, b) => a.year - b.year)
          .map((st) => ({
            year: st.year,
            headlineJa: sanitizeStatementText(st.headlineJa, 60),
            headlineEn: sanitizeStatementText(st.headlineEn, 90),
            detailJa: sanitizeStatementText(st.detailJa, 300),
            detailEn: sanitizeStatementText(st.detailEn, 400),
            tone: Math.max(-1, Math.min(1, st.tone)),
          })),
        indicators: s.indicators.map((i) => ({
          key: i.key.replace(/[^a-z0-9_]/gi, "_").slice(0, 40).toLowerCase(),
          labelJa: sanitizeStatementText(i.labelJa, 40),
          labelEn: sanitizeStatementText(i.labelEn, 60),
          direction: i.direction,
          noteJa: sanitizeStatementText(i.noteJa, 200),
          noteEn: sanitizeStatementText(i.noteEn, 260),
          sourceIds: i.sourceIds ?? [],
        })),
      }));
    },

    async voice(ctx, scenario): Promise<VoiceHandle> {
      const scenarioBlock = [
        "# THE SCENARIO YOU LIVE IN",
        `name: ${scenario.nameJa}`,
        `premise: ${scenario.premiseJa}`,
        ...scenario.strata.map(
          (st) => `${st.year}: ${st.headlineJa} — ${st.detailJa}`,
        ),
      ].join("\n");

      let witness: Witness;
      try {
        const data = await structured(
          ctx,
          witnessSchema,
          MIRAI_WITNESS_SYSTEM,
          `${scenarioBlock}\n\n${wrapUserInput(ctx.question)}`,
          { temperature: 0.9, maxOutputTokens: 400 },
        );
        witness = {
          nameJa: sanitizeStatementText(data.nameJa, 30),
          nameEn: sanitizeStatementText(data.nameEn, 40),
          age: data.age,
          bornIn: data.bornIn,
          placeJa: sanitizeStatementText(data.placeJa, 60),
          placeEn: sanitizeStatementText(data.placeEn, 80),
        };
      } catch {
        witness = {
          nameJa: "名前のない証人",
          nameEn: "Unnamed witness",
          age: 2050 - 2022,
          bornIn: 2022,
          placeJa: "この地域",
          placeEn: "this locality",
        };
      }

      const prompt = [
        scenarioBlock,
        "",
        `# YOU`,
        `${witness.nameJa}、${witness.age}歳、${witness.placeJa}在住。${witness.bornIn}年生まれ。`,
        "",
        "# THE DECISION THAT WAS MADE IN YOUR PAST",
        wrapUserInput(ctx.question),
      ].join("\n");

      const stream = provider.streamText({
        system: MIRAI_SYSTEM,
        prompt,
        temperature: 0.95,
        maxOutputTokens: cap(ctx, 700),
        signal: ctx.signal,
      });

      // Account for the streamed text as it passes through.
      async function* metered(): AsyncIterable<string> {
        for await (const chunk of stream) {
          recordSpend(ctx.ledger, estimateTokens(chunk));
          yield chunk;
        }
      }

      return { witness, stream: metered() };
    },

    async counter(ctx): Promise<Statement> {
      const target = [
        "",
        "# WHAT YOU ARE ATTACKING",
        "## EVIDENCE said:",
        ...(ctx.evidence?.claims ?? []).map(
          (c) => `- [${c.kind}] ${c.text}`,
        ),
        "## The 2050 witnesses said:",
        ...ctx.voiceTexts.map((v) => `- (${v.scenarioId}) ${v.text}`),
        "## The scenarios were:",
        ...(ctx.scenarios ?? []).map(
          (s) =>
            `- ${s.id} ${s.nameJa}: ${s.strata.map((st) => `${st.year}=${st.headlineJa}`).join(", ")}`,
        ),
      ].join("\n");

      const data = await structured(
        ctx,
        counterSchema,
        COUNTER_SYSTEM,
        base(ctx) + framingBlock(ctx) + optionsBlock(ctx) + target,
        { temperature: 0.7, maxOutputTokens: 2_200 },
      );
      return {
        id: `${ctx.runId}-counter`,
        agent: "COUNTER",
        titleJa: sanitizeStatementText(data.titleJa, 80),
        titleEn: sanitizeStatementText(data.titleEn, 120),
        claims: sanitizeClaims(data.claims),
      };
    },

    async uncertainty(ctx): Promise<Statement> {
      const data = await structured(
        ctx,
        uncertaintySchema,
        UNCERTAINTY_SYSTEM,
        base(ctx) +
          framingBlock(ctx) +
          optionsBlock(ctx) +
          [
            "",
            "# LIMITATIONS ALREADY STATED (do not repeat these)",
            ...(ctx.evidence?.claims ?? []).map((c) => `- ${c.text}`),
          ].join("\n"),
        { temperature: 0.3, maxOutputTokens: 1_600 },
      );
      return {
        id: `${ctx.runId}-uncertainty`,
        agent: "EVIDENCE",
        titleJa: sanitizeStatementText(data.titleJa, 80),
        titleEn: sanitizeStatementText(data.titleEn, 120),
        claims: sanitizeClaims(data.claims),
      };
    },
  };
}
