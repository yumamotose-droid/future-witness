# DATA_SOURCES

この文書は `src/lib/evidence/corpus.ts` から自動生成されています。
編集するのはコーパス側で、この文書ではありません（`npm run docs:sources`）。

資料 **15件** / 引用可能な記述 **22件**。

## 運用上の約束

- EVIDENCE エージェントに渡されるのは、この一覧の記述だけです。
- ここに存在しない出典IDをモデルが返した場合、検証層が画面に出る前に削除し、
  その記述は「確認された根拠」から「推論」へ格下げされます。削除件数は検証記録に残ります。
- 各記述には、その数値を単独で引用してはならない理由（限界）が併記されています。
  製品画面でも、限界は数値と同じ画面に表示されます。
- `確認日` は、その URL が実在し到達できることを確認した日付です。
  資料本文の全文査読を意味するものではありません。この区別は意図的なものです。
- URL の到達性は `npm run verify:sources` で機械的に確認できます（HTTPで実取得）。
  2026-11-20 時点で 15件中 14件が到達、1件（UNEP）は非ブラウザからの要求を 403 で
  拒否しますが、実ブラウザでの表示を確認済みです。到達不能はゼロ件です。

## 既知の限界

- コーパスは全国規模・地球規模の統計と政策文書で構成されています。
  特定の一区画・一自治体の判断に必要な地域データは含まれていません。
  アプリはこの欠落を毎回「情報不足」として明示します。
- 日本と国際機関の資料に偏っており、他地域の事例は含まれていません。
- 貨幣評価額は代替法による推計であり、実際の支出額ではありません。

## 1. 日本の温室効果ガス排出・吸収量（LULUCF分野）公表資料

*Japan's GHG inventory — LULUCF sector*

| 項目 | 内容 |
| --- | --- |
| ID | `jp-ghg-inventory-lulucf` |
| 発行機関 | 環境省 / Ministry of the Environment, Japan |
| 発行年 | 2026 |
| 参照箇所 | 土地利用・土地利用変化・林業（LULUCF）分野の純吸収量 |
| 地域 | 日本 |
| 適用範囲 | 国全体の年度集計値。個別の森林や特定地域の吸収量には直接適用できない。年度ごとに改定される。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.env.go.jp/content/000435549.pdf> |

**引用可能な記述**

- `jp-ghg-inventory-lulucf#net-sink-2024`
  - 2024年度のLULUCF分野の温室効果ガス純吸収量は 49,421 kt-CO2換算で、1990年度比 35.5%減、前年度比 1.9%減。
  - 限界: 吸収量の減少は森林の高齢化による成長量低下が主因とされ、伐採量そのものを示す数値ではない。
- `jp-ghg-inventory-lulucf#net-sink-since-1990`
  - LULUCF分野は1990年度以降、一貫して純吸収（排出より吸収が多い状態）を維持している。
  - 限界: 純吸収の継続は、吸収量が増えていることを意味しない。

## 2. 令和7年版 森林・林業白書

*Annual Report on Forest and Forestry in Japan (FY2025 edition)*

| 項目 | 内容 |
| --- | --- |
| ID | `jp-forest-white-paper` |
| 発行機関 | 林野庁 / Forestry Agency, Japan |
| 発行年 | 2026 |
| 参照箇所 | 第1章 第4節 2（森林吸収源対策・人工林の齢級構成） |
| 地域 | 日本 |
| 適用範囲 | 日本の人工林全体の統計。天然林や海外の森林には適用できない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.rinya.maff.go.jp/j/kikaku/hakusyo/r7hakusyo_h/all/chap1_4_2.html> |

**引用可能な記述**

- `jp-forest-white-paper#age-class-shift`
  - 2021年度時点で、林齢51年以上の人工林が全人工林面積の 64% を占める。齢級構成は高齢側へさらに移動している。
  - 限界: 高齢化は吸収量の低下と結びつくが、伐採すべき/すべきでないという結論は本統計からは導けない。
- `jp-forest-white-paper#glasgow-declaration`
  - 2021年のCOP26では、日本を含む140か国以上が、2030年までに森林の消失と土地の劣化を好転させる目標を掲げた「森林・土地利用に関するグラスゴー・リーダーズ宣言」に参加した。
  - 限界: 政治宣言であり、法的拘束力のある義務ではない。

## 3. 森林吸収量の算定について（地球温暖化対策計画の森林吸収目標）

*Calculation of forest carbon sinks and Japan's 2030 sink target*

| 項目 | 内容 |
| --- | --- |
| ID | `jp-forest-sink-target` |
| 発行機関 | 林野庁 / Forestry Agency, Japan |
| 発行年 | 2026 |
| 参照箇所 | 地球温暖化対策計画における森林吸収量の目標 |
| 地域 | 日本 |
| 適用範囲 | 国の政策目標値。自治体や個別事業の評価基準ではない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.rinya.maff.go.jp/j/keikaku/ondanka/kyushuryosantei.html> |

**引用可能な記述**

- `jp-forest-sink-target#sink-target-2030`
  - 地球温暖化対策計画では、2030年度に約3,800万t-CO2（2013年度総排出量比 2.7%相当）の森林吸収量を確保する目標が掲げられている。
  - 限界: 目標値であり達成の保証ではない。現状の純吸収量は目標水準を上回るが減少傾向にある。

## 4. 森林の有する多面的機能（日本学術会議2001年答申の貨幣評価）

*Monetary valuation of forest multifunctionality (Science Council of Japan, 2001)*

| 項目 | 内容 |
| --- | --- |
| ID | `jp-forest-multifunction` |
| 発行機関 | 林野庁 / Forestry Agency, Japan（出典: 日本学術会議 答申 2001年11月1日） |
| 発行年 | 2001 |
| 参照箇所 | 「地球環境・人間生活にかかわる農業及び森林の多面的な機能の評価について」答申に基づく機能別評価額 |
| 地域 | 日本 |
| 適用範囲 | 代替法による全国推計。『森林がない場合』との比較という仮定に依存し、評価対象は多面的機能の一部に限られる。個別の森林の価値額としては使えない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.rinya.maff.go.jp/j/keikaku/tamenteki/index.html> |

**引用可能な記述**

- `jp-forest-multifunction#surface-erosion`
  - 表面侵食防止機能の評価額は年間 28兆2,565億円（有林地と無林地の侵食土砂量の差を堰堤建設費で代替評価）。
  - 限界: 代替法による試算であり、実際に支出される金額ではない。
- `jp-forest-multifunction#landslide-prevention`
  - 表層崩壊防止機能の評価額は年間 8兆4,421億円（山腹工事費用による代替評価）。
  - 限界: 同じく代替法。前提条件の変更で大きく変動する。
- `jp-forest-multifunction#flood-mitigation`
  - 洪水緩和機能の評価額は年間 6兆4,686億円、水資源貯留は 8兆7,407億円、水質浄化は 14兆6,361億円。
  - 限界: 水資源貯留はダムの減価償却費等による代替法。評価額の合計を『森林の価値』として扱うことは答申の趣旨を超える。

## 5. IPBES 生物多様性と生態系サービスに関する地球規模評価報告書

*IPBES Global Assessment Report on Biodiversity and Ecosystem Services*

| 項目 | 内容 |
| --- | --- |
| ID | `ipbes-global-assessment` |
| 発行機関 | IPBES / UNEP |
| 発行年 | 2019 |
| 参照箇所 | 政策決定者向け要約（五つの直接要因のランキング、改変された陸地割合） |
| 地域 | 世界 / Global |
| 適用範囲 | 地球規模の評価。特定の地域や一つの開発計画の影響を直接推定するものではない。2019年時点の評価。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.unep.org/en/news-and-stories/press-release/natures-dangerous-decline-unprecedented-species-extinction-rates> |

**引用可能な記述**

- `ipbes-global-assessment#land-use-top-driver`
  - 自然の変化をもたらす五つの直接要因のうち、世界規模での影響が最も大きいのは土地および海域利用の変化であり、次に生物の直接的採取、気候変動、汚染、侵略的外来種が続く。
  - 限界: 相対的な影響の順位であり、ある特定の開発が最大の要因であることを意味しない。
- `ipbes-global-assessment#species-at-risk`
  - 推定約800万種の動植物のうち、約100万種が絶滅の危機にあるとされ、その多くは数十年以内に危機を迎えうる。
  - 限界: 絶滅の『危機にある』種数の推計であり、すでに失われた種数ではない。
- `ipbes-global-assessment#land-altered`
  - 陸地表面の 75% が人間活動によって著しく改変され、主要な陸上生息地の在来種の平均個体数は、主に1900年以降に少なくとも 20% 減少した。
  - 限界: 世界平均であり、日本の個別地域の状態を示すものではない。

## 6. 都市におけるヒートアイランド対策（緑被率と気温低減のシミュレーション）

*Urban heat island countermeasures — green cover ratio simulation*

| 項目 | 内容 |
| --- | --- |
| ID | `mlit-green-cover-temperature` |
| 発行機関 | 国土交通省 / Ministry of Land, Infrastructure, Transport and Tourism |
| 発行年 | 2004 |
| 参照箇所 | 東京都心10km四方を対象とした緑被率変化のシミュレーション結果 |
| 地域 | 東京都心 / Central Tokyo |
| 適用範囲 | 東京都心を対象とした2004年のシミュレーション。他都市や地方部にそのまま適用できない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.mlit.go.jp/kisha/kisha04/04/040813/01.pdf> |

**引用可能な記述**

- `mlit-green-cover-temperature#green-cover-0-3c`
  - 東京都心の10km四方で緑被率を約10%上げると、日最高・最低・平均気温がおよそ 0.3℃ 低下するとされた。
  - 限界: 広域の気温変化としては小さい。緑地の効果は体感温度や局所的な涼しさで大きく、広域平均気温では限定的である点に注意。

## 7. 街区スケールの熱環境調査（街路樹とアスファルトの表面温度）

*Block-scale thermal survey — street trees vs asphalt*

| 項目 | 内容 |
| --- | --- |
| ID | `mlit-street-tree-surface-temp` |
| 発行機関 | 国土交通省 / MLIT |
| 発行年 | 2005 |
| 参照箇所 | 熱画像計測による表面温度の比較、MRT・HIP指標による評価 |
| 地域 | 日本の都市街区 / Japanese urban block |
| 適用範囲 | 表面温度の実測比較。気温（空気温度）の低下量とは別の指標であり、混同してはならない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.mlit.go.jp/kisha/kisha05/04/040812/01.pdf> |

**引用可能な記述**

- `mlit-street-tree-surface-temp#zelkova-vs-asphalt`
  - 熱画像計測では、道路沿いのケヤキの表面温度が約35℃、隣接するアスファルト舗装が40〜45℃（最高48.6℃）で、約5〜10℃の差が観測された。
  - 限界: これは表面温度の差であり、気温が5〜10℃下がることを意味しない。

## 8. まちなかの暑さ対策ガイドライン 改訂版

*Guideline for Heat Countermeasures in Urban Areas (revised)*

| 項目 | 内容 |
| --- | --- |
| ID | `env-heat-guideline` |
| 発行機関 | 環境省 / Ministry of the Environment, Japan |
| 発行年 | 2018 |
| 参照箇所 | 木陰・微細ミスト等の暑熱ストレス緩和策 |
| 地域 | 日本 |
| 適用範囲 | 人の暑熱ストレス（適応策）を対象とする。都市全体の気温低減（緩和策）とは目的が異なる。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.env.go.jp/content/900404694.pdf> |

**引用可能な記述**

- `env-heat-guideline#shade-adaptation`
  - まちなかの暑さ対策として木陰や微細ミスト等が扱われ、街路空間での対策が熱中症予防に有効とされている。
  - 限界: 都市の気温を下げる効果の根拠ではなく、人の暑熱ストレスを減らす対策としての位置づけ。

## 9. フューチャー・デザイン（仮想将来世代による意思決定の研究）

*Future Design — deliberation with imaginary future generations*

| 項目 | 内容 |
| --- | --- |
| ID | `future-design-saijo` |
| 発行機関 | 一橋大学 経済研究（西條辰義） |
| 発行年 | 2017 |
| 参照箇所 | 市場と民主制における将来世代の不在、ラボ実験・フィールド実験・自治体実践 |
| 地域 | 日本 |
| 適用範囲 | 制度設計の研究。本システムはこの枠組みをソフトウェアに移すが、実験結果の再現を主張するものではない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://econ-review.ier.hit-u.ac.jp/wp-content/uploads/files/2017-68/keizaikenkyu6801033.pdf> |

**引用可能な記述**

- `future-design-saijo#absence-of-future-generations`
  - 市場では将来世代が価格を通じて意思を示せず、民主制では投票できないため、将来世代の利害は構造的に意思決定から外れる。
  - 限界: 理論的な問題設定であり、個別の政策判断の正否を示すものではない。
- `future-design-saijo#imaginary-future-generation`
  - 地域計画やインフラ設計において、将来世代の視点を代弁する役割を明確に与えられた集団（仮想将来世代）を設け、現世代と交渉させる手法が研究・実践されている。
  - 限界: 人間が担う役割である。AIによる代替の有効性は本研究では検証されていない。

## 10. 未来の利益、いまどう代弁？——「仮想将来世代」学際で研究

*Representing future interests today — interdisciplinary research on imaginary future generations*

| 項目 | 内容 |
| --- | --- |
| ID | `tkfd-future-generations` |
| 発行機関 | 東京財団政策研究所 / Tokyo Foundation for Policy Research |
| 発行年 | 2016 |
| 参照箇所 | 亀田達也教授グループの実験に関する記述 |
| 地域 | 日本 |
| 適用範囲 | 解説記事。実験の詳細条件は原論文を参照する必要がある。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.tkfd.or.jp/research/detail.php?id=213> |

**引用可能な記述**

- `tkfd-future-generations#descendants-effect`
  - 東京大学の亀田達也教授グループは、子や孫を持つ者の方が将来世代の利益への関心が強まる傾向があるという実験結果を報告している。
  - 限界: 傾向の報告であり、因果関係や効果量は本記事からは確認できない。

## 11. Future You: AIが生成した未来の自分との対話が不安を低減する（MIT Media Lab）

*Future You: A Conversation with an AI-Generated Future Self Reduces Anxiety*

| 項目 | 内容 |
| --- | --- |
| ID | `mit-future-you` |
| 発行機関 | MIT Media Lab (arXiv preprint 2405.12514) |
| 発行年 | 2024 |
| 参照箇所 | 事前登録済みランダム化比較試験（4条件）とその結果 |
| 地域 | 米国 / United States |
| 適用範囲 | 個人の心理的ウェルビーイングを対象とした短期的な研究。集団の政策判断の質を扱っていない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://arxiv.org/abs/2405.12514> |

**引用可能な記述**

- `mit-future-you#anxiety-reduction`
  - 事前登録されたランダム化比較試験（参加者は報告により188名〜344名）で、AIが生成した60歳の自分との対話により、不安の低減と未来自己連続性の向上が報告された。
  - 限界: 短期効果であり、参加者の多くは若年成人。使用モデルはGPT-3.5の改変版。『自分の未来』が対象で、『他者である将来世代』ではない。

## 12. AIは将来の人類を代弁できるか（集合的意思決定におけるAIの「声」）

*Could AI Speak on Behalf of Future Humans?*

| 項目 | 内容 |
| --- | --- |
| ID | `stanford-pacs-ai-voice` |
| 発行機関 | Stanford Social Innovation Review（Konstantin Scheuermann・Angela Aristidou） |
| 発行年 | 2024 |
| 参照箇所 | 冒頭の「perspective deficit」の議論（2024年2月5日公開） |
| 地域 | 世界 / Global |
| 適用範囲 | 問題提起と構想の提示。実装の有効性検証ではない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://doi.org/10.48558/N4BW-ND72> |

**引用可能な記述**

- `stanford-pacs-ai-voice#excluded-from-deliberation`
  - 集合的意思決定には「視点の欠落」があり、将来世代と自然環境は現在の決定に深く影響されるにもかかわらず、自らの利益を主張できないために「声を持たない」存在になっていると指摘されている。
  - 限界: AIが代弁者として適切かは、思慮深く設計され責任をもって運用された場合に限るという条件付きで論じられており、規範的論点は未解決。

## 13. EU世代間公平性戦略への提言

*Submission to the EU Intergenerational Fairness Strategy*

| 項目 | 内容 |
| --- | --- |
| ID | `cfg-eu-intergenerational` |
| 発行機関 | Centre for Future Generations |
| 発行年 | 2025 |
| 参照箇所 | 技術・気候・経済戦略に対する世代間影響評価の義務化提言 |
| 地域 | 欧州連合 / European Union |
| 適用範囲 | 政策提言であり、制度として採択されたことを示すものではない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://cfg.eu/submission-to-the-eu-intergenerational-fairness-strategy/> |

**引用可能な記述**

- `cfg-eu-intergenerational#mandatory-impact-assessment`
  - 技術・気候・経済戦略に関する政策について、世代間影響評価を義務化することが提言されている。
  - 限界: 提言段階。EUが採択したと述べてはならない。

## 14. 欧州市民パネル「世代間の公平性」

*European Citizens' Panel on Intergenerational Fairness*

| 項目 | 内容 |
| --- | --- |
| ID | `eu-citizens-panel-intergenerational` |
| 発行機関 | European Commission |
| 発行年 | 2025 |
| 参照箇所 | 2025年9月〜11月の開催と欧州委員会への提言提出 |
| 地域 | 欧州連合 / European Union |
| 適用範囲 | 市民参加型プロセスの実例。提言内容そのものは本記録に含まれない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://citizens.ec.europa.eu/european-citizens-panels/citizens-panel-intergenerational-fairness_da> |

**引用可能な記述**

- `eu-citizens-panel-intergenerational#panel-2025`
  - 欧州市民パネル「世代間の公平性」は2025年9月から11月にかけて開催され、欧州委員会への提言提出が予定された。
  - 限界: 最終提言の内容と採否は本記録では確認していない。

## 15. IPBES地球規模評価 政策決定者向け要約（UNCCDライブラリ）

*IPBES Global Assessment — Summary for Policymakers (UNCCD library)*

| 項目 | 内容 |
| --- | --- |
| ID | `ipbes-spm-unccd` |
| 発行機関 | UNCCD / IPBES |
| 発行年 | 2019 |
| 参照箇所 | 政策シナリオに関する記述 |
| 地域 | 世界 / Global |
| 適用範囲 | 地球規模のシナリオ評価。地域の個別判断には直接適用できない。 |
| URL確認日 | 2026-11-20 |
| URL | <https://www.unccd.int/resources/unccd-library/summary-policymakers-global-assessment-report-biodiversity-and-ecosystem> |

**引用可能な記述**

- `ipbes-spm-unccd#scenarios-to-2050`
  - 報告書が検討したすべての政策シナリオにおいて、変革的な変化を含むものを除き、自然の負の傾向は2050年以降も継続すると投影された。
  - 限界: シナリオ投影であり確定した予測ではない。『変革的変化』の定義は報告書に依存する。
