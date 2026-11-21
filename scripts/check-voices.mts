/**
 * Does the voice say what the screen says?
 *
 * Two things can go wrong once delivery is directed in the prompt. The model
 * can read the direction aloud, and it can paraphrase the line instead of
 * reading it. Both are invisible to a test that only checks a WAV came back,
 * and both would break the promise that the audio and the transcript are the
 * same words.
 *
 * So the audio goes back to Gemini to be transcribed, and the transcript is
 * compared with the line that was sent. Nothing here is mocked: a failure
 * means the voices are not usable as they stand.
 *
 *   npx tsx scripts/check-voices.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { CASTING } from "../src/lib/voice/casting.js";
import { synthesize } from "../src/lib/voice/tts.js";
import type { AgentId } from "../src/lib/types.js";

const OUT = "artifacts/voice";

const LINES: Record<AgentId, string> = {
  MIRAI:
    "わたしは2050年に生きています。あなたが今日選ぶことは、わたしの毎日になります。",
  EVIDENCE:
    "森林の多面的機能について、確認できることだけを述べます。ただしこの数値は全国平均で、個別の地域には当てはまりません。",
  COUNTER:
    "いま聞いた証言は、AIが書いた作り話です。これを根拠に決めてよいのでしょうか。",
  CHRONOS:
    "2030年、2040年、2050年。同じ選択が、三つの異なる時間をつくります。",
};

/** Words that only ever appear in the direction, never in a line. */
const DIRECTION_WORDS = ["読み上げ", "指示", "SPEAK", "読み方"];

function normalize(s: string): string {
  return s
    .replace(/[\s、。，．,.「」『』（）()！？!?・…―ー]/g, "")
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

/** Character-level agreement, order-sensitive: the longest common subsequence. */
function agreement(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  let prev = new Uint16Array(y.length + 1);
  for (let i = 1; i <= x.length; i++) {
    const row = new Uint16Array(y.length + 1);
    for (let j = 1; j <= y.length; j++) {
      row[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
    }
    prev = row;
  }
  return prev[y.length] / Math.max(x.length, y.length);
}

/**
 * Both sides are compared as readings, not as spelling.
 *
 * A first run marked MIRAI as a mismatch because the line says わたし and the
 * transcriber wrote 私 — the same sound, a different character. Comparing
 * kana removes an orthographic difference that no listener can hear, while
 * still catching a word that was actually changed, dropped or added.
 */
const TO_KANA =
  "次の日本語を、すべてひらがなの読みに変換してください。読みだけを出力し、説明や記号は加えないでください。";

async function transcribe(ai: GoogleGenAI, wav: Uint8Array): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "この音声に含まれる日本語を、聞こえたとおりに、すべてひらがなで書き起こしてください。説明や要約はせず、発話の読みだけを出力してください。",
          },
          { inlineData: { mimeType: "audio/wav", data: Buffer.from(wav).toString("base64") } },
        ],
      },
    ],
    config: { temperature: 0 },
  });
  return (response.text ?? "").trim();
}

async function reading(ai: GoogleGenAI, text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [{ role: "user", parts: [{ text: `${TO_KANA}\n\n${text}` }] }],
    config: { temperature: 0 },
  });
  return (response.text ?? "").trim();
}

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY が未設定です。");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const ai = new GoogleGenAI({ apiKey: key });

let failures = 0;
const rows: string[] = [];

for (const agent of Object.keys(LINES) as AgentId[]) {
  const line = LINES[agent];
  const casting = CASTING[agent];
  const startedAt = Date.now();
  const result = await synthesize({ text: line, agent });
  const elapsed = Date.now() - startedAt;

  const file = `${OUT}/${agent.toLowerCase()}.wav`;
  writeFileSync(file, result.wav);

  const heard = await transcribe(ai, result.wav);
  const intended = await reading(ai, line);
  const score = agreement(intended, heard);
  const leaked = DIRECTION_WORDS.filter((w) => heard.includes(w));

  const ok = score >= 0.85 && leaked.length === 0;
  if (!ok) failures++;

  console.log(`${ok ? "PASS" : "FAIL"}  ${agent.padEnd(9)} ${casting.voice.padEnd(10)} ` +
    `${result.seconds.toFixed(1)}秒 / 生成${(elapsed / 1000).toFixed(1)}秒 / 一致 ${(score * 100).toFixed(1)}%`);
  if (!ok) {
    console.log(`        意図: ${line}`);
    console.log(`        読み: ${intended}`);
    console.log(`        音声: ${heard}`);
    if (leaked.length) console.log(`        指示文の漏れ: ${leaked.join(", ")}`);
  }
  rows.push(
    `| ${agent} | ${casting.voice} | ${result.seconds.toFixed(1)}s | ${(elapsed / 1000).toFixed(1)}s | ${(score * 100).toFixed(1)}% | ${leaked.length ? "あり" : "なし"} |`,
  );
}

console.log("\n| エージェント | 声 | 長さ | 生成時間 | 文字一致 | 指示文の漏れ |");
console.log("| --- | --- | --- | --- | --- | --- |");
for (const r of rows) console.log(r);
console.log(`\n音声: ${OUT}/`);

if (failures) {
  console.error(`\n${failures} 件が基準を満たしていません。`);
  process.exit(1);
}
console.log("\n4声とも、画面の文字と音声が一致しています。");
