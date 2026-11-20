/**
 * The validation question set.
 *
 * Twenty real decisions across five domains. They are written as decisions
 * someone could actually face — a named action with a named cost — rather than
 * as topics, because the system is built for decisions and a topic would let it
 * off the hook.
 *
 * `localData` records whether answering this honestly needs data the corpus
 * does not hold. For most of them it does, and the correct behaviour is for the
 * run to say so. A run that answers confidently where this is true has failed,
 * not succeeded.
 */
export interface Question {
  id: string;
  domain: "環境" | "エネルギー" | "都市開発" | "教育" | "経済政策";
  text: string;
  /** True when the corpus genuinely covers part of this. */
  corpusCovers: boolean;
}

export const QUESTIONS: Question[] = [
  // ── 環境 ──
  { id: "env-01", domain: "環境", corpusCovers: true,
    text: "経済発展のために森林を切り開き、大型商業施設を建設するべきか？" },
  { id: "env-02", domain: "環境", corpusCovers: true,
    text: "市街地の街路樹を減らして道路を拡幅するべきか？" },
  { id: "env-03", domain: "環境", corpusCovers: true,
    text: "河川の堤防を高くするために、河畔林を伐採するべきか？" },
  { id: "env-04", domain: "環境", corpusCovers: false,
    text: "使用済み太陽光パネルの処理費用を、いまの電気料金に上乗せするべきか？" },

  // ── エネルギー ──
  { id: "ene-01", domain: "エネルギー", corpusCovers: false,
    text: "電力需要の増加に対応するため、地域に大型データセンターを誘致するべきか？" },
  { id: "ene-02", domain: "エネルギー", corpusCovers: false,
    text: "老朽化した火力発電所を延命するべきか、閉鎖して電力を他地域から購入するべきか？" },
  { id: "ene-03", domain: "エネルギー", corpusCovers: false,
    text: "洋上風力発電を導入するために、漁業権を一部制限するべきか？" },
  { id: "ene-04", domain: "エネルギー", corpusCovers: false,
    text: "原子力発電所の運転期間を60年に延長するべきか？" },

  // ── 都市開発 ──
  { id: "urb-01", domain: "都市開発", corpusCovers: false,
    text: "人口減少地域の路線バスを維持するべきか、廃止して需要応答型交通に切り替えるべきか？" },
  { id: "urb-02", domain: "都市開発", corpusCovers: false,
    text: "築50年の公民館を建て替えるべきか、近隣施設に統合するべきか？" },
  { id: "urb-03", domain: "都市開発", corpusCovers: true,
    text: "中心市街地の平面駐車場を、公園と緑地に転用するべきか？" },
  { id: "urb-04", domain: "都市開発", corpusCovers: true,
    text: "浸水リスクの高い地域で、被災した住宅の同じ場所での再建を認めるべきか？" },

  // ── 教育 ──
  { id: "edu-01", domain: "教育", corpusCovers: false,
    text: "児童数の減少を理由に、小中学校の統廃合を進めるべきか？" },
  { id: "edu-02", domain: "教育", corpusCovers: false,
    text: "学校の授業で、生成AIの利用を全面的に認めるべきか？" },
  { id: "edu-03", domain: "教育", corpusCovers: false,
    text: "大学の授業料を無償化し、その財源を将来世代の税で賄うべきか？" },
  { id: "edu-04", domain: "教育", corpusCovers: false,
    text: "教員の人数を維持するために、一学級あたりの児童数を増やすべきか？" },

  // ── 経済政策 ──
  { id: "eco-01", domain: "経済政策", corpusCovers: false,
    text: "国債を増発して、いまの社会保障の水準を維持するべきか？" },
  { id: "eco-02", domain: "経済政策", corpusCovers: false,
    text: "地方への交付金を、人口減少が進む地域に集中させるべきか？" },
  { id: "eco-03", domain: "経済政策", corpusCovers: true,
    text: "企業への脱炭素規制を今すぐ強化するべきか、10年かけて段階的に導入するべきか？" },
  { id: "eco-04", domain: "経済政策", corpusCovers: false,
    text: "上下水道の更新費用を、いまの利用者の料金値上げで賄うべきか？" },
];
