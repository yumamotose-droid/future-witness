/**
 * Input hardening and prompt-injection containment.
 *
 * Two separate threats are handled here:
 *
 *  1. User input reaching the model. We never try to "detect and block"
 *     injection phrases, because that is a losing game and it rejects
 *     legitimate questions (a question *about* prompt injection is a valid
 *     question). Instead the user's text is delimited, length-bounded, and the
 *     system prompt states that text inside the delimiter is data.
 *  2. Model output reaching the DOM. No agent output is ever interpolated as
 *     HTML — React escapes text nodes, and we additionally strip control
 *     characters and any markup-looking payload from claim text so that a
 *     future change to a rendering path cannot turn into stored XSS.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
/**
 * Zero-width and bidirectional control characters used to smuggle hidden
 * instructions past a human reader: the directional overrides (U+202A–U+202E),
 * the directional isolates (U+2066–U+2069), the zero-width joiners and the BOM.
 */
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

export const USER_INPUT_OPEN = "<<<USER_QUESTION";
export const USER_INPUT_CLOSE = "USER_QUESTION>>>";

export function stripInvisible(input: string): string {
  return input.replace(CONTROL_CHARS, "").replace(INVISIBLE, "");
}

/**
 * Prepare untrusted user text for inclusion in a prompt. The delimiter itself
 * is neutralised in the payload so the user cannot close the block early and
 * escape into instruction space.
 */
export function sanitizeQuestion(input: string, max = 600): string {
  let text = stripInvisible(input)
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  text = text
    .split(USER_INPUT_OPEN)
    .join("[delimiter removed]")
    .split(USER_INPUT_CLOSE)
    .join("[delimiter removed]");
  if (text.length > max) text = `${text.slice(0, max)}…`;
  return text;
}

/** Wrap untrusted text so the model sees an unambiguous data boundary. */
export function wrapUserInput(text: string): string {
  return `${USER_INPUT_OPEN}\n${text}\n${USER_INPUT_CLOSE}`;
}

const MARKUP = /<\/?[a-z][\s\S]*?>/gi;

/** Defence in depth for anything the model produced. */
export function sanitizeModelText(input: string, max = 1200): string {
  const text = stripInvisible(String(input ?? ""))
    .replace(MARKUP, "")
    // Tag removal leaves double spaces behind; collapse horizontal runs but
    // keep paragraph breaks, which carry meaning in the narrative passages.
    .replace(/[ \t\u3000]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Citation ids are used as object keys and rendered as references, so they are
 * restricted to the shape the corpus actually uses.
 */
export function sanitizeCitationId(input: string): string {
  return String(input ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9#_.-]/g, "")
    .slice(0, 120);
}

export interface InputRejection {
  code: string;
  messageJa: string;
  messageEn: string;
}

/**
 * Structural checks only. These reject input that cannot be deliberated on,
 * not input whose content we dislike.
 */
export function validateQuestionShape(
  question: string,
): InputRejection | null {
  const text = question.trim();
  if (text.length < 8) {
    return {
      code: "too_short",
      messageJa: "問いが短すぎます。何をどうするかの選択を含めて書いてください。",
      messageEn:
        "That question is too short. Describe a choice: what would be done, and to what.",
    };
  }
  if (text.length > 600) {
    return {
      code: "too_long",
      messageJa: "問いが長すぎます。600文字以内に絞ってください。",
      messageEn: "That question is too long. Keep it under 600 characters.",
    };
  }
  // A wall of a single repeated character is not a question.
  const unique = new Set(text.replace(/\s/g, "")).size;
  if (unique <= 2) {
    return {
      code: "degenerate",
      messageJa: "問いとして読み取れませんでした。文として書いてください。",
      messageEn: "That could not be read as a question. Please write a sentence.",
    };
  }
  return null;
}
