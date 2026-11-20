/**
 * Pre-deployment readiness check.
 *
 * Everything here is something that would either break the deploy or make the
 * deployed app lie about itself. It is deliberately boring: it reads the repo
 * and the Vercel limits that were confirmed on 2026-11-20, and says what is
 * wrong rather than fixing anything.
 *
 *   npx tsx scripts/predeploy-check.mts
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const problems: string[] = [];
const notes: string[] = [];
const ok: string[] = [];

function check(condition: boolean, pass: string, fail: string) {
  (condition ? ok : problems).push(condition ? pass : fail);
}

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");

/* ---- the things that fail a Vercel deploy ---- */

// Hobby allows one region. More than one fails before the build step.
const vercelJson = read("vercel.json");
const regions: string[] = vercelJson ? (JSON.parse(vercelJson).regions ?? []) : [];
check(
  regions.length <= 1,
  `regions: ${regions.join(", ") || "(default iad1)"}`,
  `regions に ${regions.length} 件指定されている。Hobby は1件まで（ビルド前に失敗する）`,
);

// Hobby caps maxDuration at 300s; above that needs Pro.
const route = read("src/app/api/deliberate/route.ts");
const maxDuration = Number(route.match(/maxDuration\s*=\s*(\d+)/)?.[1] ?? 0);
check(
  maxDuration > 0 && maxDuration <= 300,
  `maxDuration: ${maxDuration}s（Hobby 上限 300s 以内）`,
  `maxDuration が ${maxDuration}s。Hobby の上限は 300s で、超えると Pro が要る`,
);

// The run budget must fit inside the function's own ceiling.
const budget = read("src/lib/security/budget.ts");
const maxRunMs = Number(budget.match(/maxRunMs:\s*([\d_]+)/)?.[1]?.replace(/_/g, "") ?? 0);
check(
  maxRunMs / 1000 <= maxDuration,
  `実行予算 ${maxRunMs / 1000}s ≤ maxDuration ${maxDuration}s`,
  `実行予算 ${maxRunMs / 1000}s が maxDuration ${maxDuration}s を超えている。関数が先に切られる`,
);

/* ---- the things that make the deployed app wrong ---- */

// A key in the repo would be published the moment the deploy goes out.
const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n");
check(
  !tracked.some((f) => /^\.env($|\.local|\.production)/.test(f)),
  "追跡されている .env は .env.example のみ",
  "実値を持つ .env が追跡されている。デプロイ前に取り除くこと",
);

const srcAll = execSync("git ls-files 'src/**'", { encoding: "utf8" })
  .split("\n").filter(Boolean).map(read).join("");
check(
  !srcAll.includes("NEXT_PUBLIC_"),
  "NEXT_PUBLIC_ 変数なし（鍵がクライアントに出ない）",
  "NEXT_PUBLIC_ 変数がある。クライアントに露出する",
);

// This override exists for the E2E run and must never ship.
check(
  !vercelJson.includes("RATE_LIMIT_CAPACITY"),
  "vercel.json に RATE_LIMIT_CAPACITY の上書きなし",
  "vercel.json が RATE_LIMIT_CAPACITY を設定している。本番では外すこと",
);

// SSE must not be buffered by the proxy.
check(
  route.includes("x-accel-buffering"),
  "SSE に x-accel-buffering: no が付いている",
  "SSE レスポンスに x-accel-buffering が無い。途中までしか届かない恐れ",
);
check(
  route.includes('runtime = "nodejs"'),
  "ルートが nodejs ランタイム（Edge の25秒ルールを受けない）",
  "ルートが Edge ランタイム。25秒以内に応答を始める必要がある",
);

/* ---- notes the deployer should see ---- */
notes.push(
  "GEMINI_API_KEY を設定しない場合、本番でも脚本モードで動く（画面にそう表示される）",
  "レート制限はインスタンス内メモリ。Fluid compute でインスタンスは再利用されるが、分散攻撃には効かない",
  "デプロイ後に /api/health を開き、rateLimit.overridden が false であることを確認すること",
);

console.log("\n── 通過 ──");
for (const o of ok) console.log("  ✓ " + o);
if (problems.length) {
  console.log("\n── 要対応 ──");
  for (const p of problems) console.log("  ✗ " + p);
}
console.log("\n── 覚えておくこと ──");
for (const n of notes) console.log("  · " + n);
console.log(problems.length ? `\nデプロイ不可: ${problems.length} 件\n` : "\nデプロイ可能\n");
process.exit(problems.length ? 1 : 0);
