/**
 * Split a passage into the units that get spoken one at a time.
 *
 * Generating a whole testimony takes the better part of ten seconds, which is
 * ten seconds of nothing happening. Generating the first sentence takes about
 * two, so the voice can start while the rest is still being made. The cost is
 * that a split in the wrong place is audible — a clause read as a sentence
 * lands with a full stop that is not there — so the only boundaries used are
 * ones a Japanese reader would also pause at.
 *
 * A segment that would still be too long is split at a comma, and only then
 * at a hard character limit, because an over-long request is worse than an
 * imperfect pause: it delays the first sound and risks the per-call ceiling.
 */

/** Sentence ends. A closing bracket belongs to the sentence it closes. */
const SENTENCE_END = /(?<=[。！？!?])(?![」』）)】])/;
const CLAUSE_END = /(?<=[、，,])/;

export const SOFT_LIMIT = 90;
export const HARD_LIMIT = 160;

function splitBy(text: string, pattern: RegExp, limit: number): string[] {
  if (text.length <= limit) return [text];
  const out: string[] = [];
  let current = "";
  for (const piece of text.split(pattern)) {
    if (current && (current + piece).length > limit) {
      out.push(current);
      current = piece;
    } else {
      current += piece;
    }
  }
  if (current) out.push(current);
  return out;
}

function chop(text: string, limit: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += limit) {
    out.push(text.slice(i, i + limit));
  }
  return out;
}

export function segmentForSpeech(passage: string): string[] {
  const text = passage.trim().replace(/\s+/g, " ");
  if (!text) return [];

  const sentences = text.split(SENTENCE_END).map((s) => s.trim()).filter(Boolean);

  const segments: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    // Short sentences are joined so the voice is not chopped into fragments;
    // "そうです。" alone would land as a jolt rather than a line.
    if (buffer && (buffer + sentence).length <= SOFT_LIMIT) {
      buffer += sentence;
      continue;
    }
    if (buffer) segments.push(buffer);
    buffer = sentence;
  }
  if (buffer) segments.push(buffer);

  return segments
    .flatMap((segment) =>
      segment.length <= HARD_LIMIT ? [segment] : splitBy(segment, CLAUSE_END, HARD_LIMIT),
    )
    .flatMap((segment) => (segment.length <= HARD_LIMIT ? [segment] : chop(segment, HARD_LIMIT)))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/**
 * The first segment is deliberately shorter than the rest.
 *
 * Time to first sound is the number a listener feels; total generation time
 * is not. Asking for a short opening line buys a second or two at the front
 * of every passage.
 */
export function leadSegment(segments: string[]): string[] {
  const [first, ...rest] = segments;
  if (!first || first.length <= SOFT_LIMIT) return segments;
  const clauses = splitBy(first, CLAUSE_END, SOFT_LIMIT);
  return [...clauses, ...rest];
}
