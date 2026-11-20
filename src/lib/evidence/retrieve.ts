import { CORPUS, FINDING_INDEX } from "./corpus";
import type { SourceRecord } from "@/lib/types";

/**
 * Deliberately simple lexical retrieval.
 *
 * The corpus is small and hand-curated, so an embedding index would add a
 * dependency and a failure mode without improving recall. What matters for
 * trustworthiness is not ranking quality but the guarantee that the agent is
 * shown a bounded set of findings and can cite nothing outside it.
 */

const STOP = new Set([
  "の","に","は","を","が","と","で","た","し","て","も","な","から","まで","など",
  "こと","ため","する","される","について","における","べき","か","や","これ","それ",
  "the","a","an","of","to","in","for","and","or","is","are","be","on","we","should",
  "do","does","it","this","that","with","as","by","at","from","about","can","will",
]);

/** Character n-grams handle Japanese without a morphological analyser. */
function tokenize(text: string): string[] {
  const lowered = text.toLowerCase();
  const latin = lowered.match(/[a-z][a-z-]{1,}/g) ?? [];
  const cjk = lowered.match(/[぀-ヿ一-鿿]+/g) ?? [];
  const bigrams: string[] = [];
  for (const run of cjk) {
    for (let i = 0; i < run.length - 1; i += 1) {
      bigrams.push(run.slice(i, i + 2));
    }
    if (run.length === 1) bigrams.push(run);
  }
  return [...latin, ...bigrams].filter((t) => !STOP.has(t));
}

function sourceHaystack(source: SourceRecord): string {
  return [
    source.titleJa,
    source.titleEn,
    source.org,
    source.locator,
    source.region,
    source.scopeJa,
    source.topics.join(" "),
    ...source.findings.flatMap((f) => [f.ja, f.en]),
  ].join(" ");
}

export interface RetrievalHit {
  source: SourceRecord;
  score: number;
}

/**
 * Retrieve candidate sources for a question. Always returns at least
 * `minResults` records so the agent is never left with an empty corpus — an
 * empty corpus is the one condition under which it would be tempted to invent a
 * citation.
 */
export function retrieveSources(
  question: string,
  { limit = 8, minResults = 4 }: { limit?: number; minResults?: number } = {},
): RetrievalHit[] {
  const queryTokens = new Set(tokenize(question));
  const scored: RetrievalHit[] = CORPUS.map((source) => {
    const haystack = sourceHaystack(source).toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (haystack.includes(token)) score += token.length >= 2 ? 1 : 0.5;
    }
    // Reward sources whose declared topics match directly.
    for (const topic of source.topics) {
      if (queryTokens.has(topic.toLowerCase())) score += 2;
      else if (question.includes(topic)) score += 2;
    }
    return { source, score };
  }).sort((a, b) => b.score - a.score);

  const matched = scored.filter((hit) => hit.score > 0).slice(0, limit);
  if (matched.length >= minResults) return matched;
  // Top up with the remaining highest-scoring records.
  const seen = new Set(matched.map((m) => m.source.id));
  for (const hit of scored) {
    if (matched.length >= minResults) break;
    if (!seen.has(hit.source.id)) matched.push(hit);
  }
  return matched;
}

/**
 * Render the retrieved corpus for the model. Every line is prefixed with the
 * exact citation key the model must reuse verbatim.
 */
export function renderCorpusForPrompt(hits: RetrievalHit[]): string {
  return hits
    .map(({ source }) => {
      const findings = source.findings
        .map(
          (f) =>
            `    - [${source.id}#${f.id}] ${f.ja}\n      (limitation: ${f.caveatJa})`,
        )
        .join("\n");
      return [
        `  SOURCE ${source.id}`,
        `    title: ${source.titleJa}`,
        `    publisher: ${source.org} (${source.year})`,
        `    region: ${source.region}`,
        `    applicability: ${source.scopeJa}`,
        `    findings:`,
        findings,
      ].join("\n");
    })
    .join("\n\n");
}

export function citationExists(id: string): boolean {
  return FINDING_INDEX.has(id);
}
