/**
 * The 90-second demo, as data.
 *
 * The order follows what the screen actually does. The testimony streams the
 * moment the stance gate opens, so the camera goes there next rather than
 * pretending to catch it later — that was the flaw in the first storyboard.
 *
 * `seconds` is the on-screen duration. `narration` is read by the macOS
 * Japanese voice at `rate`, tuned per segment so the speech fits inside the
 * segment with room to breathe. `subtitle` is burned in; it is the narration
 * split for reading, never a different claim.
 */
export interface Segment {
  id: string;
  seconds: number;
  /** Spoken. Empty string means hold in silence. */
  narration: string;
  /** Burned-in lines, shown in order across the segment. */
  subtitle: string[];
  /** Delay before the narration starts, so a beat can land first. */
  leadInMs: number;
  /** macOS `say -r` value. Japanese voices read ~170 as a calm pace. */
  rate: number;
}

export const SEGMENTS: Segment[] = [
  {
    id: "01-hero",
    seconds: 9,
    leadInMs: 1400,
    rate: 165,
    narration:
      "環境、都市計画、エネルギー。その影響を最も長く受ける人は、いま投票できません。",
    subtitle: [
      "環境、都市計画、エネルギー。",
      "その影響を最も長く受ける人は、いま投票できません。",
    ],
  },
  {
    id: "02-framing",
    seconds: 8,
    leadInMs: 400,
    rate: 175,
    narration:
      "このシステムは、まず問いそのものを疑います。決まったことにしている前提を、取り出して並べる。",
    subtitle: [
      "まず、問いそのものを疑う。",
      "決まったことにしている前提を、取り出して並べる。",
    ],
  },
  {
    id: "03-stakeholders",
    seconds: 9,
    leadInMs: 600,
    rate: 165,
    narration:
      "誰が今日の決定に参加できて、誰ができないのか。このシステムの主題は、この二つの色の差です。",
    subtitle: [
      "誰が今日の決定に参加できて、誰ができないのか。",
      "主題は、この二つの色の差。",
    ],
  },
  {
    id: "04-gate",
    seconds: 8,
    leadInMs: 300,
    rate: 180,
    narration:
      "ここで一度止まります。AIの出力を見る前に、あなたの立場を記録する。あとで比べるためです。",
    subtitle: [
      "AIの出力を見る前に、あなたの立場を記録する。",
      "あとで比べるために。",
    ],
  },
  {
    id: "05-voice",
    seconds: 11,
    leadInMs: 1400,
    rate: 170,
    narration:
      "語るのは、その未来に暮らす一人です。予測ではなく、条件付きの仮の話。それを隠さずラベルで言います。",
    subtitle: [
      "語るのは、その未来に暮らす一人。",
      "予測ではなく、条件付きの仮の話。",
      "それを隠さず、ラベルで言う。",
    ],
  },
  {
    id: "06-evidence",
    seconds: 9,
    leadInMs: 400,
    rate: 175,
    narration:
      "数値には、必ずその数値の限界が付きます。限界を外した数字は、正しくても人を誤らせるからです。",
    subtitle: [
      "数値には、必ずその限界が付く。",
      "限界を外した数字は、正しくても人を誤らせる。",
    ],
  },
  {
    id: "07-cores",
    seconds: 9,
    leadInMs: 400,
    rate: 175,
    narration:
      "選択肢ごとに、二千三十年から二千五十年までを積み上げる。横に読めば、どこで分かれるかが見えます。",
    subtitle: [
      "選択肢ごとに、2030年・2040年・2050年を積み上げる。",
      "横に読めば、どこで分かれるかが見える。",
    ],
  },
  {
    id: "08-counter",
    seconds: 11,
    leadInMs: 500,
    rate: 170,
    narration:
      "反証役は、このシステム自身の演出も攻撃します。自分の見せ方を疑わない装置は、信用できないからです。",
    subtitle: [
      "反証役は、このシステム自身の演出も攻撃する。",
      "自分の見せ方を疑わない装置は、信用できない。",
    ],
  },
  {
    id: "09-audit",
    seconds: 11,
    leadInMs: 300,
    rate: 180,
    narration:
      "示された出典が実在するかを毎回照合します。存在しないものは画面に出る前に削除され、削除した件数も表示します。",
    subtitle: [
      "示された出典が実在するかを、毎回照合する。",
      "存在しないものは、画面に出る前に削除される。",
      "削除した件数も、そのまま表示する。",
    ],
  },
  {
    id: "10-close",
    seconds: 5,
    leadInMs: 200,
    rate: 170,
    narration: "決めるのはあなたで、記録もあなたのものです。",
    subtitle: ["決めるのはあなたで、記録もあなたのものです。"],
  },
];

export const TOTAL_SECONDS = SEGMENTS.reduce((n, s) => n + s.seconds, 0);
