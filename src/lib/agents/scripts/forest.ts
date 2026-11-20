import type {
  Claim,
  Framing,
  Option,
  Scenario,
  Statement,
  Witness,
} from "@/lib/types";

/**
 * The curated deliberation used for the judges' demo.
 *
 * This is written by hand, not generated, and the UI labels every run that uses
 * it as 事前生成 / scripted. It exists for two reasons: a reviewer must be able
 * to see a complete run in under 90 seconds without an API key, and the authored
 * version sets the quality bar that the live prompts are written against.
 *
 * Every citation below resolves to a real finding in the corpus — the same
 * verifier runs over this content as over live output, so if a citation here
 * were wrong the audit panel would report it.
 */

export const FOREST_QUESTION_JA =
  "経済発展のために森林を切り開き、大型商業施設を建設するべきか？";
export const FOREST_QUESTION_EN =
  "Should we clear forest land to build a large commercial complex for economic growth?";

export const FOREST_FRAMING: Framing = {
  coreJa:
    "ある地域の森林を転用して大型商業施設を建設するか。判断の対象は、短期の雇用と税収、長期の国土保全機能、そして転用が実質的に不可逆であることの三つの間での配分である。",
  coreEn:
    "Whether to convert a tract of forest into a large commercial complex. The decision allocates between near-term jobs and tax revenue, long-term land-protection functions, and the practical irreversibility of the conversion.",
  assumptions: [
    {
      kind: "inference",
      text: "「経済発展」と「森林保全」が対立するという前提が置かれている。どちらも手段であり、何のための発展かは問いの中で定義されていない。",
      sourceIds: [],
    },
    {
      kind: "inference",
      text: "商業施設が建設されれば経済が発展するという前提が置かれている。その施設の需要が20年後、40年後も続くかどうかは問いに含まれていない。",
      sourceIds: [],
    },
    {
      kind: "inference",
      text: "転用は法的には可逆だが、同等の林相の回復には世代をまたぐ時間がかかる。日本の人工林では林齢51年以上が全人工林面積の64%を占めるまでに半世紀以上が経過している。",
      sourceIds: ["jp-forest-white-paper#age-class-shift"],
    },
    {
      kind: "unknown",
      text: "問いには対象地域、森林の種類と林齢、斜面の条件、施設の規模が含まれていない。これらが決まらないまま賛否を出すことは、どちらの方向であっても根拠を欠く。",
      sourceIds: [],
    },
  ],
  stakeholders: [
    {
      nameJa: "近隣に今住んでいる人",
      nameEn: "People living nearby today",
      horizonJa: "今後10〜30年。自治体の議会と意見提出を通じて意思決定に参加できる。",
      horizonEn:
        "The next 10–30 years. Can participate through local councils and public comment.",
      hasVote: true,
    },
    {
      nameJa: "事業者と出資者",
      nameEn: "The developer and its investors",
      horizonJa: "投資回収期間。契約と交渉を通じて意思決定に直接参加できる。",
      horizonEn:
        "The payback period. Participates directly through contracts and negotiation.",
      hasVote: true,
    },
    {
      nameJa: "自治体の財政",
      nameEn: "The municipality's finances",
      horizonJa: "単年度予算と中期財政計画。制度として発言の場を持つ。",
      horizonEn:
        "Annual budgets and medium-term fiscal plans. Has an institutional voice.",
      hasVote: true,
    },
    {
      nameJa: "2050年にこの地域で暮らす人",
      nameEn: "People living here in 2050",
      horizonJa: "2050年以降。現在の意思決定に参加する手段を持たない。",
      horizonEn: "2050 onward. Has no means of participating in today's decision.",
      hasVote: false,
    },
    {
      nameJa: "まだ生まれていない世代",
      nameEn: "Generations not yet born",
      horizonJa: "2060年以降。市場でも選挙でも意思を示せない。",
      horizonEn:
        "2060 onward. Cannot express preferences in markets or elections.",
      hasVote: false,
    },
    {
      nameJa: "その斜面に依存する生物",
      nameEn: "Species dependent on that slope",
      horizonJa: "転用の時点から。代弁者を持たない。",
      horizonEn: "From the moment of conversion. Has no representative.",
      hasVote: false,
    },
  ],
};

export const FOREST_OPTIONS: Option[] = [
  {
    id: "A",
    labelJa: "大規模開発を進める",
    labelEn: "Proceed with full-scale development",
    summaryJa:
      "計画区域の森林を全面的に転用し、当初計画の規模で商業施設と駐車場、取付道路を建設する。短期の雇用と固定資産税収を最大化する。",
    summaryEn:
      "Convert the planned area in full and build the complex, parking and access roads at the original scale, maximising near-term jobs and property tax revenue.",
  },
  {
    id: "B",
    labelJa: "森林を全面的に保全する",
    labelEn: "Conserve the forest in full",
    summaryJa:
      "転用を行わず、区域を森林として維持する。施設による雇用と税収は生まれない。維持には間伐などの継続的な費用と担い手が必要になる。",
    summaryEn:
      "Make no conversion and keep the area forested. No jobs or tax revenue from the facility, and continued thinning costs and labour are required.",
  },
  {
    id: "C",
    labelJa: "面積を限定し、撤退条項を付けて段階的に開発する",
    labelEn: "Stage the development with a limited footprint and an exit clause",
    summaryJa:
      "転用面積を上限付きで限定し、第一期の実績を条件に第二期の着工可否を判断する。撤退時の解体・原状回復費用を事前に積み立て、監視主体と違反時の執行方法を契約に明記する。",
    summaryEn:
      "Cap the converted area, make phase two conditional on phase one's measured results, pre-fund demolition and restoration, and name in the contract who monitors compliance and how it is enforced.",
  },
];

export const FOREST_EVIDENCE: Statement = {
  id: "script-forest-evidence",
  agent: "EVIDENCE",
  titleJa: "確認できる根拠と、その適用範囲",
  titleEn: "What can be verified, and how far it applies",
  claims: [
    {
      kind: "verified",
      text: "2024年度の土地利用・土地利用変化・林業（LULUCF）分野の温室効果ガス純吸収量は49,421kt-CO2換算で、1990年度比35.5%減、前年度比1.9%減である。",
      sourceIds: ["jp-ghg-inventory-lulucf#net-sink-2024"],
    },
    {
      kind: "verified",
      text: "この減少は森林の高齢化による成長量の低下が主因とされ、伐採量そのものを示す数値ではない。吸収量の減少をそのまま「伐採が進んだ結果」と読むことはできない。",
      sourceIds: ["jp-ghg-inventory-lulucf#net-sink-2024"],
    },
    {
      kind: "verified",
      text: "2021年度時点で、林齢51年以上の人工林が全人工林面積の64%を占め、齢級構成はさらに高齢側へ移動している。",
      sourceIds: ["jp-forest-white-paper#age-class-shift"],
    },
    {
      kind: "verified",
      text: "森林の表面侵食防止機能は年間28兆2,565億円、表層崩壊防止機能は年間8兆4,421億円と評価されている。洪水緩和は6兆4,686億円、水資源貯留は8兆7,407億円、水質浄化は14兆6,361億円である。",
      sourceIds: [
        "jp-forest-multifunction#surface-erosion",
        "jp-forest-multifunction#landslide-prevention",
        "jp-forest-multifunction#flood-mitigation",
      ],
    },
    {
      kind: "verified",
      text: "ただしこれらは代替法による全国推計であり、「森林がまったくない場合」との比較という仮定に依存し、多面的機能の一部のみを対象としている。特定の一区画の価値額としては使えない。",
      sourceIds: ["jp-forest-multifunction#surface-erosion"],
    },
    {
      kind: "verified",
      text: "自然の変化をもたらす五つの直接要因のうち、世界規模での影響が最も大きいのは土地および海域利用の変化であり、陸地表面の75%が人間活動によって著しく改変されている。",
      sourceIds: [
        "ipbes-global-assessment#land-use-top-driver",
        "ipbes-global-assessment#land-altered",
      ],
    },
    {
      kind: "inference",
      text: "これは世界平均の相対的な順位であり、この地域のこの開発が当地で最大の要因であることを示すものではない。地球規模の評価を一区画の是非に直結させることは、この報告書の主張を超える。",
      sourceIds: ["ipbes-global-assessment#land-use-top-driver"],
    },
    {
      kind: "verified",
      text: "地球温暖化対策計画では、2030年度に約3,800万t-CO2（2013年度総排出量比2.7%相当）の森林吸収量を確保する目標が掲げられている。現状の純吸収量はこの水準を上回るが、減少傾向にある。",
      sourceIds: ["jp-forest-sink-target#sink-target-2030"],
    },
    {
      kind: "unknown",
      text: "対象森林の樹種・林齢・斜面勾配・取水点との位置関係、施設の需要見通し、商圏人口の推計は、このコーパスに含まれていない。この三つを欠いたまま本件の是非を判定することはできない。",
      sourceIds: [],
    },
  ],
};

const INDICATOR_LABELS: Record<string, { ja: string; en: string }> = {
  carbon: { ja: "炭素吸収", en: "Carbon sink" },
  biodiversity: { ja: "生物多様性", en: "Biodiversity" },
  local_economy: { ja: "地域経済", en: "Local economy" },
  flood_risk: { ja: "土砂・洪水リスク", en: "Landslide & flood risk" },
  reversibility: { ja: "やり直せるか", en: "Reversibility" },
};

export const FOREST_SCENARIOS: Scenario[] = [
  {
    id: "A",
    optionId: "A",
    nameJa: "全面転用の50年",
    nameEn: "Fifty years after full conversion",
    premiseJa:
      "計画区域の森林を全面的に転用し、当初計画の規模で建設した場合を想定する。需要予測と人口推計は当初計画のまま据え置いたと仮定する。",
    premiseEn:
      "Assumes the planned area is converted in full and built at the original scale, with the original demand and population assumptions left unrevised.",
    strata: [
      {
        year: 2030,
        headlineJa: "造成が終わり、施設が開業する",
        headlineEn: "Grading is finished and the complex opens",
        detailJa:
          "建設期の雇用が生まれ、固定資産税収が増える。取付道路が拡幅され、休日の人の流れが変わる。斜面の裾には擁壁と調整池が置かれる。",
        detailEn:
          "Construction jobs appear and property tax revenue rises. The access road is widened and weekend traffic patterns change. Retaining walls and a detention pond sit at the foot of the slope.",
        tone: 0.35,
      },
      {
        year: 2040,
        headlineJa: "二度目の改装期が来る",
        headlineEn: "The second refurbishment cycle arrives",
        detailJa:
          "商圏人口の減少で売場の一部が空く。擁壁の補修と調整池の浚渫が予算化される。周辺の住宅地は建て替え時期を迎える。",
        detailEn:
          "Part of the floor space empties as the catchment population shrinks. Wall repairs and pond dredging enter the budget. Surrounding housing reaches its rebuild cycle.",
        tone: -0.1,
      },
      {
        year: 2050,
        headlineJa: "更新投資の負担者が争点になる",
        headlineEn: "Who pays for renewal becomes the fight",
        detailJa:
          "施設の更新費用と、撤退した場合の解体費用の負担者が決まっていない。元の林相は戻っていない。斜面の管理は公共が引き受けている。",
        detailEn:
          "Neither renewal costs nor demolition costs on exit have an assigned payer. The original forest structure has not returned. The public sector carries slope management.",
        tone: -0.5,
      },
    ],
    indicators: [
      {
        key: "carbon",
        labelJa: INDICATOR_LABELS.carbon.ja,
        labelEn: INDICATOR_LABELS.carbon.en,
        direction: "down",
        noteJa:
          "転用面積分の吸収機能が失われる。国全体の純吸収量は既に減少傾向にある。",
        noteEn:
          "The sink function of the converted area is lost; the national sink is already declining.",
        sourceIds: ["jp-ghg-inventory-lulucf#net-sink-2024"],
      },
      {
        key: "biodiversity",
        labelJa: INDICATOR_LABELS.biodiversity.ja,
        labelEn: INDICATOR_LABELS.biodiversity.en,
        direction: "down",
        noteJa:
          "土地利用の変化は世界規模で自然の変化の最大要因とされる。局所の影響量は不明。",
        noteEn:
          "Land-use change is the largest global driver; the local magnitude is unknown.",
        sourceIds: ["ipbes-global-assessment#land-use-top-driver"],
      },
      {
        key: "local_economy",
        labelJa: INDICATOR_LABELS.local_economy.ja,
        labelEn: INDICATOR_LABELS.local_economy.en,
        direction: "mixed",
        noteJa:
          "2030年代は増収、2040年代以降は需要と更新費用に依存する。",
        noteEn:
          "Revenue rises in the 2030s; beyond the 2040s it depends on demand and renewal costs.",
        sourceIds: [],
      },
      {
        key: "flood_risk",
        labelJa: INDICATOR_LABELS.flood_risk.ja,
        labelEn: INDICATOR_LABELS.flood_risk.en,
        direction: "up",
        noteJa:
          "森林の表面侵食防止・表層崩壊防止機能が失われる分を構造物で代替する必要がある。",
        noteEn:
          "Engineered structures must replace the lost erosion and shallow-landslide prevention functions.",
        sourceIds: [
          "jp-forest-multifunction#surface-erosion",
          "jp-forest-multifunction#landslide-prevention",
        ],
      },
      {
        key: "reversibility",
        labelJa: INDICATOR_LABELS.reversibility.ja,
        labelEn: INDICATOR_LABELS.reversibility.en,
        direction: "down",
        noteJa: "同等の林相の回復には半世紀規模の時間がかかる。",
        noteEn:
          "Restoring comparable forest structure takes on the order of half a century.",
        sourceIds: ["jp-forest-white-paper#age-class-shift"],
      },
    ],
  },
  {
    id: "B",
    optionId: "B",
    nameJa: "手入れを続ける50年",
    nameEn: "Fifty years of continued tending",
    premiseJa:
      "転用を行わず森林として維持した場合を想定する。間伐と林道の維持に継続的な費用と担い手が必要であり、それが確保されたと仮定する。",
    premiseEn:
      "Assumes the area stays forested, with the continued funding and labour for thinning and forest roads actually secured.",
    strata: [
      {
        year: 2030,
        headlineJa: "森は残り、雇用は増えない",
        headlineEn: "The forest stays; the jobs do not come",
        detailJa:
          "施設による税収と雇用は生まれない。間伐の担い手不足が議題に上がる。地域の買い物は隣接市の施設に向かう。",
        detailEn:
          "No facility revenue or jobs. The shortage of thinning labour reaches the agenda. Shopping trips go to the neighbouring city.",
        tone: -0.1,
      },
      {
        year: 2040,
        headlineJa: "高齢化した人工林の費用が顕在化する",
        headlineEn: "The cost of an ageing planted forest comes due",
        detailJa:
          "林齢の上昇で成長量が落ち、吸収量は伸びない。間伐と更新伐の費用負担が繰り返し議論される。斜面は安定している。",
        detailEn:
          "Growth slows with age so the sink does not expand. Thinning and regeneration costs are debated repeatedly. The slope remains stable.",
        tone: -0.2,
      },
      {
        year: 2050,
        headlineJa: "国土保全機能は維持され、人口は減っている",
        headlineEn: "Land protection holds; the population does not",
        detailJa:
          "水源涵養と土砂災害防止の機能は維持されている。地域の人口は減り、空き家が増えている。森は残ったが、残した費用を払った人は高齢になっている。",
        detailEn:
          "Water retention and landslide prevention are intact. The population has fallen and vacant houses have multiplied. The forest remains; those who paid to keep it have grown old.",
        tone: 0.0,
      },
    ],
    indicators: [
      {
        key: "carbon",
        labelJa: INDICATOR_LABELS.carbon.ja,
        labelEn: INDICATOR_LABELS.carbon.en,
        direction: "mixed",
        noteJa:
          "面積は維持されるが、高齢化により吸収量が伸びるとは限らない。",
        noteEn:
          "Area is preserved, but ageing means the sink does not necessarily grow.",
        sourceIds: [
          "jp-forest-white-paper#age-class-shift",
          "jp-ghg-inventory-lulucf#net-sink-2024",
        ],
      },
      {
        key: "biodiversity",
        labelJa: INDICATOR_LABELS.biodiversity.ja,
        labelEn: INDICATOR_LABELS.biodiversity.en,
        direction: "up",
        noteJa:
          "土地利用の変化が起きない。ただし単層の人工林のままなら多様性の改善は限定的。",
        noteEn:
          "No land-use change occurs, though a single-layer planted forest limits the gain.",
        sourceIds: ["ipbes-global-assessment#land-use-top-driver"],
      },
      {
        key: "local_economy",
        labelJa: INDICATOR_LABELS.local_economy.ja,
        labelEn: INDICATOR_LABELS.local_economy.en,
        direction: "down",
        noteJa: "施設由来の雇用と税収は発生せず、維持費用は継続して発生する。",
        noteEn:
          "No facility jobs or revenue, while maintenance costs continue.",
        sourceIds: [],
      },
      {
        key: "flood_risk",
        labelJa: INDICATOR_LABELS.flood_risk.ja,
        labelEn: INDICATOR_LABELS.flood_risk.en,
        direction: "down",
        noteJa:
          "表面侵食防止と表層崩壊防止の機能が維持される（全国推計での評価）。",
        noteEn:
          "Erosion and shallow-landslide prevention are retained (valued at national scale).",
        sourceIds: ["jp-forest-multifunction#landslide-prevention"],
      },
      {
        key: "reversibility",
        labelJa: INDICATOR_LABELS.reversibility.ja,
        labelEn: INDICATOR_LABELS.reversibility.en,
        direction: "up",
        noteJa: "将来の世代が別の判断を下す余地が残る。",
        noteEn: "A future generation retains the option to decide differently.",
        sourceIds: [],
      },
    ],
  },
  {
    id: "C",
    optionId: "C",
    nameJa: "条件が守られたかで分かれる50年",
    nameEn: "Fifty years that turn on whether the conditions held",
    premiseJa:
      "転用面積に上限を設け、撤退時の解体・原状回復費用を事前に積み立て、監視主体と違反時の執行方法を契約に明記した場合を想定する。この前提自体が守られる保証はない。",
    premiseEn:
      "Assumes a capped footprint, pre-funded demolition and restoration, and a named monitor with enforcement written into the contract. The assumption itself is not guaranteed to hold.",
    strata: [
      {
        year: 2030,
        headlineJa: "限定された面積で着工する",
        headlineEn: "Construction starts on a capped footprint",
        detailJa:
          "第一期のみ着工し、雇用と税収は計画の一部にとどまる。解体費用の積立が始まる。斜面上部の林は残る。",
        detailEn:
          "Only phase one proceeds, so jobs and revenue are partial. The demolition fund starts accruing. The upper slope stays forested.",
        tone: 0.15,
      },
      {
        year: 2040,
        headlineJa: "誰が監視しているかが問題になる",
        headlineEn: "Who is actually monitoring becomes the question",
        detailJa:
          "第二期の着工可否を判断する年。測定結果の評価主体と、違反時の執行機関が実際に機能しているかが争点になる。積立金の運用先が議会で問われる。",
        detailEn:
          "The year phase two is decided. Whether the evaluator and the enforcement body actually function becomes the issue. The council questions where the fund is held.",
        tone: 0.0,
      },
      {
        year: 2050,
        headlineJa: "結果が二分する",
        headlineEn: "The outcome splits in two",
        detailJa:
          "条件が執行されていれば、残った林と縮小した施設が併存する。執行されていなければ、全面転用と同じ結果に、守られなかった契約という記録が加わる。",
        detailEn:
          "If the conditions were enforced, a reduced facility coexists with the remaining forest. If not, the outcome matches full conversion, plus a record of a contract that was not kept.",
        tone: 0.2,
      },
    ],
    indicators: [
      {
        key: "carbon",
        labelJa: INDICATOR_LABELS.carbon.ja,
        labelEn: INDICATOR_LABELS.carbon.en,
        direction: "mixed",
        noteJa: "転用面積に比例して失われるが、全面転用より小さい。",
        noteEn:
          "Lost in proportion to the converted area, but less than full conversion.",
        sourceIds: ["jp-ghg-inventory-lulucf#net-sink-2024"],
      },
      {
        key: "biodiversity",
        labelJa: INDICATOR_LABELS.biodiversity.ja,
        labelEn: INDICATOR_LABELS.biodiversity.en,
        direction: "mixed",
        noteJa:
          "分断された林地は面積が同じでも機能が落ちうる。分断の影響量はこのコーパスでは不明。",
        noteEn:
          "Fragmented patches can function worse at the same area; the magnitude is not in this corpus.",
        sourceIds: [],
      },
      {
        key: "local_economy",
        labelJa: INDICATOR_LABELS.local_economy.ja,
        labelEn: INDICATOR_LABELS.local_economy.en,
        direction: "mixed",
        noteJa:
          "規模が小さいため収益も小さい。撤退費用の積立が事業者の負担になる。",
        noteEn:
          "Smaller scale means smaller returns, and the exit fund is a cost to the developer.",
        sourceIds: [],
      },
      {
        key: "flood_risk",
        labelJa: INDICATOR_LABELS.flood_risk.ja,
        labelEn: INDICATOR_LABELS.flood_risk.en,
        direction: "mixed",
        noteJa:
          "斜面上部の林が残れば影響は小さいが、下部の造成で局所的に増える可能性がある。",
        noteEn:
          "Keeping the upper slope limits the effect, though grading below may raise it locally.",
        sourceIds: ["jp-forest-multifunction#surface-erosion"],
      },
      {
        key: "reversibility",
        labelJa: INDICATOR_LABELS.reversibility.ja,
        labelEn: INDICATOR_LABELS.reversibility.en,
        direction: "mixed",
        noteJa:
          "撤退条項があれば可逆性は残るが、執行機関がなければ条項は文章にすぎない。",
        noteEn:
          "An exit clause preserves reversibility only if an enforcement body exists.",
        sourceIds: [],
      },
    ],
  },
];

export const FOREST_WITNESSES: Record<string, Witness> = {
  A: {
    nameJa: "藤枝 みのり",
    nameEn: "Minori Fujieda",
    age: 27,
    bornIn: 2023,
    placeJa: "旧丘陵地の集合住宅",
    placeEn: "an apartment block on the old hillside",
  },
  B: {
    nameJa: "鵜澤 千尋",
    nameEn: "Chihiro Uzawa",
    age: 31,
    bornIn: 2019,
    placeJa: "谷筋の集落",
    placeEn: "a hamlet along the valley floor",
  },
  C: {
    nameJa: "小暮 郁",
    nameEn: "Kaoru Kogure",
    age: 24,
    bornIn: 2026,
    placeJa: "斜面の中腹の借家",
    placeEn: "a rented house halfway up the slope",
  },
};

export const FOREST_VOICES: Record<string, string> = {
  A: "朝、窓を開けると駐車場の匂いがします。夏の熱が夜までアスファルトに残っていて、子どもを寝かせるのに苦労する。買い物は徒歩七分、病院もバスで行ける。便利です、それは本当に。ただ、三階より上は空いていて、看板だけが新しい。母が昔この斜面で栗を拾ったと言うけれど、どのあたりだったのかは聞いても分からない。去年、裏の擁壁の補修費がうちの管理費に乗りました。あれを誰が払い続けるのか、総会でも答えが出ませんでした。",
  B: "六月の朝は、谷から霧が上がってきます。洗濯物が乾かないので、みんな文句を言う。水道の水はいまも上の沢から来ていて、台風のあとでも濁らないのが自慢です。ただ、同級生はほとんど町を出ました。買い物は隣の市まで二十分、月に二回まとめて行く。間伐の人手が足りないという話を、祖父の代からずっと聞いています。森は残りました。残すのに払ったお金のことを、いま説明できる人は少なくなりました。",
  C: "施設は結局、下の半分だけです。上の林は残っていて、学校の裏から入れる。朝、鳥の声とトラックの音が同時に聞こえるのは、ここだけだと思います。十年前に第二期をやめた年の記録が、公民館に綴じて置いてある。誰が測って、誰が止めたかが書いてある。それが残っているのが、たぶんいちばん大事なことでした。積立金の話はいまも揉めています。約束は、守られているほうです。全部ではありません。",
};

export const FOREST_COUNTER: Statement = {
  id: "script-forest-counter",
  agent: "COUNTER",
  titleJa: "ここまでの全体に対する反証",
  titleEn: "Objections to everything above",
  claims: [
    {
      kind: "inference",
      text: "三つの選択肢すべてが、商業床の需要が40年続くことを暗黙に前提にしている。人口減少局面でその前提を支える根拠は提示されていない。そして撤退後の解体費用を誰が負担するかは、A・B・Cのいずれの記述でも空欄のままである。",
      sourceIds: [],
    },
    {
      kind: "inference",
      text: "選択肢Cの「条件付き」は、監視の主体・測定方法・違反時の執行機関が決まらなければ、実質的にAと同じ結果になる。契約条項は、執行する機関がなければ文章でしかない。Cを選ぶことは、制度設計を後回しにしたまま着工を認めることと区別がつかない。",
      sourceIds: [],
    },
    {
      kind: "inference",
      text: "保全側に対する最良の反論は「保全は何もしないことではない」である。高齢化した人工林を手入れせずに残すことは、吸収量の低下と災害リスクの両方を放置しうる。林齢51年以上が人工林面積の64%を占める状況で、Bは積極的で高価な選択であり、無償の現状維持ではない。",
      sourceIds: ["jp-forest-white-paper#age-class-shift"],
    },
    {
      kind: "verified",
      text: "多面的機能の貨幣評価額は代替法による全国推計であり、「森林がまったくない場合」との比較に依存し、機能の一部のみを対象としている。28兆円という数字を一区画の開発を否定する根拠として使うことは、この答申の主張を超えた流用である。",
      sourceIds: ["jp-forest-multifunction#surface-erosion"],
    },
    {
      kind: "inference",
      text: "このシステム自体への反証。上の三つの2050年の語りは、失われたものを感覚的な細部（匂い、霧、鳥の声）で描き、得られたものを抽象語（雇用、税収、便利）で描いている。この描写の非対称性は、根拠によらない保全側への誘導として機能する。読者はこの配分そのものを疑うべきである。",
      sourceIds: [],
    },
    {
      kind: "inference",
      text: "将来世代を代弁する行為自体への反証。2050年の人物を造形したのは現在のモデルであり、将来世代の同意は存在しない。代弁は、代弁者の価値観を将来世代の名前で正当化する装置になりうる。この装置は、森林の保全を主張するためにも、開発を主張するためにも、同じ強さで使える。",
      sourceIds: ["stanford-pacs-ai-voice#excluded-from-deliberation"],
    },
  ],
};

export const FOREST_UNCERTAINTY: Statement = {
  id: "script-forest-uncertainty",
  agent: "EVIDENCE",
  titleJa: "決着していない論点と、何があれば決着するか",
  titleEn: "What remains unresolved, and what would resolve it",
  claims: [
    {
      kind: "unknown",
      text: "対象森林と取水点の位置関係が不明である。解決には自治体の水道事業者が持つ取水点データと流域図の照合が必要で、これは自治体が収集できる。",
      sourceIds: [],
    },
    {
      kind: "unknown",
      text: "施設の需要見通しが不明である。解決には地域別の将来人口推計と商圏人口の照合が必要で、自治体と事業者の双方が持つ情報を突き合わせる必要がある。",
      sourceIds: [],
    },
    {
      kind: "unknown",
      text: "撤退時の解体・原状回復費用の見積額と、その担保方法が不明である。解決には事業計画と開発許可条件の開示が必要で、これは許可権者が求められる。",
      sourceIds: [],
    },
    {
      kind: "inference",
      text: "このコーパスは全国規模と地球規模の資料で構成されており、構造的に一区画の判断には答えられない。地域データなしで賛否を出すことは、どちらの方向であっても根拠を欠く。この限界はコーパスを増やしても、地域データが入るまでは解消しない。",
      sourceIds: ["jp-forest-multifunction#surface-erosion"],
    },
    {
      kind: "unknown",
      text: "本システムが意思決定の質を実際に改善するかは未検証である。立場の事前事後の変化は記録されるが、変化したことが「より良い決定」を意味する保証はない。検証には、本システムを使った群と使わなかった群の決定を追跡する比較が必要になる。",
      sourceIds: ["mit-future-you#anxiety-reduction"],
    },
  ],
};

export const FOREST_TOPIC_KEYS = [
  "森林",
  "森",
  "林",
  "伐採",
  "商業施設",
  "開発",
  "forest",
  "woodland",
  "deforest",
  "mall",
  "commercial complex",
];

export type { Claim };
