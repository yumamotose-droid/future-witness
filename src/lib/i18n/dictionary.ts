import type { AgentId, EpistemicKind, Lang, Phase } from "@/lib/types";

/** UI chrome strings. Domain content carries its own ja/en fields. */
export const UI = {
  ja: {
    brand: "FUTURE WITNESS",
    brandJa: "未来の証人",
    tagline: "The Future Has a Voice.",
    heroLine1: "未来には、まだ声がない。",
    heroLine2: "あなたの今日の選択について、2050年の人々と話してみませんか？",
    heroEnter: "証言をはじめる",
    heroDemo: "審査員向けデモ（90秒）",
    heroNote:
      "このシステムは未来を予測しません。現在の選択が開く複数の未来を、根拠と反証とともに並べます。",
    questionLabel: "審議にかける決定",
    questionPlaceholder:
      "例：経済発展のために森林を切り開き、大型商業施設を建設するべきか？",
    submit: "審議をはじめる",
    submitting: "審議中…",
    stanceBeforeTitle: "はじめに、いまのあなたの立場",
    stanceBeforeBody:
      "AIの出力を見る前に記録します。あとで、考えが動いたかどうかを比べられるようにするためです。",
    stanceAfterTitle: "審議を終えて、いまのあなたの立場",
    stanceAfterBody:
      "最終的な判断はあなたが行います。システムは判断を代行しません。",
    confidence: "確信の度合い",
    reasonLabel: "その理由",
    reasonPlaceholder: "何を重く見たか、何を切り捨てたかを書いてください。",
    recordStance: "立場を記録する",
    stanceDeltaTitle: "立場の変化",
    stanceUnchanged: "選択は変わりませんでした",
    stanceChanged: "選択が変わりました",
    confidenceDelta: "確信の変化",
    ledger: "証言録",
    options: "選択肢",
    premises: "この問いが置いている前提",
    stakeholders: "影響を受ける人と、投票できるかどうか",
    hasVote: "いま意思決定に参加できる",
    noVote: "いま意思決定に参加できない",
    cores: "未来のコア標本",
    coresBody:
      "選択肢ごとに、2030年・2040年・2050年の層を上から順に重ねています。層の濃さは方向の目安で、確率ではありません。",
    comparison: "比較",
    indicators: "指標",
    audit: "検証記録",
    auditBody:
      "この実行で、出典がコーパスに存在するかどうかを機械的に照合した結果です。",
    auditClaims: "検証した記述",
    auditCitations: "照合した出典",
    auditRejected: "存在せず削除した出典",
    auditDowngrades: "根拠不足で格下げした記述",
    auditDivergence: "シナリオの分岐度",
    auditSources: "使用した資料",
    auditModel: "生成",
    auditElapsed: "所要時間",
    sources: "出典",
    sourcesBody: "この審議で参照した資料の全文情報です。",
    publisher: "発行機関",
    year: "発行年",
    locator: "参照箇所",
    region: "地域",
    scope: "適用範囲",
    checkedOn: "URL確認日",
    report: "意思決定レポート",
    downloadReport: "レポートを保存",
    copyReport: "レポートをコピー",
    openQuestions: "残された疑問",
    openQuestionsPlaceholder: "確かめないまま決めることになる点を書き出す。",
    baselineTitle: "単一AIチャットとの比較",
    baselineBody:
      "同じ問いを、役割分担も出典照合もない通常のチャットに一度だけ投げた結果です。",
    runBaseline: "比較を実行する",
    baselineRunning: "実行中…",
    history: "履歴",
    historyEmpty: "まだ記録がありません。",
    clearHistory: "この端末の記録を消す",
    historyNote:
      "記録はこの端末のブラウザ内にのみ保存されます。サーバーには送信されません。",
    listen: "読み上げる",
    stopListening: "停止",
    speak: "音声で入力",
    stopSpeaking: "入力を終える",
    retry: "やり直す",
    liveBadge: "ライブ生成",
    scriptedBadge: "事前生成",
    scriptedExplain:
      "生成モデルは呼び出していません。表示内容は手で書かれた脚本と、コーパスから検索した実在の資料です。",
    liveExplain: "この実行では生成モデルを呼び出しています。",
    disclaimerTitle: "読むときの注意",
    disclaimer: [
      "このシステムは未来を予測しません。2050年の語りはすべて条件付きの仮想です。",
      "数値は出典とその限界を併記しています。限界を外して数値だけを引用しないでください。",
      "システムは結論を出しません。最終的な判断はあなたが行い、記録もあなたのものです。",
    ],
    skipToContent: "本文へ",
    close: "閉じる",
    langToggle: "English",
    themeToggle: "表示を切り替える",
    waiting: "待機中",
  },
  en: {
    brand: "FUTURE WITNESS",
    brandJa: "未来の証人",
    tagline: "The Future Has a Voice.",
    heroLine1: "The future has no vote yet.",
    heroLine2:
      "Would you talk with the people of 2050 about the choice you make today?",
    heroEnter: "Begin the testimony",
    heroDemo: "Reviewer demo (90 seconds)",
    heroNote:
      "This system does not predict the future. It sets out the several futures a present choice opens, with the evidence and the objections beside them.",
    questionLabel: "The decision under deliberation",
    questionPlaceholder:
      "e.g. Should we clear forest land to build a large commercial complex for economic growth?",
    submit: "Begin deliberation",
    submitting: "Deliberating…",
    stanceBeforeTitle: "First, where you stand now",
    stanceBeforeBody:
      "Recorded before you see any AI output, so you can tell afterwards whether your thinking moved.",
    stanceAfterTitle: "Now that the deliberation is over, where you stand",
    stanceAfterBody:
      "The decision is yours. The system does not make it for you.",
    confidence: "How sure you are",
    reasonLabel: "Why",
    reasonPlaceholder: "What you weighted, and what you set aside.",
    recordStance: "Record your position",
    stanceDeltaTitle: "What moved",
    stanceUnchanged: "Your choice did not change",
    stanceChanged: "Your choice changed",
    confidenceDelta: "Change in certainty",
    ledger: "Testimony record",
    options: "Options",
    premises: "What this question assumes",
    stakeholders: "Who is affected, and who can vote",
    hasVote: "Can take part in today's decision",
    noVote: "Cannot take part in today's decision",
    cores: "Core samples of the future",
    coresBody:
      "One column per option, with the 2030, 2040 and 2050 layers stacked from the top. Tone is a reading aid, not a probability.",
    comparison: "Comparison",
    indicators: "Indicators",
    audit: "Verification record",
    auditBody:
      "The result of mechanically checking every citation in this run against the corpus.",
    auditClaims: "Statements checked",
    auditCitations: "Citations resolved",
    auditRejected: "Citations removed as non-existent",
    auditDowngrades: "Statements downgraded for want of a source",
    auditDivergence: "Scenario divergence",
    auditSources: "Sources used",
    auditModel: "Generation",
    auditElapsed: "Elapsed",
    sources: "Sources",
    sourcesBody: "Full provenance for every document used in this deliberation.",
    publisher: "Publisher",
    year: "Year",
    locator: "Passage",
    region: "Region",
    scope: "Applicability",
    checkedOn: "URL checked on",
    report: "Decision record",
    downloadReport: "Save the record",
    copyReport: "Copy the record",
    openQuestions: "Questions left open",
    openQuestionsPlaceholder:
      "What you will be deciding without having checked.",
    baselineTitle: "Compared with a single AI chat",
    baselineBody:
      "The same question asked once of an ordinary chat assistant, with no roles and no citation checking.",
    runBaseline: "Run the comparison",
    baselineRunning: "Running…",
    history: "History",
    historyEmpty: "Nothing recorded yet.",
    clearHistory: "Erase the records on this device",
    historyNote:
      "Records are kept only in this browser on this device. Nothing is sent to the server.",
    listen: "Read aloud",
    stopListening: "Stop",
    speak: "Speak your question",
    stopSpeaking: "Finish speaking",
    retry: "Try again",
    liveBadge: "Live generation",
    scriptedBadge: "Pre-written",
    scriptedExplain:
      "No model was called. What you see is a hand-written script plus real documents retrieved from the corpus.",
    liveExplain: "This run calls the generative model.",
    disclaimerTitle: "How to read this",
    disclaimer: [
      "This system does not predict. Every 2050 narrative is a conditional hypothetical.",
      "Figures are shown with their sources and their limitations. Do not quote a figure without its limitation.",
      "The system reaches no conclusion. The decision is yours, and so is the record.",
    ],
    skipToContent: "Skip to content",
    close: "Close",
    langToggle: "日本語",
    themeToggle: "Switch appearance",
    waiting: "Waiting",
  },
} as const;

export type UIStrings = (typeof UI)["ja"];

export function t(lang: Lang): UIStrings {
  return UI[lang] as UIStrings;
}

export const AGENT_META: Record<
  AgentId,
  { ja: string; en: string; roleJa: string; roleEn: string }
> = {
  CHRONOS: {
    ja: "クロノス",
    en: "CHRONOS",
    roleJa: "未来を分岐させる",
    roleEn: "Branches the future",
  },
  EVIDENCE: {
    ja: "エビデンス",
    en: "EVIDENCE",
    roleJa: "確認できることだけを述べる",
    roleEn: "States only what can be checked",
  },
  MIRAI: {
    ja: "ミライ",
    en: "MIRAI",
    roleJa: "2050年を生きる一人の生活",
    roleEn: "One life lived in 2050",
  },
  COUNTER: {
    ja: "カウンター",
    en: "COUNTER",
    roleJa: "すべてに反証する",
    roleEn: "Objects to all of it",
  },
};

export const KIND_META: Record<
  EpistemicKind,
  { ja: string; en: string; descJa: string; descEn: string }
> = {
  verified: {
    ja: "確認された根拠",
    en: "Verified evidence",
    descJa: "コーパス内の資料に出典が解決した記述。",
    descEn: "A statement whose citation resolved to a document in the corpus.",
  },
  inference: {
    ja: "根拠に基づく推論",
    en: "Inference",
    descJa: "資料や一般知識から導いた推論。出典そのものではない。",
    descEn: "Reasoning from documents or general knowledge, not itself sourced.",
  },
  hypothetical: {
    ja: "仮想シナリオ",
    en: "Hypothetical",
    descJa: "条件付きの筋書き。予測ではない。",
    descEn: "A conditional narrative. Not a prediction.",
  },
  unknown: {
    ja: "情報不足",
    en: "Unknown",
    descJa: "分からない、または扱える資料がないこと。",
    descEn: "Not known, or not covered by any document we hold.",
  },
};

export const PHASE_META: Record<Phase, { ja: string; en: string }> = {
  framing: { ja: "問いを立て直す", en: "Restating the question" },
  options: { ja: "選択肢を並べる", en: "Laying out the options" },
  evidence: { ja: "根拠を照合する", en: "Checking the evidence" },
  scenarios: { ja: "未来を分岐させる", en: "Branching the future" },
  voices: { ja: "2050年から聞く", en: "Listening from 2050" },
  counter: { ja: "反証する", en: "Objecting" },
  uncertainty: { ja: "分からないことを数える", en: "Counting the unknowns" },
  audit: { ja: "検証結果を綴じる", en: "Filing the verification" },
};
