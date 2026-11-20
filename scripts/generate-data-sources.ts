/**
 * Regenerates DATA_SOURCES.md from the corpus so the document cannot drift
 * away from what the application will actually cite.
 *
 *   npx tsx scripts/generate-data-sources.ts    (or: npm run docs:sources)
 */
import { writeFileSync } from "node:fs";
import { CORPUS, ALL_FINDING_IDS } from "../src/lib/evidence/corpus";

const lines: string[] = [];

lines.push("# DATA_SOURCES");
lines.push("");
lines.push(
  "この文書は `src/lib/evidence/corpus.ts` から自動生成されています。",
  "編集するのはコーパス側で、この文書ではありません（`npm run docs:sources`）。",
);
lines.push("");
lines.push(
  `資料 **${CORPUS.length}件** / 引用可能な記述 **${ALL_FINDING_IDS.length}件**。`,
);
lines.push("");
lines.push("## 運用上の約束");
lines.push("");
lines.push(
  "- EVIDENCE エージェントに渡されるのは、この一覧の記述だけです。",
  "- ここに存在しない出典IDをモデルが返した場合、検証層が画面に出る前に削除し、",
  "  その記述は「確認された根拠」から「推論」へ格下げされます。削除件数は検証記録に残ります。",
  "- 各記述には、その数値を単独で引用してはならない理由（限界）が併記されています。",
  "  製品画面でも、限界は数値と同じ画面に表示されます。",
  "- `確認日` は、その URL が検索結果に実在することを確認した日付です。",
  "  資料本文の全文査読を意味するものではありません。この区別は意図的なものです。",
);
lines.push("");
lines.push("## 既知の限界");
lines.push("");
lines.push(
  "- コーパスは全国規模・地球規模の統計と政策文書で構成されています。",
  "  特定の一区画・一自治体の判断に必要な地域データは含まれていません。",
  "  アプリはこの欠落を毎回「情報不足」として明示します。",
  "- 日本と国際機関の資料に偏っており、他地域の事例は含まれていません。",
  "- 貨幣評価額は代替法による推計であり、実際の支出額ではありません。",
);
lines.push("");

for (const [index, source] of CORPUS.entries()) {
  lines.push(`## ${index + 1}. ${source.titleJa}`);
  lines.push("");
  lines.push(`*${source.titleEn}*`);
  lines.push("");
  lines.push(`| 項目 | 内容 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| ID | \`${source.id}\` |`);
  lines.push(`| 発行機関 | ${source.org} |`);
  lines.push(`| 発行年 | ${source.year} |`);
  lines.push(`| 参照箇所 | ${source.locator} |`);
  lines.push(`| 地域 | ${source.region} |`);
  lines.push(`| 適用範囲 | ${source.scopeJa} |`);
  lines.push(`| URL確認日 | ${source.checkedOn} |`);
  lines.push(`| URL | <${source.url}> |`);
  lines.push("");
  lines.push("**引用可能な記述**");
  lines.push("");
  for (const finding of source.findings) {
    lines.push(`- \`${source.id}#${finding.id}\``);
    lines.push(`  - ${finding.ja}`);
    lines.push(`  - 限界: ${finding.caveatJa}`);
  }
  lines.push("");
}

writeFileSync("DATA_SOURCES.md", lines.join("\n"));
console.log(
  `DATA_SOURCES.md: ${CORPUS.length} sources, ${ALL_FINDING_IDS.length} findings`,
);
