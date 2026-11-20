import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const candidates = [
  "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash",
  "gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite",
];
for (const model of candidates) {
  const t0 = Date.now();
  try {
    const r = await ai.models.generateContent({
      model,
      contents: '{"ok":true} とだけ返してください。',
      config: {
        temperature: 0, maxOutputTokens: 60, responseMimeType: "application/json",
        responseJsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      },
    });
    const ms = Date.now() - t0;
    const u = r.usageMetadata;
    console.log(`OK   ${model.padEnd(22)} ${String(ms).padStart(6)}ms  出力${u?.candidatesTokenCount ?? "?"}tok  ${(r.text ?? "").trim().slice(0, 24)}`);
  } catch (e) {
    const msg = String(e).replace(/A[A-Za-z0-9._-]{30,}/g, "…");
    const code = msg.match(/"code":\s*(\d+)/)?.[1] ?? "?";
    const status = msg.match(/"status":\s*"(\w+)"/)?.[1] ?? "";
    console.log(`NG   ${model.padEnd(22)} ${String(Date.now() - t0).padStart(6)}ms  ${code} ${status}`);
  }
}
