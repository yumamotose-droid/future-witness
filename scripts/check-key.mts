/**
 * Confirms the Gemini key works, before anything expensive runs.
 *
 * Makes one tiny call and reports what came back. It never prints the key, and
 * it masks anything key-shaped that an error message might contain — provider
 * errors sometimes echo the request.
 *
 *   npm run check:key
 */
import { GoogleGenAI } from "@google/genai";
import { readFileSync, existsSync } from "node:fs";
import { DEFAULT_GEMINI_MODEL } from "../src/lib/ai/gemini.js";

// Load .env.local the same way Next does, without adding a dependency.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      const value = m[2].replace(/^["']|["']$/g, "");
      if (value) process.env[m[1]] = value;
    }
  }
}

const mask = (s: string) =>
  s.replace(/AIza[0-9A-Za-z_-]{10,}/g, "AIza…[伏せ字]").slice(0, 400);

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error(
    "GEMINI_API_KEY が未設定です。\n" +
    ".env.local の GEMINI_API_KEY= の右側に貼って保存してください。",
  );
  process.exit(1);
}
console.log(`鍵を検出しました（${key.length} 文字、値は表示しません）`);

const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
const ai = new GoogleGenAI({ apiKey: key });

/* 1 — can we reach the API at all, and what models does this key see? */
const names: string[] = [];
try {
  const page = await ai.models.list();
  for await (const m of page) {
    if (m.name) names.push(m.name.replace(/^models\//, ""));
    if (names.length >= 200) break;
  }
  const flash = names.filter((n) => /flash|pro/.test(n) && !/embed|vision|tts|image/.test(n));
  console.log(`\n利用できるモデル ${names.length} 件。うち対話向け:`);
  for (const n of flash.slice(0, 14)) console.log(`  ${n}${n === model ? "   ← 設定中" : ""}`);
} catch (error) {
  console.error(`\nモデル一覧を取得できませんでした: ${mask(String(error))}`);
}

if (names.length && !names.includes(model)) {
  console.error(
    `\n設定中のモデル「${model}」がこの鍵では見えません。` +
    `\n.env.local に GEMINI_MODEL=<上の一覧から選ぶ> を足してください。`,
  );
}

/* 2 — one real generation, measured. */
console.log(`\n「${model}」に1回だけ投げます…`);
const started = Date.now();
try {
  const res = await ai.models.generateContent({
    model,
    contents: '{"ok":true} とだけ返してください。',
    config: {
      temperature: 0,
      maxOutputTokens: 40,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
      },
    },
  });
  const ms = Date.now() - started;
  const text = (res.text ?? "").trim();
  const usage = res.usageMetadata;
  console.log(`\n成功。${ms}ms`);
  console.log(`  応答: ${text.slice(0, 80)}`);
  console.log(
    `  トークン: 入力 ${usage?.promptTokenCount ?? "?"} / 出力 ${usage?.candidatesTokenCount ?? "?"}`,
  );
  console.log(`\n次: npm run validate:live（20問をライブ実行）`);
} catch (error) {
  const msg = mask(error instanceof Error ? error.message : String(error));
  console.error(`\n失敗（${Date.now() - started}ms）: ${msg}`);
  if (/API_KEY_INVALID|API key not valid/i.test(msg))
    console.error("→ 鍵が無効です。貼り間違いか、失効している可能性があります。");
  else if (/PERMISSION_DENIED|SERVICE_DISABLED/i.test(msg))
    console.error("→ この鍵では Generative Language API が有効になっていません。");
  else if (/RESOURCE_EXHAUSTED|quota/i.test(msg))
    console.error("→ 割り当てを使い切っています。時間をおくか、課金設定を確認してください。");
  else if (/NOT_FOUND|not found/i.test(msg))
    console.error(`→ モデル名が違います。GEMINI_MODEL を上の一覧から選び直してください。`);
  process.exit(1);
}
