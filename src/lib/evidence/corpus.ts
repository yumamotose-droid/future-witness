import type { SourceRecord } from "@/lib/types";

/**
 * Curated evidence corpus.
 *
 * Every record here was located by web search and its URL observed in search
 * results on the `checkedOn` date. Figures are transcribed from the summaries of
 * those documents. Each finding carries the limitation that must travel with the
 * number, because most of these values are replacement-cost estimates or
 * inventory figures that are revised annually.
 *
 * The EVIDENCE agent is handed ONLY the findings in this file and may cite
 * nothing else. `verifyCitations` rejects any id that does not appear here, so a
 * fabricated citation cannot reach the user as verified evidence.
 */

const CHECKED = "2026-11-20";

export const CORPUS: SourceRecord[] = [
  {
    id: "jp-ghg-inventory-lulucf",
    titleJa: "日本の温室効果ガス排出・吸収量（LULUCF分野）公表資料",
    titleEn: "Japan's GHG inventory — LULUCF sector",
    org: "環境省 / Ministry of the Environment, Japan",
    year: 2026,
    url: "https://www.env.go.jp/content/000435549.pdf",
    locator: "土地利用・土地利用変化・林業（LULUCF）分野の純吸収量",
    region: "日本",
    scopeJa:
      "国全体の年度集計値。個別の森林や特定地域の吸収量には直接適用できない。年度ごとに改定される。",
    scopeEn:
      "National annual aggregate. Not applicable to a specific forest or locality. Revised each year.",
    checkedOn: CHECKED,
    topics: ["森林", "炭素", "気候", "forest", "carbon", "climate"],
    findings: [
      {
        id: "net-sink-2024",
        ja: "2024年度のLULUCF分野の温室効果ガス純吸収量は 49,421 kt-CO2換算で、1990年度比 35.5%減、前年度比 1.9%減。",
        en: "In FY2024 the LULUCF sector was a net sink of 49,421 kt-CO2eq — 35.5% below FY1990 and 1.9% below the previous year.",
        caveatJa:
          "吸収量の減少は森林の高齢化による成長量低下が主因とされ、伐採量そのものを示す数値ではない。",
        caveatEn:
          "The decline is attributed mainly to ageing forests growing more slowly; it is not a measure of logging volume.",
      },
      {
        id: "net-sink-since-1990",
        ja: "LULUCF分野は1990年度以降、一貫して純吸収（排出より吸収が多い状態）を維持している。",
        en: "The LULUCF sector has been a net sink continuously since FY1990.",
        caveatJa: "純吸収の継続は、吸収量が増えていることを意味しない。",
        caveatEn: "Remaining a net sink does not mean the sink is growing.",
      },
    ],
  },
  {
    id: "jp-forest-white-paper",
    titleJa: "令和7年版 森林・林業白書",
    titleEn: "Annual Report on Forest and Forestry in Japan (FY2025 edition)",
    org: "林野庁 / Forestry Agency, Japan",
    year: 2026,
    url: "https://www.rinya.maff.go.jp/j/kikaku/hakusyo/r7hakusyo_h/all/chap1_4_2.html",
    locator: "第1章 第4節 2（森林吸収源対策・人工林の齢級構成）",
    region: "日本",
    scopeJa: "日本の人工林全体の統計。天然林や海外の森林には適用できない。",
    scopeEn:
      "Statistics for Japan's planted forests as a whole. Not applicable to natural forests or forests abroad.",
    checkedOn: CHECKED,
    topics: ["森林", "林業", "齢級", "forest", "forestry", "age-class"],
    findings: [
      {
        id: "age-class-shift",
        ja: "2021年度時点で、林齢51年以上の人工林が全人工林面積の 64% を占める。齢級構成は高齢側へさらに移動している。",
        en: "As of FY2021, planted forests aged 51 years or more account for 64% of all planted forest area, and the age distribution continues to shift older.",
        caveatJa:
          "高齢化は吸収量の低下と結びつくが、伐採すべき/すべきでないという結論は本統計からは導けない。",
        caveatEn:
          "Ageing is linked to a smaller carbon sink, but the statistic alone does not imply that harvesting is or is not warranted.",
      },
      {
        id: "glasgow-declaration",
        ja: "2021年のCOP26では、日本を含む140か国以上が、2030年までに森林の消失と土地の劣化を好転させる目標を掲げた「森林・土地利用に関するグラスゴー・リーダーズ宣言」に参加した。",
        en: "At COP26 in 2021, more than 140 countries including Japan joined the Glasgow Leaders' Declaration on Forests and Land Use, aiming to halt and reverse forest loss and land degradation by 2030.",
        caveatJa: "政治宣言であり、法的拘束力のある義務ではない。",
        caveatEn:
          "A political declaration, not a legally binding obligation.",
      },
    ],
  },
  {
    id: "jp-forest-sink-target",
    titleJa: "森林吸収量の算定について（地球温暖化対策計画の森林吸収目標）",
    titleEn: "Calculation of forest carbon sinks and Japan's 2030 sink target",
    org: "林野庁 / Forestry Agency, Japan",
    year: 2026,
    url: "https://www.rinya.maff.go.jp/j/keikaku/ondanka/kyushuryosantei.html",
    locator: "地球温暖化対策計画における森林吸収量の目標",
    region: "日本",
    scopeJa: "国の政策目標値。自治体や個別事業の評価基準ではない。",
    scopeEn:
      "A national policy target. Not a benchmark for a municipality or an individual project.",
    checkedOn: CHECKED,
    topics: ["森林", "炭素", "政策", "forest", "carbon", "policy"],
    findings: [
      {
        id: "sink-target-2030",
        ja: "地球温暖化対策計画では、2030年度に約3,800万t-CO2（2013年度総排出量比 2.7%相当）の森林吸収量を確保する目標が掲げられている。",
        en: "Japan's Plan for Global Warming Countermeasures targets a forest sink of roughly 38 million t-CO2 in FY2030, equivalent to 2.7% of FY2013 total emissions.",
        caveatJa:
          "目標値であり達成の保証ではない。現状の純吸収量は目標水準を上回るが減少傾向にある。",
        caveatEn:
          "A target, not an achieved result. The current sink exceeds this level but is declining.",
      },
    ],
  },
  {
    id: "jp-forest-multifunction",
    titleJa: "森林の有する多面的機能（日本学術会議2001年答申の貨幣評価）",
    titleEn:
      "Monetary valuation of forest multifunctionality (Science Council of Japan, 2001)",
    org: "林野庁 / Forestry Agency, Japan（出典: 日本学術会議 答申 2001年11月1日）",
    year: 2001,
    url: "https://www.rinya.maff.go.jp/j/keikaku/tamenteki/index.html",
    locator:
      "「地球環境・人間生活にかかわる農業及び森林の多面的な機能の評価について」答申に基づく機能別評価額",
    region: "日本",
    scopeJa:
      "代替法による全国推計。『森林がない場合』との比較という仮定に依存し、評価対象は多面的機能の一部に限られる。個別の森林の価値額としては使えない。",
    scopeEn:
      "A national replacement-cost estimate that assumes a counterfactual of 'no forest at all' and covers only part of forest functions. Cannot be used as the value of one specific forest.",
    checkedOn: CHECKED,
    topics: ["森林", "防災", "水", "経済", "forest", "disaster", "water", "economics"],
    findings: [
      {
        id: "surface-erosion",
        ja: "表面侵食防止機能の評価額は年間 28兆2,565億円（有林地と無林地の侵食土砂量の差を堰堤建設費で代替評価）。",
        en: "Prevention of surface erosion is valued at ¥28.26 trillion per year, estimated from the cost of check dams replacing the difference in eroded soil between forested and unforested land.",
        caveatJa: "代替法による試算であり、実際に支出される金額ではない。",
        caveatEn:
          "A replacement-cost estimate, not money actually spent.",
      },
      {
        id: "landslide-prevention",
        ja: "表層崩壊防止機能の評価額は年間 8兆4,421億円（山腹工事費用による代替評価）。",
        en: "Prevention of shallow landslides is valued at ¥8.44 trillion per year, using hillside works costs.",
        caveatJa: "同じく代替法。前提条件の変更で大きく変動する。",
        caveatEn:
          "Also a replacement-cost estimate, highly sensitive to assumptions.",
      },
      {
        id: "flood-mitigation",
        ja: "洪水緩和機能の評価額は年間 6兆4,686億円、水資源貯留は 8兆7,407億円、水質浄化は 14兆6,361億円。",
        en: "Flood mitigation is valued at ¥6.47 trillion, water storage at ¥8.74 trillion and water purification at ¥14.64 trillion per year.",
        caveatJa:
          "水資源貯留はダムの減価償却費等による代替法。評価額の合計を『森林の価値』として扱うことは答申の趣旨を超える。",
        caveatEn:
          "Water storage uses dam depreciation as a proxy. Summing these figures into 'the value of forests' goes beyond what the report claims.",
      },
    ],
  },
  {
    id: "ipbes-global-assessment",
    titleJa: "IPBES 生物多様性と生態系サービスに関する地球規模評価報告書",
    titleEn:
      "IPBES Global Assessment Report on Biodiversity and Ecosystem Services",
    org: "IPBES / UNEP",
    year: 2019,
    url: "https://www.unep.org/news-and-stories/press-release/natures-dangerous-decline-unprecedented-species-extinction-rates",
    locator: "政策決定者向け要約（五つの直接要因のランキング、改変された陸地割合）",
    region: "世界 / Global",
    scopeJa:
      "地球規模の評価。特定の地域や一つの開発計画の影響を直接推定するものではない。2019年時点の評価。",
    scopeEn:
      "A global assessment. It does not estimate the effect of a specific site or project. Assessment as of 2019.",
    checkedOn: CHECKED,
    topics: ["生物多様性", "土地利用", "biodiversity", "land-use"],
    findings: [
      {
        id: "land-use-top-driver",
        ja: "自然の変化をもたらす五つの直接要因のうち、世界規模での影響が最も大きいのは土地および海域利用の変化であり、次に生物の直接的採取、気候変動、汚染、侵略的外来種が続く。",
        en: "Among the five direct drivers of change in nature, change in land and sea use has the largest relative global impact, followed by direct exploitation of organisms, climate change, pollution and invasive alien species.",
        caveatJa:
          "相対的な影響の順位であり、ある特定の開発が最大の要因であることを意味しない。",
        caveatEn:
          "A ranking of relative global impact; it does not mean a given local development is the dominant driver there.",
      },
      {
        id: "species-at-risk",
        ja: "推定約800万種の動植物のうち、約100万種が絶滅の危機にあるとされ、その多くは数十年以内に危機を迎えうる。",
        en: "Around 1 million of an estimated 8 million animal and plant species are threatened with extinction, many within decades.",
        caveatJa: "絶滅の『危機にある』種数の推計であり、すでに失われた種数ではない。",
        caveatEn:
          "An estimate of species *threatened* with extinction, not species already lost.",
      },
      {
        id: "land-altered",
        ja: "陸地表面の 75% が人間活動によって著しく改変され、主要な陸上生息地の在来種の平均個体数は、主に1900年以降に少なくとも 20% 減少した。",
        en: "75% of the land surface has been significantly altered, and average native species abundance in most major land-based habitats has fallen by at least 20%, mostly since 1900.",
        caveatJa: "世界平均であり、日本の個別地域の状態を示すものではない。",
        caveatEn:
          "A global average, not the condition of any particular Japanese locality.",
      },
    ],
  },
  {
    id: "mlit-green-cover-temperature",
    titleJa: "都市におけるヒートアイランド対策（緑被率と気温低減のシミュレーション）",
    titleEn:
      "Urban heat island countermeasures — green cover ratio simulation",
    org: "国土交通省 / Ministry of Land, Infrastructure, Transport and Tourism",
    year: 2004,
    url: "https://www.mlit.go.jp/kisha/kisha04/04/040813/01.pdf",
    locator: "東京都心10km四方を対象とした緑被率変化のシミュレーション結果",
    region: "東京都心 / Central Tokyo",
    scopeJa:
      "東京都心を対象とした2004年のシミュレーション。他都市や地方部にそのまま適用できない。",
    scopeEn:
      "A 2004 simulation for central Tokyo. Not transferable to other cities or rural areas as-is.",
    checkedOn: CHECKED,
    topics: ["都市", "気温", "緑地", "urban", "temperature", "greenery"],
    findings: [
      {
        id: "green-cover-0-3c",
        ja: "東京都心の10km四方で緑被率を約10%上げると、日最高・最低・平均気温がおよそ 0.3℃ 低下するとされた。",
        en: "Raising the green cover ratio by about 10% across a 10 km square of central Tokyo was estimated to lower daily maximum, minimum and mean temperatures by roughly 0.3°C.",
        caveatJa:
          "広域の気温変化としては小さい。緑地の効果は体感温度や局所的な涼しさで大きく、広域平均気温では限定的である点に注意。",
        caveatEn:
          "Small as a wide-area effect. Greenery matters far more for perceived heat and local cooling than for regional mean temperature.",
      },
    ],
  },
  {
    id: "mlit-street-tree-surface-temp",
    titleJa: "街区スケールの熱環境調査（街路樹とアスファルトの表面温度）",
    titleEn: "Block-scale thermal survey — street trees vs asphalt",
    org: "国土交通省 / MLIT",
    year: 2005,
    url: "https://www.mlit.go.jp/kisha/kisha05/04/040812/01.pdf",
    locator: "熱画像計測による表面温度の比較、MRT・HIP指標による評価",
    region: "日本の都市街区 / Japanese urban block",
    scopeJa:
      "表面温度の実測比較。気温（空気温度）の低下量とは別の指標であり、混同してはならない。",
    scopeEn:
      "Measured surface temperatures. A different quantity from air temperature reduction and must not be conflated with it.",
    checkedOn: CHECKED,
    topics: ["都市", "気温", "緑地", "urban", "temperature", "greenery"],
    findings: [
      {
        id: "zelkova-vs-asphalt",
        ja: "熱画像計測では、道路沿いのケヤキの表面温度が約35℃、隣接するアスファルト舗装が40〜45℃（最高48.6℃）で、約5〜10℃の差が観測された。",
        en: "Thermal imaging measured a roadside zelkova canopy at about 35°C against adjacent asphalt at 40–45°C (peaking at 48.6°C) — a difference of roughly 5–10°C.",
        caveatJa:
          "これは表面温度の差であり、気温が5〜10℃下がることを意味しない。",
        caveatEn:
          "This is a surface temperature difference; it does not mean air temperature falls by 5–10°C.",
      },
    ],
  },
  {
    id: "env-heat-guideline",
    titleJa: "まちなかの暑さ対策ガイドライン 改訂版",
    titleEn: "Guideline for Heat Countermeasures in Urban Areas (revised)",
    org: "環境省 / Ministry of the Environment, Japan",
    year: 2018,
    url: "https://www.env.go.jp/content/900404694.pdf",
    locator: "木陰・微細ミスト等の暑熱ストレス緩和策",
    region: "日本",
    scopeJa:
      "人の暑熱ストレス（適応策）を対象とする。都市全体の気温低減（緩和策）とは目的が異なる。",
    scopeEn:
      "Addresses human heat stress (adaptation). Its purpose differs from lowering city-wide temperature (mitigation).",
    checkedOn: CHECKED,
    topics: ["都市", "健康", "緑地", "urban", "health", "greenery"],
    findings: [
      {
        id: "shade-adaptation",
        ja: "まちなかの暑さ対策として木陰や微細ミスト等が扱われ、街路空間での対策が熱中症予防に有効とされている。",
        en: "Tree shade and fine mist are treated as urban heat countermeasures, and street-level measures are described as effective for preventing heat illness.",
        caveatJa:
          "都市の気温を下げる効果の根拠ではなく、人の暑熱ストレスを減らす対策としての位置づけ。",
        caveatEn:
          "Framed as reducing human heat stress, not as evidence that city temperatures fall.",
      },
    ],
  },
  {
    id: "future-design-saijo",
    titleJa: "フューチャー・デザイン（仮想将来世代による意思決定の研究）",
    titleEn: "Future Design — deliberation with imaginary future generations",
    org: "一橋大学 経済研究（西條辰義）",
    year: 2017,
    url: "https://econ-review.ier.hit-u.ac.jp/wp-content/uploads/files/2017-68/keizaikenkyu6801033.pdf",
    locator: "市場と民主制における将来世代の不在、ラボ実験・フィールド実験・自治体実践",
    region: "日本",
    scopeJa:
      "制度設計の研究。本システムはこの枠組みをソフトウェアに移すが、実験結果の再現を主張するものではない。",
    scopeEn:
      "Research on institutional design. This system ports the framework into software but does not claim to reproduce its experimental results.",
    checkedOn: CHECKED,
    topics: ["世代間", "制度", "民主主義", "intergenerational", "institutions", "democracy"],
    findings: [
      {
        id: "absence-of-future-generations",
        ja: "市場では将来世代が価格を通じて意思を示せず、民主制では投票できないため、将来世代の利害は構造的に意思決定から外れる。",
        en: "Future generations cannot express preferences through prices in markets and cannot vote in democracies, so their interests are structurally excluded from decisions.",
        caveatJa:
          "理論的な問題設定であり、個別の政策判断の正否を示すものではない。",
        caveatEn:
          "A framing of the problem, not a verdict on any particular policy.",
      },
      {
        id: "imaginary-future-generation",
        ja: "地域計画やインフラ設計において、将来世代の視点を代弁する役割を明確に与えられた集団（仮想将来世代）を設け、現世代と交渉させる手法が研究・実践されている。",
        en: "A group explicitly assigned to speak for future generations ('imaginary future generation') negotiates with the present generation in regional planning and infrastructure design.",
        caveatJa:
          "人間が担う役割である。AIによる代替の有効性は本研究では検証されていない。",
        caveatEn:
          "The role is played by humans. This research does not test whether AI can substitute for it.",
      },
    ],
  },
  {
    id: "tkfd-future-generations",
    titleJa: "未来の利益、いまどう代弁？——「仮想将来世代」学際で研究",
    titleEn:
      "Representing future interests today — interdisciplinary research on imaginary future generations",
    org: "東京財団政策研究所 / Tokyo Foundation for Policy Research",
    year: 2016,
    url: "https://www.tkfd.or.jp/research/detail.php?id=213",
    locator: "亀田達也教授グループの実験に関する記述",
    region: "日本",
    scopeJa: "解説記事。実験の詳細条件は原論文を参照する必要がある。",
    scopeEn:
      "A commentary article; experimental details require the original paper.",
    checkedOn: CHECKED,
    topics: ["世代間", "心理", "intergenerational", "psychology"],
    findings: [
      {
        id: "descendants-effect",
        ja: "東京大学の亀田達也教授グループは、子や孫を持つ者の方が将来世代の利益への関心が強まる傾向があるという実験結果を報告している。",
        en: "A research group led by Prof. Tatsuya Kameda reports that people with children or grandchildren tend to show stronger concern for the interests of future generations.",
        caveatJa:
          "傾向の報告であり、因果関係や効果量は本記事からは確認できない。",
        caveatEn:
          "A reported tendency; causality and effect size cannot be confirmed from this article.",
      },
    ],
  },
  {
    id: "mit-future-you",
    titleJa:
      "Future You: AIが生成した未来の自分との対話が不安を低減する（MIT Media Lab）",
    titleEn:
      "Future You: A Conversation with an AI-Generated Future Self Reduces Anxiety",
    org: "MIT Media Lab (arXiv preprint 2405.12514)",
    year: 2024,
    url: "https://arxiv.org/abs/2405.12514",
    locator: "事前登録済みランダム化比較試験（4条件）とその結果",
    region: "米国 / United States",
    scopeJa:
      "個人の心理的ウェルビーイングを対象とした短期的な研究。集団の政策判断の質を扱っていない。",
    scopeEn:
      "A short-term study of individual psychological wellbeing. It does not address the quality of collective policy decisions.",
    checkedOn: CHECKED,
    topics: ["AI", "未来", "心理", "future", "psychology"],
    findings: [
      {
        id: "anxiety-reduction",
        ja: "事前登録されたランダム化比較試験（参加者は報告により188名〜344名）で、AIが生成した60歳の自分との対話により、不安の低減と未来自己連続性の向上が報告された。",
        en: "A preregistered randomized controlled trial (reported participant counts range from 188 to 344) found reduced anxiety and increased future self-continuity after conversing with an AI-generated 60-year-old self.",
        caveatJa:
          "短期効果であり、参加者の多くは若年成人。使用モデルはGPT-3.5の改変版。『自分の未来』が対象で、『他者である将来世代』ではない。",
        caveatEn:
          "A short-term effect with mostly young-adult participants, using a modified GPT-3.5. The target is one's own future self, not other people's future generations.",
      },
    ],
  },
  {
    id: "stanford-pacs-ai-voice",
    titleJa: "集合的意思決定におけるAIの『声』の活用",
    titleEn: "Using AI Voice to Make Collective Decision Making More Inclusive",
    org: "Stanford PACS",
    year: 2024,
    url: "https://pacscenter.stanford.edu/wp-content/uploads/2024/02/Using-AI-Voice-to-Make-Collective-Decision-Making%E2%80%A6.pdf",
    locator: "包摂的な熟議プロセスにおいて将来世代と自然が除外される問題の指摘",
    region: "世界 / Global",
    scopeJa: "問題提起と構想の提示。実装の有効性検証ではない。",
    scopeEn:
      "Framing and proposals, not a validation of any implementation.",
    checkedOn: CHECKED,
    topics: ["AI", "熟議", "世代間", "deliberation", "intergenerational"],
    findings: [
      {
        id: "excluded-from-deliberation",
        ja: "きわめて包摂的に設計された熟議プロセスであっても、将来世代と自然は参加者から除外されうると指摘されている。",
        en: "Even highly inclusive deliberative processes may still exclude future human generations and nature.",
        caveatJa: "AIが代弁者として適切かという規範的論点は未解決として扱われている。",
        caveatEn:
          "Whether AI is an appropriate proxy is treated as an open normative question.",
      },
    ],
  },
  {
    id: "cfg-eu-intergenerational",
    titleJa: "EU世代間公平性戦略への提言",
    titleEn: "Submission to the EU Intergenerational Fairness Strategy",
    org: "Centre for Future Generations",
    year: 2025,
    url: "https://cfg.eu/submission-to-the-eu-intergenerational-fairness-strategy/",
    locator: "技術・気候・経済戦略に対する世代間影響評価の義務化提言",
    region: "欧州連合 / European Union",
    scopeJa: "政策提言であり、制度として採択されたことを示すものではない。",
    scopeEn:
      "A policy recommendation; it does not indicate adoption into law.",
    checkedOn: CHECKED,
    topics: ["政策", "世代間", "policy", "intergenerational"],
    findings: [
      {
        id: "mandatory-impact-assessment",
        ja: "技術・気候・経済戦略に関する政策について、世代間影響評価を義務化することが提言されている。",
        en: "Mandatory intergenerational impact assessments are recommended for technology, climate and economic strategy policies.",
        caveatJa: "提言段階。EUが採択したと述べてはならない。",
        caveatEn:
          "At the recommendation stage; it must not be described as adopted by the EU.",
      },
    ],
  },
  {
    id: "eu-citizens-panel-intergenerational",
    titleJa: "欧州市民パネル「世代間の公平性」",
    titleEn: "European Citizens' Panel on Intergenerational Fairness",
    org: "European Commission",
    year: 2025,
    url: "https://citizens.ec.europa.eu/european-citizens-panels/citizens-panel-intergenerational-fairness_da",
    locator: "2025年9月〜11月の開催と欧州委員会への提言提出",
    region: "欧州連合 / European Union",
    scopeJa: "市民参加型プロセスの実例。提言内容そのものは本記録に含まれない。",
    scopeEn:
      "An example of a participatory process. The content of its recommendations is not included in this record.",
    checkedOn: CHECKED,
    topics: ["政策", "参加型民主主義", "policy", "participation"],
    findings: [
      {
        id: "panel-2025",
        ja: "欧州市民パネル「世代間の公平性」は2025年9月から11月にかけて開催され、欧州委員会への提言提出が予定された。",
        en: "The European Citizens' Panel on Intergenerational Fairness met from September to November 2025 and was due to deliver recommendations to the European Commission.",
        caveatJa:
          "最終提言の内容と採否は本記録では確認していない。",
        caveatEn:
          "The final recommendations and their fate are not confirmed in this record.",
      },
    ],
  },
  {
    id: "ipbes-spm-unccd",
    titleJa: "IPBES地球規模評価 政策決定者向け要約（UNCCDライブラリ）",
    titleEn: "IPBES Global Assessment — Summary for Policymakers (UNCCD library)",
    org: "UNCCD / IPBES",
    year: 2019,
    url: "https://www.unccd.int/resources/unccd-library/summary-policymakers-global-assessment-report-biodiversity-and-ecosystem",
    locator: "政策シナリオに関する記述",
    region: "世界 / Global",
    scopeJa: "地球規模のシナリオ評価。地域の個別判断には直接適用できない。",
    scopeEn:
      "Global scenario assessment; not directly applicable to a local decision.",
    checkedOn: CHECKED,
    topics: ["生物多様性", "シナリオ", "biodiversity", "scenarios"],
    findings: [
      {
        id: "scenarios-to-2050",
        ja: "報告書が検討したすべての政策シナリオにおいて、変革的な変化を含むものを除き、自然の負の傾向は2050年以降も継続すると投影された。",
        en: "In every policy scenario the report examined, negative trends in nature were projected to continue beyond 2050 except in those involving transformative change.",
        caveatJa:
          "シナリオ投影であり確定した予測ではない。『変革的変化』の定義は報告書に依存する。",
        caveatEn:
          "Scenario projections, not settled forecasts. 'Transformative change' is defined within the report.",
      },
    ],
  },
];

/** Flat index of every citable finding id → its source + finding. */
export const FINDING_INDEX: Map<
  string,
  { source: SourceRecord; finding: SourceRecord["findings"][number] }
> = new Map(
  CORPUS.flatMap((source) =>
    source.findings.map(
      (finding) =>
        [`${source.id}#${finding.id}`, { source, finding }] as const,
    ),
  ),
);

export const ALL_FINDING_IDS: string[] = [...FINDING_INDEX.keys()];

export function getSource(id: string): SourceRecord | undefined {
  return CORPUS.find((s) => s.id === id);
}

export function resolveFinding(citationId: string) {
  return FINDING_INDEX.get(citationId);
}
