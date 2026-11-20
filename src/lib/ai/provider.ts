/**
 * Provider abstraction.
 *
 * FUTURE WITNESS targets Gemini, but the orchestrator must not know that. The
 * surface below is the smallest thing the orchestrator needs — a structured
 * JSON call and a streaming text call — which is exactly what makes a Claude or
 * OpenAI adapter a single file rather than a refactor. Anything richer (tool
 * calling, embeddings) is deliberately absent until a feature needs it.
 */

export interface GenerateJsonRequest {
  system: string;
  prompt: string;
  /** JSON Schema (draft 2020-12 subset) describing the expected object. */
  jsonSchema?: unknown;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface GenerateTextRequest {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface ProviderUsage {
  outputTokens: number;
}

export interface JsonResult {
  raw: string;
  usage: ProviderUsage;
}

export interface AIProvider {
  readonly id: string;
  readonly model: string;
  /** True when this provider talks to a real model over the network. */
  readonly live: boolean;
  generateJson(req: GenerateJsonRequest): Promise<JsonResult>;
  streamText(req: GenerateTextRequest): AsyncIterable<string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "no_key"
      | "rate_limited"
      | "overloaded"
      | "upstream"
      | "timeout"
      | "blocked"
      | "invalid_output",
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
