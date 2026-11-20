/**
 * Writes the Gemini key into .env.local without it passing through the shell.
 *
 * The value is read with echo off, so it does not appear on screen, and it is
 * never a command argument, so it does not reach shell history or the process
 * list. It replaces the existing line rather than appending, so running this
 * twice does not leave two keys in the file.
 *
 *   npm run set:key
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";

const FILE = ".env.local";

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdout = process.stdout as NodeJS.WriteStream & { _writeToOutput?: unknown };
    // Echo nothing back while the key is typed or pasted.
    const rlAny = rl as unknown as { _writeToOutput: (s: string) => void };
    const original = rlAny._writeToOutput?.bind(rl);
    rlAny._writeToOutput = (s: string) => {
      if (s.includes(question)) original?.(s);
    };
    void stdout;
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const key = await prompt("Gemini API キーを貼って Enter（画面には出ません）: ");

if (!key) {
  console.error("何も入力されていません。中止しました。");
  process.exit(1);
}
if (/\s/.test(key)) {
  console.error("空白が含まれています。貼り付けの前後が混ざっていないか確認してください。");
  process.exit(1);
}

const existing = existsSync(FILE) ? readFileSync(FILE, "utf8") : "GEMINI_API_KEY=\n";
const next = existing.includes("\nGEMINI_API_KEY=") || existing.startsWith("GEMINI_API_KEY=")
  ? existing.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${key}`)
  : `${existing.replace(/\n*$/, "\n")}GEMINI_API_KEY=${key}\n`;

writeFileSync(FILE, next, { mode: 0o600 });
console.log(`${FILE} に書き込みました（${key.length} 文字、値は表示しません / 権限 600）`);
console.log("確認: npm run check:key");
