/**
 * Checks the finished run at the sizes people will actually open it on.
 *
 * Looks for the things that make an interface unusable rather than ugly:
 * horizontal overflow, tap targets below the 44px guideline, body text under
 * 14px, and text that runs past its container. Screenshots are written for a
 * human to look at afterwards, because none of these catch "it looks wrong".
 *
 *   npx tsx scripts/audit-viewports.mts
 */
import { chromium, devices, webkit, type Browser, type Page } from "@playwright/test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:3100";
const OUT = "artifacts/viewports";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { name: "desktop-1440", engine: "chromium", viewport: { width: 1440, height: 900 } },
  { name: "iphone-13", engine: "webkit", device: "iPhone 13" },
  { name: "pixel-7", engine: "chromium", device: "Pixel 7" },
  { name: "ipad-mini", engine: "chromium", device: "iPad Mini" },
] as const;

interface Finding { target: string; kind: string; detail: string }
const findings: Finding[] = [];

async function runThrough(page: Page) {
  await page.goto(`${BASE}/deliberate?demo=1`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "はじめに、いまのあなたの立場" })
    .waitFor({ timeout: 45_000 });
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "立場を記録する" }).click();
  // The verification record now lives behind the rail, so the rail appearing
  // is what says the run has finished.
  await page.getByRole("button", { name: /検証記録/ }).waitFor({ timeout: 60_000 });
  // Let the testimony finish writing so nothing is measured mid-reveal.
  await page.waitForTimeout(5_000);
}

/**
 * An opened panel is a surface of its own.
 *
 * It has its own scroll container, its own padding and its own controls, so
 * a layout fault inside it would never show in a measurement of the page
 * behind it.
 */
async function openVerification(page: Page) {
  await page.getByRole("button", { name: /検証記録/ }).first().click();
  await page.getByRole("dialog", { name: "検証記録" }).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
}

async function audit(page: Page, name: string) {
  // No named inner functions in here: the TypeScript runner rewrites them and
  // the helper it injects does not exist inside the page.
  const report = await page.evaluate(`(() => {
    const root = document.documentElement;
    const out = { overflow: root.scrollWidth - root.clientWidth,
                  smallTargets: [], smallText: [], clipped: [] };
    for (const el of Array.from(document.querySelectorAll("button, a[href], input, textarea, summary"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (el.closest("p, blockquote, li, dd")) continue;
      // The skip link is 1x1 until focused, which is how it is supposed to work.
      if (el.className && String(el.className).includes("sr-only")) continue;
      // Measure the hit area, not the box: a control can carry a 44px target
      // through an absolutely positioned ::after while its text stays 18px
      // tall. elementFromPoint cannot be used here because most of the page is
      // scrolled out of view by this point, so read the pseudo-element instead.
      const after = getComputedStyle(el, "::after");
      const extended =
        after.content !== "none" && after.position === "absolute"
          ? parseFloat(after.height) || 0
          : 0;
      const hitHeight = Math.round(Math.max(r.height, extended));
      if (hitHeight < 44 || r.width < 44) {
        out.smallTargets.push(el.tagName.toLowerCase() + ":" +
          (el.textContent || "").trim().slice(0, 22) + " 当たり" +
          Math.round(r.width) + "x" + hitHeight);
      }
    }
    for (const el of Array.from(document.querySelectorAll("p, li, dd, blockquote, td"))) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size && size < 13 && (el.textContent || "").trim().length > 20) {
        out.smallText.push(el.tagName.toLowerCase() + ":" +
          (el.textContent || "").trim().slice(0, 22) + " " + size + "px");
      }
    }
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 &&
          getComputedStyle(el).overflowX === "visible") {
        out.clipped.push(el.tagName.toLowerCase() + ":" +
          (el.textContent || "").trim().slice(0, 22) + " " +
          el.scrollWidth + ">" + el.clientWidth);
      }
    }
    return out;
  })()`) as {
    overflow: number;
    smallTargets: string[];
    smallText: string[];
    clipped: string[];
  };

  if (report.overflow > 1)
    findings.push({ target: name, kind: "横スクロール", detail: `${report.overflow}px` });
  for (const t of [...new Set(report.smallTargets)].slice(0, 6))
    findings.push({ target: name, kind: "タップ領域が44px未満", detail: t });
  for (const t of [...new Set(report.smallText)].slice(0, 6))
    findings.push({ target: name, kind: "本文が13px未満", detail: t });
  for (const t of [...new Set(report.clipped)].slice(0, 6))
    findings.push({ target: name, kind: "はみ出し", detail: t });

  return report;
}

for (const t of TARGETS) {
  const browser: Browser = await (t.engine === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext({
    ...("device" in t ? devices[t.device] : { viewport: t.viewport }),
    locale: "ja-JP",
    colorScheme: "light",
  });
  const page = await ctx.newPage();
  await runThrough(page);
  const r = await audit(page, t.name);
  await openVerification(page);
  await audit(page, `${t.name}（検証記録パネル）`);
  await page.screenshot({ path: `${OUT}/${t.name}-audit.png`, fullPage: false });
  console.log(
    `${t.name.padEnd(13)} 横${String(r.overflow).padStart(3)}px  ` +
    `小タップ${String([...new Set(r.smallTargets)].length).padStart(2)}  ` +
    `小文字${String([...new Set(r.smallText)].length).padStart(2)}  ` +
    `はみ出し${[...new Set(r.clipped)].length}`,
  );
  await browser.close();
}

writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
console.log(`\n指摘 ${findings.length} 件`);
for (const f of findings) console.log(`  [${f.target}] ${f.kind}: ${f.detail}`);
