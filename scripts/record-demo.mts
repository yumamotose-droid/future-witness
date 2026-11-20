/**
 * Records the browser half of the demo video.
 *
 * Playwright drives a real run of the deployed-equivalent production build and
 * records it. Every action is pinned to the narration timeline in
 * video-segments.ts, so the picture and the voice stay together without
 * editing afterwards. Nothing is sped up: the run really does take this long.
 *
 * Needs a production server already listening:
 *   npm run build && npm run start -- --port 3100
 *   npx tsx scripts/record-demo.mts
 */
import { chromium, type Locator, type Page } from "@playwright/test";
import { mkdirSync, renameSync, rmSync, readdirSync } from "node:fs";
import { SEGMENTS, TOTAL_SECONDS } from "./video-segments.js";

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:3100";
const OUT = "artifacts/video";
const RAW = `${OUT}/raw`;
const W = 1280;
const H = 720;

rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });

const started = Date.now();
const at = (id: string) => {
  let t = 0;
  for (const s of SEGMENTS) {
    if (s.id === id) return t;
    t += s.seconds;
  }
  throw new Error(`unknown segment ${id}`);
};
/** Wait until this many seconds have elapsed since recording began. */
async function until(seconds: number) {
  const target = started + seconds * 1000;
  const wait = target - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  else if (wait < -600) console.warn(`  遅れ ${(-wait / 1000).toFixed(1)}s @ ${seconds}s`);
}

/**
 * Smooth scroll, stepped from Node.
 *
 * The obvious version passes an animation function to page.evaluate, but the
 * TypeScript runner rewrites named inner functions and the injected helper is
 * not defined in the page. Driving the steps from here sidesteps that and the
 * result is identical on camera.
 */
async function glide(page: Page, locator: Locator, ms = 1100) {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error("scroll target has no box");
  const from = Number(await page.evaluate("window.scrollY"));
  const target = Math.max(0, from + box.y - 90);
  const steps = Math.max(14, Math.round(ms / 26));
  for (let i = 1; i <= steps; i += 1) {
    const p = i / steps;
    const eased = 1 - Math.pow(1 - p, 3);
    await page.evaluate(`window.scrollTo(0, ${Math.round(from + (target - from) * eased)})`);
    await new Promise((r) => setTimeout(r, ms / steps));
  }
  await new Promise((r) => setTimeout(r, 140));
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: RAW, size: { width: W, height: H } },
  colorScheme: "light",
  locale: "ja-JP",
  deviceScaleFactor: 1,
});
const page = await context.newPage();
// The cursor is not part of the work; hide the text caret blink in fields.
await page.addStyleTag({ content: "*{caret-color:transparent!important}" }).catch(() => {});

console.log(`録画開始 — 目標 ${TOTAL_SECONDS} 秒`);

/* 01 — hero */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await until(at("02-framing") - 0.6);

/* 02 — the question and its premises */
await page.goto(`${BASE}/deliberate?demo=1`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "この問いが置いている前提" }).waitFor({ timeout: 30_000 });
await glide(page, page.getByRole("heading", { name: "この問いが置いている前提" }));
await until(at("03-stakeholders"));

/* 03 — who has a vote and who does not */
await glide(page, page.getByRole("heading", { name: "影響を受ける人と、投票できるかどうか" }), 1300);
await until(at("04-gate"));

/* 04 — record your position before seeing any output */
await glide(page, page.getByRole("heading", { name: "はじめに、いまのあなたの立場" }), 1200);
await until(at("04-gate") + 3.6);
await page.getByRole("radio").first().check();
await until(at("04-gate") + 6.0);
await page.getByRole("button", { name: "立場を記録する" }).click();

/* 05 — the testimony, caught while it is still being written */
await page.getByText("MIRAI").first().waitFor({ timeout: 20_000 });
await glide(page, page.getByText("MIRAI").first(), 900);
await until(at("06-evidence"));

/* 06 — evidence with its limits */
await glide(page, page.getByRole("heading", { name: "確認できる根拠と、その適用範囲" }), 1300);
await until(at("07-cores"));

/* 07 — the core samples */
await glide(page, page.getByRole("heading", { name: "未来のコア標本" }), 1300);
await until(at("07-cores") + 4.5);
await page.mouse.wheel(0, 260);
await until(at("08-counter"));

/* 08 — the objection, including to ourselves */
await glide(page, page.getByRole("heading", { name: "ここまでの全体に対する反証" }), 1300);
await until(at("08-counter") + 5.0);
await page.mouse.wheel(0, 300);
await until(at("09-audit"));

/* 09 — the verification record */
await glide(page, page.getByRole("heading", { name: "検証記録" }), 1300);
await until(at("10-close"));

/* 10 — the decision returns to the reader */
await glide(page, page.getByRole("heading", { name: "審議を終えて、いまのあなたの立場" }), 1100);
await until(TOTAL_SECONDS);

await context.close();
await browser.close();

const file = readdirSync(RAW).find((f) => f.endsWith(".webm"));
if (!file) throw new Error("録画ファイルが出力されていない");
renameSync(`${RAW}/${file}`, `${OUT}/screen.webm`);
console.log(`録画完了 — ${OUT}/screen.webm（実時間 ${((Date.now() - started) / 1000).toFixed(1)} 秒）`);
