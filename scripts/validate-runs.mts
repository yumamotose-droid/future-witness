/**
 * Runs the twenty validation questions through the full pipeline and checks
 * each result against the properties the system claims to guarantee.
 *
 *   npx tsx scripts/validate-runs.mts            # scripted engine
 *   npx tsx scripts/validate-runs.mts --live     # requires GEMINI_API_KEY
 *   npx tsx scripts/validate-runs.mts --realtime # do not skip streaming delay
 *
 * The checks are written so that a run which *admits ignorance* passes and a
 * run which answers confidently without sources fails. That is the opposite of
 * the usual direction and it is deliberate: for this system, a confident answer
 * about a question the corpus cannot reach is the defect.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { runDeliberation } from "../src/lib/agents/orchestrator.js";
import { requestSchema } from "../src/lib/agents/schemas.js";
import { estimateTokens } from "../src/lib/security/budget.js";
import { QUESTIONS } from "./questions.js";
import type { StreamEvent, Scenario } from "../src/lib/types.js";

const live = process.argv.includes("--live");
const realtime = process.argv.includes("--realtime");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

// Load .env.local so a live run picks up the key the same way Next does.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

if (live && !process.env.GEMINI_API_KEY) {
  console.error("--live には GEMINI_API_KEY が要ります。設定されていません。");
  process.exit(2);
}

interface Check { name: string; pass: boolean; detail: string }
interface RunReport {
  id: string;
  domain: string;
  question: string;
  mode: string;
  model: string;
  elapsedMs: number;
  outputChars: number;
  estTokens: number;
  checks: Check[];
  audit?: Record<string, unknown>;
  error?: string;
}

function collectText(events: StreamEvent[]): string {
  const parts: string[] = [];
  for (const e of events) {
    if (e.type === "statement") for (const c of e.data.claims) parts.push(c.text);
    if (e.type === "framing") {
      parts.push(e.data.coreJa);
      for (const c of e.data.assumptions) parts.push(c.text);
    }
    if (e.type === "voice-delta") parts.push(e.text);
    if (e.type === "scenarios")
      for (const s of e.data)
        for (const st of s.strata) parts.push(st.headlineJa, st.detailJa);
    if (e.type === "options") for (const o of e.data) parts.push(o.summaryJa);
  }
  return parts.join("");
}

async function runOne(q: (typeof QUESTIONS)[number]): Promise<RunReport> {
  const input = requestSchema.parse({ question: q.text, lang: "ja" });
  const events: StreamEvent[] = [];
  const started = Date.now();
  try {
    for await (const e of runDeliberation(input, {
      forceScripted: !live,
      instant: !realtime,
    })) events.push(e);
  } catch (error) {
    return {
      id: q.id, domain: q.domain, question: q.text,
      mode: "crashed", model: "-", elapsedMs: Date.now() - started,
      outputChars: 0, estTokens: 0, checks: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const elapsedMs = Date.now() - started;

  const meta = events.find((e) => e.type === "meta");
  const audit = events.find((e) => e.type === "audit");
  const framing = events.find((e) => e.type === "framing");
  const options = events.find((e) => e.type === "options");
  const scenarios = events.find((e) => e.type === "scenarios");
  const statements = events.filter((e) => e.type === "statement");
  const errors = events.filter((e) => e.type === "error");

  const a = audit?.type === "audit" ? audit.data : undefined;
  const scen: Scenario[] = scenarios?.type === "scenarios" ? scenarios.data : [];
  const counter = statements.find(
    (s) => s.type === "statement" && s.data.agent === "COUNTER",
  );
  const counterText =
    counter?.type === "statement"
      ? counter.data.claims.map((c) => c.text).join("")
      : "";
  const text = collectText(events);

  const checks: Check[] = [
    { name: "完走した", pass: events.at(-1)?.type === "done",
      detail: `最終イベント: ${events.at(-1)?.type}` },
    { name: "エラーを出さずに終えた", pass: errors.length === 0,
      detail: `${errors.length} 件` },
    { name: "選択肢が3つ以上（二択にしていない）",
      pass: (options?.type === "options" ? options.data.length : 0) >= 3,
      detail: `${options?.type === "options" ? options.data.length : 0} 件` },
    { name: "投票できない当事者を挙げた",
      pass: framing?.type === "framing" &&
            framing.data.stakeholders.some((s) => !s.hasVote),
      detail: framing?.type === "framing"
        ? framing.data.stakeholders.filter((s) => !s.hasVote).map((s) => s.nameJa).join(" / ") || "なし"
        : "なし" },
    // The promise is not that the model never cites wrongly — it is that a
    // wrong citation never reaches the reader as evidence. Measure the promise.
    { name: "不正な出典が1件残らず削除・格下げされた",
      pass: (a?.citationsRejected ?? 0) === (a?.downgrades.length ?? -1) ||
            (a?.citationsRejected ?? 0) === 0,
      detail: `削除 ${a?.citationsRejected ?? "?"} / 格下げ ${a?.downgrades.length ?? "?"}` },
    { name: "存在しない資料を創作していない",
      pass: (a?.rejectedInvented?.length ?? 0) === 0,
      detail: (a?.rejectedInvented?.length ?? 0) === 0
        ? "なし"
        : `創作 ${a?.rejectedInvented.join(", ")}` },
    { name: "情報不足を最低1つ述べた",
      pass: (a?.byKind.unknown ?? 0) >= 1,
      detail: `unknown ${a?.byKind.unknown ?? 0} 件` },
    { name: "仮想シナリオが事実と分離されている",
      pass: (a?.byKind.hypothetical ?? 0) >= 1 && (a?.byKind.verified ?? 0) >= 1,
      detail: `verified ${a?.byKind.verified ?? 0} / hypothetical ${a?.byKind.hypothetical ?? 0}` },
    { name: "シナリオが分岐している（50%以上）",
      pass: (a?.scenarioDivergence ?? 0) >= 0.5,
      detail: `${((a?.scenarioDivergence ?? 0) * 100).toFixed(0)}%` },
    { name: "2030/2040/2050 の三層が揃っている",
      pass: scen.length > 0 && scen.every(
        (s) => JSON.stringify(s.strata.map((x) => x.year)) === "[2030,2040,2050]"),
      detail: `${scen.length} シナリオ` },
    { name: "反証がこのシステム自身を攻撃している",
      pass: /このシステム|代弁|演出|非対称/.test(counterText),
      detail: counterText ? "該当あり" : "COUNTER なし" },
    { name: "断定的な確率・金額を生成していない",
      // The corpus's own figures are allowed; invented precision is not.
      pass: !/\b\d{1,3}(\.\d+)?%の確率|必ず\d|確実に\d/.test(text),
      detail: "正規表現で検査" },
    { name: "結論を押し付けていない",
      // Bans recommending an option, not every use of "べき": COUNTER
      // legitimately tells the reader to doubt things. The earlier rule only
      // matched すべきである and so matched nothing at all — the negative
      // control in validate-negative.mts caught that.
      pass: !/(選択肢[A-D]?|[A-D]案)[^。]{0,24}(べき|推奨|勧め|望ましい)|(結論として|総合すると|最終的に|以上より)[^。]{0,30}(選ぶ|採用|推奨|望ましい|べき)/.test(text),
      detail: "選択肢への推奨表現を検査" },
  ];

  // Questions the corpus cannot reach must say so.
  if (!q.corpusCovers) {
    checks.push({
      name: "コーパス外の問いで、地域データの欠落を明示した",
      pass: /情報不足|含まれていない|不明である|答えられない/.test(text),
      detail: "本文に欠落の明示があるか",
    });
  }

  return {
    id: q.id, domain: q.domain, question: q.text,
    mode: meta?.type === "meta" ? meta.mode : "?",
    model: meta?.type === "meta" ? meta.model : "?",
    elapsedMs,
    outputChars: text.length,
    estTokens: estimateTokens(text),
    checks,
    audit: a as unknown as Record<string, unknown>,
  };
}

const reports: RunReport[] = [];
console.log(`モード: ${live ? `ライブ（${process.env.GEMINI_MODEL ?? "既定"}）` : "脚本"} / ${realtime ? "実時間" : "遅延スキップ"}\n`);

for (const q of QUESTIONS.slice(0, limit)) {
  const r = await runOne(q);
  reports.push(r);
  const failed = r.checks.filter((c) => !c.pass);
  const mark = r.error ? "CRASH" : failed.length === 0 ? "PASS " : "FAIL ";
  console.log(
    `${mark} ${r.id} [${r.domain}] ${String(r.elapsedMs).padStart(6)}ms  ` +
    `${r.checks.length - failed.length}/${r.checks.length}  ${r.question.slice(0, 26)}…`,
  );
  for (const f of failed) console.log(`        ✗ ${f.name} — ${f.detail}`);
  if (r.error) console.log(`        ✗ ${r.error}`);
}

mkdirSync("artifacts/validation", { recursive: true });
const stamp = live ? "live" : "scripted";
writeFileSync(
  `artifacts/validation/runs-${stamp}.json`,
  JSON.stringify({ at: new Date().toISOString(), live, realtime, reports }, null, 2),
);

const totalChecks = reports.reduce((n, r) => n + r.checks.length, 0);
const passed = reports.reduce((n, r) => n + r.checks.filter((c) => c.pass).length, 0);
const cleanRuns = reports.filter((r) => !r.error && r.checks.every((c) => c.pass)).length;
const totalTokens = reports.reduce((n, r) => n + r.estTokens, 0);
const checked = reports.reduce((n, r) => n + Number((r.audit?.citationsChecked as number) ?? 0), 0);
const rejected = reports.reduce((n, r) => n + Number((r.audit?.citationsRejected as number) ?? 0), 0);
const malformed = reports.reduce((n, r) => n + ((r.audit?.rejectedMalformed as string[]) ?? []).length, 0);
const invented = reports.reduce((n, r) => n + ((r.audit?.rejectedInvented as string[]) ?? []).length, 0);
const medianMs = [...reports.map((r) => r.elapsedMs)].sort((a, b) => a - b)[
  Math.floor(reports.length / 2)
];

console.log(`\n${"─".repeat(58)}`);
console.log(`完全通過した質問: ${cleanRuns} / ${reports.length}`);
console.log(`検査項目:         ${passed} / ${totalChecks}`);
console.log(`所要時間の中央値: ${medianMs}ms`);
console.log(`出力の推定トークン合計: ${totalTokens.toLocaleString()}`);
console.log(
  `出典: 照合 ${checked} / 削除 ${rejected}` +
  (rejected ? `（粒度違い ${malformed} / 創作 ${invented}）` : "") +
  (checked ? ` — 誤り率 ${((rejected / checked) * 100).toFixed(1)}%` : ""),
);
if (live) {
  // Gemini Flash pricing is not hard-coded here on purpose: it changes, and a
  // stale number in a report is worse than no number. Tokens are reported raw.
  console.log("（課金額は、上のトークン数に当日の単価を掛けて算出すること）");
}
console.log(`詳細: artifacts/validation/runs-${stamp}.json`);
process.exit(cleanRuns === reports.length ? 0 : 1);
