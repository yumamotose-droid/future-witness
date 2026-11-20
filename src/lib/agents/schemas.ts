import { z } from "zod";

/**
 * Structured output contracts.
 *
 * Each agent returns JSON validated against these schemas before anything
 * reaches the verifier or the UI. If validation fails the orchestrator retries
 * once with the validation error appended to the prompt, then falls back to the
 * scripted path rather than rendering half-parsed output.
 */

export const epistemicKindSchema = z.enum([
  "verified",
  "inference",
  "hypothetical",
  "unknown",
]);

export const claimSchema = z.object({
  kind: epistemicKindSchema,
  text: z.string().min(1).max(600),
  /** The same sentence in English. Optional so one missing translation does
   *  not invalidate an otherwise sound statement. */
  textEn: z.string().max(800).optional(),
  sourceIds: z.array(z.string().max(120)).max(6).default([]),
});

export const framingSchema = z.object({
  coreJa: z.string().min(1).max(400),
  coreEn: z.string().min(1).max(400),
  assumptions: z.array(claimSchema).min(1).max(5),
  stakeholders: z
    .array(
      z.object({
        nameJa: z.string().min(1).max(60),
        nameEn: z.string().min(1).max(80),
        horizonJa: z.string().min(1).max(120),
        horizonEn: z.string().min(1).max(160),
        hasVote: z.boolean(),
      }),
    )
    .min(2)
    .max(6),
});

export const optionsSchema = z.object({
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(8),
        labelJa: z.string().min(1).max(60),
        labelEn: z.string().min(1).max(80),
        summaryJa: z.string().min(1).max(300),
        summaryEn: z.string().min(1).max(400),
      }),
    )
    .min(2)
    .max(4),
});

export const evidenceSchema = z.object({
  titleJa: z.string().min(1).max(80),
  titleEn: z.string().min(1).max(120),
  claims: z.array(claimSchema).min(2).max(10),
});

export const indicatorSchema = z.object({
  key: z.string().min(1).max(40),
  labelJa: z.string().min(1).max(40),
  labelEn: z.string().min(1).max(60),
  direction: z.enum(["up", "down", "mixed", "unknown"]),
  noteJa: z.string().min(1).max(200),
  noteEn: z.string().min(1).max(260),
  sourceIds: z.array(z.string().max(120)).max(4).default([]),
});

export const scenariosSchema = z.object({
  scenarios: z
    .array(
      z.object({
        id: z.string().min(1).max(8),
        optionId: z.string().min(1).max(8),
        nameJa: z.string().min(1).max(40),
        nameEn: z.string().min(1).max(60),
        premiseJa: z.string().min(1).max(300),
        premiseEn: z.string().min(1).max(400),
        strata: z
          .array(
            z.object({
              year: z.union([
                z.literal(2030),
                z.literal(2040),
                z.literal(2050),
              ]),
              headlineJa: z.string().min(1).max(60),
              headlineEn: z.string().min(1).max(90),
              detailJa: z.string().min(1).max(300),
              detailEn: z.string().min(1).max(400),
              tone: z.number().min(-1).max(1),
            }),
          )
          .length(3),
        indicators: z.array(indicatorSchema).min(3).max(6),
      }),
    )
    .min(2)
    .max(4),
});

export const witnessSchema = z.object({
  nameJa: z.string().min(1).max(30),
  nameEn: z.string().min(1).max(40),
  age: z.number().int().min(5).max(110),
  bornIn: z.number().int().min(1960).max(2050),
  placeJa: z.string().min(1).max(60),
  placeEn: z.string().min(1).max(80),
});

export const counterSchema = z.object({
  titleJa: z.string().min(1).max(80),
  titleEn: z.string().min(1).max(120),
  claims: z.array(claimSchema).min(3).max(10),
  /** Required: the objection to this system's own presentation. */
  selfCritique: claimSchema,
});

export const uncertaintySchema = z.object({
  titleJa: z.string().min(1).max(80),
  titleEn: z.string().min(1).max(120),
  claims: z.array(claimSchema).min(2).max(8),
});

export const requestSchema = z.object({
  question: z.string().trim().min(8, "質問が短すぎます").max(600),
  lang: z.enum(["ja", "en"]).default("ja"),
  /** Pre-deliberation stance, recorded before any AI output is shown. */
  stanceBefore: z
    .object({
      optionId: z.string().max(8).optional(),
      confidence: z.number().min(0).max(100).optional(),
      reason: z.string().max(600).optional(),
    })
    .optional(),
  /** Demo mode forces the scripted script so a judge always sees a full run. */
  scripted: z.boolean().default(false),
  topicKey: z.string().max(40).optional(),
});

export type RequestInput = z.infer<typeof requestSchema>;

/**
 * Tolerant JSON extraction. Models wrap JSON in prose or fences even when told
 * not to; we strip the common wrappers before parsing rather than failing.
 */
export function extractJson(raw: string): unknown {
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.search(/[[{]/);
    const endBrace = candidate.lastIndexOf("}");
    const endBracket = candidate.lastIndexOf("]");
    const end = Math.max(endBrace, endBracket);
    if (start === -1 || end <= start) {
      throw new Error("モデル出力からJSONを取り出せませんでした。");
    }
    return JSON.parse(candidate.slice(start, end + 1));
  }
}
