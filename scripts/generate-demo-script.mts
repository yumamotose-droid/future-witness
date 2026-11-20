/**
 * Regenerates DEMO_SCRIPT_JP.md from the segment data the video is actually
 * built from, so the storyboard cannot drift from the film again.
 *
 *   npx tsx scripts/generate-demo-script.mts
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { SEGMENTS, TOTAL_SECONDS } from "./video-segments.js";

const ON_SCREEN: Record<string, string> = {
  "01-hero": "トップページ。左の罫線が上から引かれ、2026 が金、2050 が淡く現れる。明朝の大きな文字が時間差で沈み込む。",
  "02-framing": "`/deliberate?demo=1` に遷移。右上に「事前生成」バッジと、鍵がない旨の注記。見出し「この問いが置いている前提」へスクロール。余白に 推・？ のスタンプ。",
  "03-stakeholders": "「影響を受ける人と、投票できるかどうか」。オリーブの「投票できる」と金の「投票できない」。金の三行——2050年にこの地域で暮らす人／まだ生まれていない世代／その斜面に依存する生物——で止める。",
  "04-gate": "「はじめに、いまのあなたの立場」。選択肢A・B・C、確信のスライダー、理由欄。A を選び、「立場を記録する」を押す。「記録せずに読む」も画面に入れる。",
  "05-voice": "MIRAI の節。仮 のスタンプ。**三つの証言が同時に、毎秒55字で書き進む**（キャレット点滅）。ゲートを押した直後なのでライブで撮れる。",
  "06-evidence": "EVIDENCE の節。証 のスタンプと脚注。LULUCF の数値のすぐ下に、その数値の限界が同じスタンプで続く。",
  "07-cores": "「未来のコア標本」、右肩に金で「すべて仮想シナリオ」。3列の地層。2030／2040／2050 の行が列をまたいで揃っている。下の指標表（↑ ↓ ⇄）まで。",
  "08-counter": "COUNTER の節。自己反証の段落——語りが感覚的な細部で失われたものを描き、得られたものを抽象語で描く非対称——を画面で選択してハイライト。",
  "09-audit": "検証記録。検証した記述 36／照合した出典 28／存在せず削除した出典 0／シナリオの分岐度 100%／生成 scripted:forest-v1。",
  "10-close": "「審議を終えて、いまのあなたの立場」。最後の3.2秒でエンドカードへフェード。",
};

const DIRECTION: Record<string, string> = {
  "01-hero": "文字が置かれる「間」を切らない。読み込みから約2.5秒でアニメーションが落ち着く。",
  "02-framing": "「事前生成」バッジを隠さない。映ってよい。",
  "03-stakeholders": "ここが企画の核。金の三行で3秒静止。",
  "04-gate": "クリックは1回ずつ、ゆっくり。強制していないことが見えるように。",
  "05-voice": "書かれている最中を捉える。ここだけは早回し厳禁。",
  "06-evidence": "数値と限界が同じ画面に収まる画角にする。",
  "07-cores": "3列を同時に入れ、行が揃っていることを見せる。",
  "08-counter": "最も記憶に残る区間。文字を大きく、2秒静止。",
  "09-audit": "「存在せず削除した出典 0」で1秒止める。0であることではなく、欄があることが主張。",
  "10-close": "一文だけ置いて終わる。補足しない。",
};

const timelinePath = "artifacts/video/timeline.json";
const measured = existsSync(timelinePath)
  ? (JSON.parse(readFileSync(timelinePath, "utf8")) as {
      timeline: { id: string; rate: number; speechSec: number }[];
    }).timeline
  : [];

const L: string[] = [];
const pad = (n: number) => String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");

L.push("# DEMO_SCRIPT_JP — 90秒デモ動画");
L.push("");
L.push("> この文書は `scripts/video-segments.ts` から自動生成されています。");
L.push("> 編集するのはそちらで、この文書ではありません（`npm run docs:demo`）。");
L.push("> 動画そのものは `npm run video` で生成され、");
L.push("> 完成品は `artifacts/video/future-witness-demo.mp4` にあります。");
L.push("");
L.push("提出先: Google AI Challenge（90秒以内、YouTube限定公開）");
L.push("画面: `/deliberate?demo=1`（APIキー不要）");
L.push(`構成: ${SEGMENTS.length}区間・合計 ${TOTAL_SECONDS} 秒`);
L.push("");
L.push("**撮影について。** 審議は約11秒で完走しますが、途中に立場を記録するゲートがあり、");
L.push("クリックするまで先へ進みません。これは差別化要素の一つなのでカメラに映します。");
L.push("ゲートを通した直後に2050年の証言が毎秒55字で書き進むので、順番はその実挙動に");
L.push("合わせてあります。**早回しは使いません。全編を実時間で撮れます。**");
L.push("");
L.push("---");
L.push("");

let t = 0;
for (const seg of SEGMENTS) {
  const m = measured.find((x) => x.id === seg.id);
  L.push(`## ${pad(t)} – ${pad(t + seg.seconds)} ｜ ${seg.id.replace(/^\d+-/, "")}`);
  L.push("");
  L.push(`**画面**: ${ON_SCREEN[seg.id] ?? "—"}`);
  L.push("");
  L.push(`**ナレーション**（${[...seg.narration].length}字${m ? ` / 話速${m.rate} / 発話${m.speechSec.toFixed(1)}秒` : ""}）`);
  L.push(`> ${seg.narration}`);
  L.push("");
  L.push("**字幕**");
  for (const line of seg.subtitle) L.push(`- ${line}`);
  L.push("");
  L.push(`**カット指示**: ${DIRECTION[seg.id] ?? "—"}`);
  L.push("");
  L.push("---");
  L.push("");
  t += seg.seconds;
}

L.push("## 尺の内訳");
L.push("");
L.push("| 区間 | 秒 | 字数 | 字/秒 | 話速 |");
L.push("| --- | --- | --- | --- | --- |");
for (const seg of SEGMENTS) {
  const chars = [...seg.narration].length;
  const m = measured.find((x) => x.id === seg.id);
  L.push(`| ${seg.id} | ${seg.seconds} | ${chars} | ${(chars / seg.seconds).toFixed(1)} | ${m ? m.rate : "—"} |`);
}
L.push(`| **計** | **${TOTAL_SECONDS}** | ${SEGMENTS.reduce((n, s) => n + [...s.narration].length, 0)} | | |`);
L.push("");
L.push("話速は `make-narration` が自動で合わせます。各行を読み上げて長さを測り、");
L.push("区間に収まるまで速めます。205 を超えても収まらない場合は、速度ではなく");
L.push("文面を短くする必要があるとして停止します。");
L.push("");
L.push("## 撮影上の注意");
L.push("");
L.push("- **「事前生成」バッジと、鍵がない旨の注記を隠さない。** 映ってよい。");
L.push("- **早回しを使わない。** 全編を実時間で撮れる。");
L.push("- 字幕はナレーションと同一文にする（別の主張を足さない）。");
L.push("- 画面から引用する文言は、撮影時点の実画面と一字一句そろえる。");
L.push("");
L.push("## 未解決");
L.push("");
L.push("公式は「AIを活用しているシーン（画面録画やキャプチャなど）は必須」としています。");
L.push("現在の動画は**脚本モードの実行**で、画面に「事前生成」と出ます。");
L.push("`GEMINI_API_KEY` を設定して `npm run video` を再実行すれば、");
L.push("ライブ実行の録画に差し替わります。詳細は `CONTEST_STRATEGY.md`。");

writeFileSync("DEMO_SCRIPT_JP.md", L.join("\n") + "\n");
console.log(`DEMO_SCRIPT_JP.md: ${SEGMENTS.length} 区間 / ${TOTAL_SECONDS} 秒`);
