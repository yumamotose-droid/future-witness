import type { AgentId } from "@/lib/types";

/**
 * Casting.
 *
 * Four agents, four voices. The parts were written before the voices were
 * chosen, so each entry says what the part asks for and why this voice answers
 * it — otherwise the next person to touch this file has only a star name to go
 * on. Gemini's prebuilt voices carry one-word descriptors (Warm, Informative,
 * Firm, Mature); the `style` line is what turns a descriptor into a character.
 *
 * Style is delivery, never identity. Age, gender and accent belong to the
 * voice, so asking for them here fights the model instead of directing it.
 */

export interface VoiceCasting {
  /** A Gemini prebuilt voice name. */
  readonly voice: string;
  /** Delivery direction, sent as speech metadata rather than spoken. */
  readonly styleJa: string;
  /** What the audience should feel. Documentation, not sent to the model. */
  readonly intent: string;
}

export const CASTING: Record<AgentId, VoiceCasting> = {
  MIRAI: {
    // Warm. The one voice that belongs to a person rather than a function,
    // and the only one the piece asks you to believe in.
    voice: "Sulafat",
    styleJa:
      "静かに、ゆっくりと。親しい相手に打ち明けるように。" +
      "句点のあとに少し間を置き、language は穏やかで、感情を抑えたまま伝える。",
    intent: "2050年を生きる一人の人間。説得ではなく、打ち明け話。",
  },
  EVIDENCE: {
    // Informative. Reads findings and their limits; must never sound as if it
    // is arguing, because the moment it does the citations stop being checkable.
    voice: "Charon",
    styleJa:
      "落ち着いて、明瞭に。一定の速さで、強調を置きすぎない。" +
      "事実とその範囲を、過不足なく読み上げる口調。",
    intent: "確認できることだけを述べる。熱を持たないことが誠実さ。",
  },
  COUNTER: {
    // Firm. The objection has to land without hectoring — it also objects to
    // this system itself, and a sneering delivery would make that read as a pose.
    voice: "Alnilam",
    styleJa:
      "穏やかに、しかし一歩踏み込んで。問いかけの終わりをわずかに上げ、" +
      "相手を責めずに、考え直す余地を差し出すように。",
    intent: "すべてに反証する。自分自身にも。",
  },
  CHRONOS: {
    // Mature. Narrates branching time; the deepest voice, used least, so it
    // reads as the frame around the others rather than a fifth opinion.
    voice: "Gacrux",
    styleJa:
      "低く、静かに、深く。急がず、一語ずつ置くように。" +
      "時間の流れを案内する語り手の口調。",
    intent: "時間を分岐させる案内人。意見を持たない。",
  },
};

/**
 * The voice the experience opens with.
 *
 * The brief is explicit that four agents must not talk at once. MIRAI speaks
 * by default and the others are something the reader chooses to hear.
 */
export const DEFAULT_SPEAKING_AGENT: AgentId = "MIRAI";

export function castingFor(agent: AgentId): VoiceCasting {
  return CASTING[agent] ?? CASTING[DEFAULT_SPEAKING_AGENT];
}
