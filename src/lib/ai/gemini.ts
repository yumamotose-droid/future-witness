import { GoogleGenAI } from "@google/genai";
import {
  ProviderError,
  type AIProvider,
  type GenerateJsonRequest,
  type GenerateTextRequest,
  type JsonResult,
} from "./provider";
import { estimateTokens } from "@/lib/security/budget";

/**
 * Gemini adapter.
 *
 * The API key is read from the server environment only and never leaves this
 * module. Nothing here is imported by a client component; the one entry point
 * for the browser is the `/api/deliberate` route.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ProviderError(
      "GEMINI_API_KEY is not set on the server.",
      "no_key",
    );
  }
  return new GoogleGenAI({ apiKey });
}

function mapError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number })?.status;
  if (status === 429 || /quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(message)) {
    return new ProviderError(message, "rate_limited", true);
  }
  // 503 UNAVAILABLE is the model being busy, not the request being wrong.
  // It clears on its own, so it is worth waiting for rather than failing over.
  if (status === 503 || /UNAVAILABLE|high demand|overloaded/i.test(message)) {
    return new ProviderError(message, "overloaded", true);
  }
  if (/abort|timeout|deadline/i.test(message)) {
    return new ProviderError(message, "timeout", true);
  }
  if (/safety|blocked|PROHIBITED/i.test(message)) {
    return new ProviderError(message, "blocked", false);
  }
  return new ProviderError(message, "upstream", true);
}

export function createGeminiProvider(
  model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
): AIProvider {
  return {
    id: "gemini",
    model,
    live: true,

    async generateJson(req: GenerateJsonRequest): Promise<JsonResult> {
      try {
        const ai = client();
        const response = await ai.models.generateContent({
          model,
          contents: req.prompt,
          config: {
            systemInstruction: req.system,
            temperature: req.temperature ?? 0.4,
            maxOutputTokens: req.maxOutputTokens ?? 2_200,
            responseMimeType: "application/json",
            ...(req.jsonSchema
              ? { responseJsonSchema: req.jsonSchema }
              : {}),
            ...(req.signal ? { abortSignal: req.signal } : {}),
          },
        });
        const raw = response.text ?? "";
        if (!raw.trim()) {
          throw new ProviderError(
            "モデルが空の応答を返しました。",
            "invalid_output",
            true,
          );
        }
        const reported =
          response.usageMetadata?.candidatesTokenCount ??
          estimateTokens(raw);
        return { raw, usage: { outputTokens: reported } };
      } catch (error) {
        throw mapError(error);
      }
    },

    async *streamText(req: GenerateTextRequest): AsyncIterable<string> {
      let stream;
      try {
        const ai = client();
        stream = await ai.models.generateContentStream({
          model,
          contents: req.prompt,
          config: {
            systemInstruction: req.system,
            temperature: req.temperature ?? 0.85,
            maxOutputTokens: req.maxOutputTokens ?? 1_200,
            ...(req.signal ? { abortSignal: req.signal } : {}),
          },
        });
      } catch (error) {
        throw mapError(error);
      }
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) yield text;
        }
      } catch (error) {
        throw mapError(error);
      }
    },
  };
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
