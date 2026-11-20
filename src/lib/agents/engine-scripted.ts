import type {
  Claim,
  Framing,
  Indicator,
  Option,
  Scenario,
  Statement,
  Stratum,
  Witness,
} from "@/lib/types";
import { HORIZONS } from "@/lib/types";
import type {
  DeliberationEngine,
  RunContext,
  VoiceHandle,
} from "./engine";
import {
  FOREST_COUNTER,
  FOREST_EVIDENCE,
  FOREST_FRAMING,
  FOREST_OPTIONS,
  FOREST_SCENARIOS,
  FOREST_TOPIC_KEYS,
  FOREST_UNCERTAINTY,
  FOREST_VOICES,
  FOREST_VOICES_EN,
  FOREST_WITNESSES,
} from "./scripts/forest";

/**
 * The scripted engine.
 *
 * Two behaviours live here and the difference is visible to the user:
 *
 *  - `curated`: a hand-written deliberation for the demo topic. Full quality,
 *    labelled 事前生成 in the UI.
 *  - `derived`: for any other question without a live model. It does NOT invent
 *    content. The evidence section is assembled from real findings retrieved
 *    from the corpus, verbatim and correctly cited; the framing, scenarios and
 *    narrative are openly templated, and the UI says so.
 *
 * Neither path is ever presented as live model output. `RunMode` is "scripted"
 * for both, and the audit panel reports the model as such.
 */

export type ScriptKind = "curated" | "derived";

export function detectScript(question: string, topicKey?: string): ScriptKind {
  if (topicKey === "forest") return "curated";
  const q = question.toLowerCase();
  const hits = FOREST_TOPIC_KEYS.filter((k) =>
    q.includes(k.toLowerCase()),
  ).length;
  return hits >= 2 ? "curated" : "derived";
}

/**
 * Pacing for the scripted testimony.
 *
 * This was 7 characters every 22ms — about 320 characters a second, which
 * finished a 200-character testimony in under a second. The design intent is
 * that this one passage slows the reader down, and at that speed it did not:
 * by the time you scrolled to it, it was already written. Roughly 55 characters
 * a second is still faster than reading, but the writing is visible and the
 * passage lands as something being said rather than something already printed.
 */
async function* streamString(
  text: string,
  { chunk = 3, delayMs = 55 }: { chunk?: number; delayMs?: number } = {},
): AsyncIterable<string> {
  for (let i = 0; i < text.length; i += chunk) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    yield text.slice(i, i + chunk);
  }
}

/* ------------------------------------------------------------------ *
 * Derived path — templates plus real, correctly cited findings.
 * ------------------------------------------------------------------ */

const TOPIC_TO_INDICATOR: Record<string, string> = {
  森林: "carbon",
  炭素: "carbon",
  気候: "carbon",
  forest: "carbon",
  carbon: "carbon",
  climate: "carbon",
  生物多様性: "biodiversity",
  biodiversity: "biodiversity",
  土地利用: "biodiversity",
  "land-use": "biodiversity",
  都市: "heat",
  気温: "heat",
  urban: "heat",
  temperature: "heat",
  緑地: "amenity",
  greenery: "amenity",
  健康: "health",
  health: "health",
  防災: "flood_risk",
  disaster: "flood_risk",
  水: "flood_risk",
  water: "flood_risk",
  経済: "local_economy",
  economics: "local_economy",
  政策: "institutions",
  policy: "institutions",
  制度: "institutions",
  institutions: "institutions",
  世代間: "intergenerational",
  intergenerational: "intergenerational",
  民主主義: "institutions",
  democracy: "institutions",
};

const INDICATOR_LABEL: Record<string, { ja: string; en: string }> = {
  carbon: { ja: "炭素・気候", en: "Carbon & climate" },
  biodiversity: { ja: "生物多様性", en: "Biodiversity" },
  heat: { ja: "暑熱環境", en: "Heat environment" },
  amenity: { ja: "居住環境", en: "Living environment" },
  health: { ja: "健康", en: "Health" },
  flood_risk: { ja: "災害リスク", en: "Disaster risk" },
  local_economy: { ja: "地域経済", en: "Local economy" },
  institutions: { ja: "制度の持続性", en: "Institutional durability" },
  intergenerational: { ja: "世代間の負担", en: "Intergenerational burden" },
  reversibility: { ja: "やり直せるか", en: "Reversibility" },
};

function derivedIndicatorKeys(ctx: RunContext): string[] {
  const keys = new Set<string>();
  for (const hit of ctx.hits) {
    for (const topic of hit.source.topics) {
      const key = TOPIC_TO_INDICATOR[topic] ?? TOPIC_TO_INDICATOR[topic.toLowerCase()];
      if (key) keys.add(key);
    }
  }
  keys.add("local_economy");
  const ordered = [...keys].slice(0, 4);
  ordered.push("reversibility");
  return [...new Set(ordered)];
}

type Lean = "act" | "hold" | "stage";

function derivedDirection(
  key: string,
  lean: Lean,
): Indicator["direction"] {
  if (key === "local_economy") {
    return lean === "act" ? "up" : lean === "hold" ? "down" : "mixed";
  }
  if (key === "reversibility") {
    return lean === "act" ? "down" : lean === "hold" ? "up" : "mixed";
  }
  return lean === "act" ? "down" : lean === "hold" ? "up" : "mixed";
}

function derivedIndicators(ctx: RunContext, lean: Lean): Indicator[] {
  return derivedIndicatorKeys(ctx).map((key) => {
    const label = INDICATOR_LABEL[key] ?? { ja: key, en: key };
    const supporting = ctx.hits
      .flatMap((h) =>
        h.source.topics.some(
          (t) =>
            (TOPIC_TO_INDICATOR[t] ?? TOPIC_TO_INDICATOR[t.toLowerCase()]) ===
            key,
        )
          ? h.source.findings.map((f) => `${h.source.id}#${f.id}`)
          : [],
      )
      .slice(0, 2);
    return {
      key,
      labelJa: label.ja,
      labelEn: label.en,
      direction: derivedDirection(key, lean),
      noteJa:
        "この方向は、この問いの構造から導いた推論であり、対象地域の測定値ではない。",
      noteEn:
        "This direction is inferred from the structure of the question, not measured for the specific case.",
      sourceIds: supporting,
    };
  });
}

const DERIVED_STRATA: Record<Lean, Stratum[]> = {
  act: [
    {
      year: 2030,
      headlineJa: "変更が実行され、短期の効果が現れる",
      headlineEn: "The change is carried out and short-term effects appear",
      detailJa:
        "実行に伴う支出と雇用が発生し、目に見える変化が生まれる。影響のうち測定されるのは短期の指標に偏る。",
      detailEn:
        "Spending and employment follow implementation and the change becomes visible. What gets measured skews to short-term indicators.",
      tone: 0.3,
    },
    {
      year: 2040,
      headlineJa: "維持費用と前提の見直しが重なる",
      headlineEn: "Maintenance costs and revised assumptions arrive together",
      detailJa:
        "当初の需要見通しと実績の差が表に出る。維持費用の負担者が議題になる。",
      detailEn:
        "The gap between projected and actual demand surfaces, and who pays for upkeep reaches the agenda.",
      tone: -0.1,
    },
    {
      year: 2050,
      headlineJa: "元に戻す選択肢が残っているかが問われる",
      headlineEn: "Whether reversal remains possible is tested",
      detailJa:
        "この時点で判断する人は、現在の決定に参加していない。やり直しの費用は当初の想定に含まれていないことが多い。",
      detailEn:
        "Those deciding at this point did not take part in today's decision, and the cost of undoing it was usually never budgeted.",
      tone: -0.4,
    },
  ],
  hold: [
    {
      year: 2030,
      headlineJa: "現状が維持され、期待された効果は生まれない",
      headlineEn: "The status quo holds and the expected gains do not appear",
      detailJa:
        "変更に伴う利益は発生しない。維持に必要な費用と担い手の確保が課題として残る。",
      detailEn:
        "None of the anticipated benefits materialise, while funding and labour for upkeep remain open problems.",
      tone: -0.1,
    },
    {
      year: 2040,
      headlineJa: "維持の費用が誰の負担かが顕在化する",
      headlineEn: "The cost of holding becomes someone's bill",
      detailJa:
        "「何もしない」が無償ではないことが明らかになる。費用を負担する世代と便益を受ける世代が一致しない。",
      detailEn:
        "Doing nothing turns out not to be free, and the generation paying is not the generation benefiting.",
      tone: -0.2,
    },
    {
      year: 2050,
      headlineJa: "選択の余地は残っているが、条件は変わっている",
      headlineEn: "The option is still open, under different conditions",
      detailJa:
        "将来の世代が別の判断を下す余地は残る。一方で、先送りによって選べる幅が狭まっている可能性がある。",
      detailEn:
        "A future generation can still decide differently, though deferral may have narrowed the range of what it can choose.",
      tone: 0.1,
    },
  ],
  stage: [
    {
      year: 2030,
      headlineJa: "範囲を限定して実行し、条件を契約に書く",
      headlineEn: "A limited version proceeds with conditions in writing",
      detailJa:
        "効果と影響の両方が小さくなる。測定方法と撤退条件を事前に決める必要がある。",
      detailEn:
        "Both the benefit and the harm are smaller. Measurement methods and exit conditions must be fixed in advance.",
      tone: 0.15,
    },
    {
      year: 2040,
      headlineJa: "条件を執行する主体があるかが試される",
      headlineEn: "Whether anyone enforces the conditions is tested",
      detailJa:
        "監視の主体と費用が決まっていなければ、条件は文章にとどまる。ここが段階的選択の最大の弱点になる。",
      detailEn:
        "Without a named monitor and a budget, the conditions stay on paper. This is the weakest point of a staged choice.",
      tone: 0.0,
    },
    {
      year: 2050,
      headlineJa: "条件が守られたかどうかで結果が分かれる",
      headlineEn: "The outcome depends on whether the conditions held",
      detailJa:
        "守られていれば中間の結果が残る。守られていなければ、全面実行と同じ結果に、守られなかった記録が加わる。",
      detailEn:
        "If they held, an intermediate outcome remains. If not, the result matches full implementation plus a record of a broken condition.",
      tone: 0.2,
    },
  ],
};

const DERIVED_VOICES: Record<Lean, { witness: Witness; body: string }> = {
  act: {
    witness: {
      nameJa: "名を伏せた証人 A",
      nameEn: "Witness A (name withheld)",
      age: 26,
      bornIn: 2024,
      placeJa: "この決定が実行された土地",
      placeEn: "the place where this decision was carried out",
    },
    body:
      "朝のいちばん最初の音が、十年前と変わりました。便利になったものは確かにあって、それは毎日使っています。ただ、前の状態を知っている人がもう少なくて、何が変わったのかを説明できる人がいません。去年、維持費の話が回覧で回ってきました。誰が決めたのかは書いてありませんでした。選べたはずの時期に自分はいなかった、ということだけが、はっきりしています。",
  },
  hold: {
    witness: {
      nameJa: "名を伏せた証人 B",
      nameEn: "Witness B (name withheld)",
      age: 29,
      bornIn: 2021,
      placeJa: "変更が行われなかった土地",
      placeEn: "the place where the change was not made",
    },
    body:
      "ここは、見た目はあまり変わっていません。変わらないために払われたお金の話は、子どもの頃から聞いています。同級生の多くは出ていきました。残ったものがある代わりに、増えなかったものがある。どちらがよかったのかは、いまも分かりません。ただ、まだ選べる状態で渡された、という感覚はあります。それは、思っていたより重たいものでした。",
  },
  stage: {
    witness: {
      nameJa: "名を伏せた証人 C",
      nameEn: "Witness C (name withheld)",
      age: 25,
      bornIn: 2025,
      placeJa: "条件付きで実行された土地",
      placeEn: "the place where it was done on conditions",
    },
    body:
      "半分だけ、という言い方をします。残った部分と、変わった部分が隣り合っている。慣れると、両方あるのが普通に思えてきます。公民館に、誰が測って誰が止めたかの記録が綴じてあります。それが残っているのが、たぶんいちばん効いたことでした。約束のうち守られていないものも、ちゃんと書いてあります。それも含めて渡されたのだと思っています。",
  },
};

function derivedFraming(ctx: RunContext): Framing {
  return {
    coreJa: `問われているのは次の決定である。「${ctx.question}」この決定の効果と負担は同じ時間軸に乗っていない。`,
    coreEn: `The decision in question: "${ctx.question}" Its benefits and its burdens do not sit on the same timeline.`,
    assumptions: [
      {
        kind: "inference",
        text: "この問いは、判断の効果が測定可能な期間内に現れることを前提にしている。効果が数十年後に現れる場合、現在の判断者はその結果を見ない。",
        textEn:
          "The question assumes the effects of the decision appear within a measurable period. Where they appear decades later, the people deciding today never see the result.",
        sourceIds: [],
      },
      {
        kind: "verified",
        text: "市場では将来世代が価格を通じて意思を示せず、民主制では投票できないため、将来世代の利害は構造的に意思決定から外れる。",
        textEn:
          "Future generations cannot express preferences through prices in markets and cannot vote in democracies, so their interests are structurally excluded from decisions.",
        sourceIds: ["future-design-saijo#absence-of-future-generations"],
      },
      {
        kind: "unknown",
        text: "この問いには対象の地域、規模、時期が含まれていない。地域データなしに結論を出すことは、どの方向であっても根拠を欠く。",
        textEn:
          "The question names no locality, no scale and no timing. Reaching a conclusion without local data is unfounded in either direction.",
        sourceIds: [],
      },
    ],
    stakeholders: [
      {
        nameJa: "いま意思決定に参加できる人",
        nameEn: "Those who can take part today",
        horizonJa: "今後10〜30年。投票・意見提出・契約を通じて参加できる。",
        horizonEn:
          "The next 10–30 years, through voting, public comment and contracts.",
        hasVote: true,
      },
      {
        nameJa: "2050年にこの決定の結果の中で暮らす人",
        nameEn: "Those who will live inside the result in 2050",
        horizonJa: "2050年以降。現在の意思決定に参加する手段を持たない。",
        horizonEn: "2050 onward, with no means of participating today.",
        hasVote: false,
      },
      {
        nameJa: "まだ生まれていない世代",
        nameEn: "Generations not yet born",
        horizonJa: "2060年以降。市場でも選挙でも意思を示せない。",
        horizonEn:
          "2060 onward, unable to express preferences in markets or elections.",
        hasVote: false,
      },
    ],
  };
}

function derivedOptions(ctx: RunContext): Option[] {
  const subject = ctx.question.replace(/[？?]+$/, "");
  return [
    {
      id: "A",
      labelJa: "提案どおり実行する",
      labelEn: "Carry it out as proposed",
      summaryJa: `「${subject}」を当初の規模と時期で実行する。短期の効果を最大化し、長期の負担は将来の判断に委ねる。`,
      summaryEn: `Implement "${subject}" at the original scale and timing, maximising near-term effects and leaving long-term burdens to later decisions.`,
    },
    {
      id: "B",
      labelJa: "実行しない",
      labelEn: "Do not carry it out",
      summaryJa:
        "現状を維持する。期待された効果は生まれず、現状を維持するための費用と担い手は引き続き必要になる。",
      summaryEn:
        "Keep the status quo. The expected benefits do not arrive, and the cost and labour of maintaining the current state continue.",
    },
    {
      id: "C",
      labelJa: "範囲を限定し、撤退条件を定めて段階的に実行する",
      labelEn: "Stage it, with a capped scope and defined exit conditions",
      summaryJa:
        "規模に上限を設け、測定結果を条件に次段階の可否を判断する。撤退時の費用を事前に積み立て、監視主体と違反時の執行方法を契約に明記する。",
      summaryEn:
        "Cap the scope, make the next stage conditional on measured results, pre-fund the cost of exit, and name the monitor and enforcement route in the contract.",
    },
  ];
}

function derivedEvidence(ctx: RunContext): Statement {
  const claims: Claim[] = [];
  for (const hit of ctx.hits.slice(0, 5)) {
    for (const finding of hit.source.findings.slice(0, 2)) {
      claims.push({
        kind: "verified",
        text: finding.ja,
        textEn: finding.en,
        sourceIds: [`${hit.source.id}#${finding.id}`],
      });
      claims.push({
        kind: "verified",
        text: `この数値の限界: ${finding.caveatJa}`,
        textEn: `Limitation: ${finding.caveatEn}`,
        sourceIds: [`${hit.source.id}#${finding.id}`],
      });
    }
  }
  claims.push({
    kind: "inference",
    text: "上の資料はいずれも全国規模または地球規模の統計であり、この問いが指す具体的な場所・規模・時期には直接適用できない。適用範囲の外で使うと、正しい数値から誤った結論が出る。",
    textEn:
      "Every document above is a national or global statistic and does not apply directly to the place, scale and timing this question points at. Used outside its scope, a correct figure produces a wrong conclusion.",
    sourceIds: [],
  });
  claims.push({
    kind: "unknown",
    text: "この問いに固有の地域データ（対象の位置、規模、関係者の数、代替案の費用）はこのコーパスに含まれていない。これらなしでは賛否の判定はできない。",
    textEn:
      "The local data specific to this question — where, how large, how many people affected, what the alternatives cost — is not in this corpus. Without it, no verdict can be reached.",
    sourceIds: [],
  });
  return {
    id: `${ctx.runId}-evidence`,
    agent: "EVIDENCE",
    titleJa: "この問いに関連し、かつ出典を確認できる記述",
    titleEn: "Statements related to this question whose sources are verifiable",
    claims: claims.slice(0, 14),
  };
}

function derivedScenarios(ctx: RunContext): Scenario[] {
  const options = ctx.options ?? derivedOptions(ctx);
  const leans: Lean[] = ["act", "hold", "stage"];
  const names: Record<Lean, { ja: string; en: string }> = {
    act: { ja: "実行した場合の50年", en: "Fifty years after acting" },
    hold: { ja: "実行しなかった場合の50年", en: "Fifty years of not acting" },
    stage: {
      ja: "条件付きで実行した場合の50年",
      en: "Fifty years under conditions",
    },
  };
  return leans.map((lean, index) => ({
    id: String.fromCharCode(65 + index),
    optionId: options[index]?.id ?? String.fromCharCode(65 + index),
    nameJa: names[lean].ja,
    nameEn: names[lean].en,
    premiseJa:
      "この筋書きは、問いの構造から組み立てた条件付きの仮想シナリオである。対象地域の測定値に基づくものではなく、予測ではない。",
    premiseEn:
      "A conditional hypothetical built from the structure of the question. It is not based on measurements for the specific case and is not a forecast.",
    strata: DERIVED_STRATA[lean].map((s) => ({ ...s })),
    indicators: derivedIndicators(ctx, lean),
  }));
}

function derivedCounter(ctx: RunContext): Statement {
  return {
    id: `${ctx.runId}-counter`,
    agent: "COUNTER",
    titleJa: "ここまでの全体に対する反証",
    titleEn: "Objections to everything above",
    selfCritique: {
        kind: "inference",
        text: "このシステム自体への反証。2050年の語りは感覚的な細部で書かれ、便益は抽象語で書かれている。この非対称な描写は、根拠によらず現状維持側へ読者を誘導しうる。読者はこの配分を疑うべきである。",
        textEn:
          "An objection to this system. The 2050 narrative is written in sensory detail while the benefits are written in abstractions. That asymmetry can push the reader toward the status quo without evidence. Distrust the distribution.",
        sourceIds: [],
      },
    claims: [
      {
        kind: "inference",
        text: "三つの選択肢はいずれも、判断に必要な地域データが存在しないまま並べられている。選択肢が整って見えること自体が、判断可能であるという誤った印象を与える。",
        textEn:
          "All three options are laid out without the local data a decision requires. That they look orderly is itself misleading: it suggests the question is decidable when it is not.",
        sourceIds: [],
      },
      {
        kind: "inference",
        text: "選択肢Cの「条件付き」は、監視の主体・測定方法・違反時の執行機関が決まらなければ、実質的にAと同じ結果になる。中間案は、制度設計を後回しにする口実になりやすい。",
        textEn:
          "Option C's “conditions” produce the same outcome as A unless the monitor, the measurement method and the enforcement body are named. A middle option is an easy excuse for deferring institutional design.",
        sourceIds: [],
      },
      {
        kind: "inference",
        text: "「実行しない」が無償であるという前提も疑うべきである。現状維持には費用と担い手が必要で、その負担も将来に先送りされる。",
        textEn:
          "The assumption that not acting is free should also be doubted. Holding the status quo costs money and labour, and that burden is deferred into the future too.",
        sourceIds: [],
      },
      {
        kind: "verified",
        text: "きわめて包摂的に設計された熟議プロセスであっても将来世代と自然は除外されうると指摘されている。AIによる代弁が適切かという規範的論点は未解決として扱われており、本システムもその例外ではない。",
        textEn:
          "Even highly inclusive deliberative processes may exclude future generations and nature. Whether AI is an appropriate proxy is treated as an open normative question, and this system is no exception to it.",
        sourceIds: ["stanford-pacs-ai-voice#excluded-from-deliberation"],
      },
      {
        kind: "inference",
        text: "この実行は脚本エンジンによるもので、生成モデルは接続されていない。したがって上の反証は、この問いに対して個別に考えられたものではなく、構造から用意された定型文である。個別の論点は見落とされている。",
        textEn:
          "This run came from the scripted engine; no generative model was connected. These objections were therefore not reasoned about this question in particular — they are prepared from its structure, and the specific issues have been missed.",
        sourceIds: [],
      },
    ],
  };
}

function derivedUncertainty(ctx: RunContext): Statement {
  return {
    id: `${ctx.runId}-uncertainty`,
    agent: "EVIDENCE",
    titleJa: "決着していない論点と、何があれば決着するか",
    titleEn: "What remains unresolved, and what would resolve it",
    claims: [
      {
        kind: "unknown",
        text: "この問いが指す対象の規模と範囲が不明である。解決には、提案者が持つ計画書と対象範囲の図面の開示が必要になる。",
        textEn:
          "The scale and extent of what this question points at are unknown. Resolving it needs the proposer to disclose the plan and a map of the area affected.",
        sourceIds: [],
      },
      {
        kind: "unknown",
        text: "影響を受ける人数とその年齢構成が不明である。解決には、地域別の人口推計と、影響範囲の重ね合わせが必要になる。",
        textEn:
          "How many people are affected, and of what ages, is unknown. Resolving it needs regional population projections overlaid on the area of effect.",
        sourceIds: [],
      },
      {
        kind: "unknown",
        text: "やり直す場合の費用と、それを負担する主体が不明である。解決には、撤退・復旧費用の見積と、その担保方法の明示が必要になる。",
        textEn:
          "The cost of undoing this, and who would bear it, are unknown. Resolving it needs an estimate of exit and restoration costs and a statement of how they are secured.",
        sourceIds: [],
      },
      {
        kind: "inference",
        text: "このコーパスは全国・地球規模の資料で構成されており、構造的に個別の判断には答えられない。この限界は資料を増やしても、対象地域のデータが入るまで解消しない。",
        textEn:
          "This corpus is built from national and global documents and structurally cannot answer an individual case. More documents will not fix that until local data is present.",
        sourceIds: [],
      },
      {
        kind: "unknown",
        text: "本システムが意思決定の質を実際に改善するかは未検証である。立場の事前事後の変化は記録されるが、変化が改善を意味する保証はない。",
        textEn:
          "Whether this system actually improves decision quality is untested. It records the change in position, but a change is no guarantee of improvement.",
        sourceIds: ["mit-future-you#anxiety-reduction"],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */

export function createScriptedEngine(
  kind: ScriptKind,
  { instant = false }: { instant?: boolean } = {},
): DeliberationEngine {
  const delayMs = instant ? 0 : 55;

  return {
    mode: "scripted",
    model:
      kind === "curated"
        ? "scripted:forest-v1 (hand-written, no model call)"
        : "scripted:derived-v1 (templates + retrieved corpus, no model call)",

    async framing(ctx): Promise<Framing> {
      return kind === "curated" ? FOREST_FRAMING : derivedFraming(ctx);
    },

    async options(ctx): Promise<Option[]> {
      return kind === "curated" ? FOREST_OPTIONS : derivedOptions(ctx);
    },

    async evidence(ctx): Promise<Statement> {
      return kind === "curated"
        ? { ...FOREST_EVIDENCE, id: `${ctx.runId}-evidence` }
        : derivedEvidence(ctx);
    },

    async scenarios(ctx): Promise<Scenario[]> {
      return kind === "curated"
        ? FOREST_SCENARIOS.map((s) => ({
            ...s,
            strata: s.strata.map((st) => ({ ...st })),
            indicators: s.indicators.map((i) => ({
              ...i,
              sourceIds: [...i.sourceIds],
            })),
          }))
        : derivedScenarios(ctx);
    },

    async voice(ctx, scenario): Promise<VoiceHandle> {
      if (kind === "curated") {
        const witness =
          FOREST_WITNESSES[scenario.id] ?? FOREST_WITNESSES.A;
        const primary = ctx.lang === "en" ? FOREST_VOICES_EN : FOREST_VOICES;
        const other = ctx.lang === "en" ? FOREST_VOICES : FOREST_VOICES_EN;
        const body = primary[scenario.id] ?? primary.A;
        return {
          witness,
          stream: streamString(body, { delayMs }),
          alternate: other[scenario.id] ?? other.A,
        };
      }
      const leans: Lean[] = ["act", "hold", "stage"];
      const index = Math.max(
        0,
        (ctx.scenarios ?? []).findIndex((s) => s.id === scenario.id),
      );
      const picked = DERIVED_VOICES[leans[index] ?? "stage"];
      return {
        witness: picked.witness,
        stream: streamString(picked.body, { delayMs }),
      };
    },

    async counter(ctx): Promise<Statement> {
      return kind === "curated"
        ? { ...FOREST_COUNTER, id: `${ctx.runId}-counter` }
        : derivedCounter(ctx);
    },

    async uncertainty(ctx): Promise<Statement> {
      return kind === "curated"
        ? { ...FOREST_UNCERTAINTY, id: `${ctx.runId}-uncertainty` }
        : derivedUncertainty(ctx);
    },
  };
}

export { HORIZONS };
