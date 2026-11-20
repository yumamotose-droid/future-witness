/**
 * Captures the evidence screenshots referenced by TEST_REPORT.md.
 * Run against a production server: `npm run start -- --port 3100` first.
 *
 *   npx tsx scripts/capture-screenshots.ts
 */
import { chromium, devices, webkit, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:3100";
const OUT = "artifacts/screenshots";

async function runToEnd(page: Page) {
  await page.goto(`${BASE}/deliberate?demo=1`);
  await page
    .getByRole("heading", { name: "はじめに、いまのあなたの立場" })
    .waitFor({ timeout: 60_000 });
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "立場を記録する" }).click();
  await page
    .getByRole("heading", { name: "検証記録" })
    .waitFor({ timeout: 60_000 });
}

/** The sticky header would print across the middle of an element capture. */
async function unstick(page: Page) {
  await page.addStyleTag({
    content: "header{position:static !important}",
  });
}

async function shot(page: Page, name: string, selector?: string) {
  if (selector) {
    const el = page.locator(selector).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await el.screenshot({ path: `${OUT}/${name}.png` });
  } else {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  }
  console.log(`  ${name}.png`);
}

mkdirSync(OUT, { recursive: true });

for (const scheme of ["light", "dark"] as const) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: scheme,
    locale: "ja-JP",
  });
  const page = await context.newPage();

  console.log(`desktop / ${scheme}`);
  await page.goto(BASE);
  await page.waitForTimeout(2200);
  await shot(page, `01-hero-${scheme}`);

  await runToEnd(page);
  await unstick(page);
  await shot(page, `02-framing-${scheme}`, "section:has-text('問いを立て直す')");
  await shot(page, `03-evidence-${scheme}`, "section:has-text('確認できる根拠と、その適用範囲')");
  await shot(page, `04-core-samples-${scheme}`, "section:has-text('未来のコア標本')");
  await shot(page, `05-voices-${scheme}`, "section:has-text('2050年を生きる一人の生活')");
  await shot(page, `06-counter-${scheme}`, "section:has-text('ここまでの全体に対する反証')");
  await shot(page, `07-audit-${scheme}`, "section:has-text('検証記録')");
  await shot(page, `08-sources-${scheme}`, "section:has-text('この審議で参照した資料')");

  await browser.close();
}

// Mobile Safari, where most Japanese readers will actually open this.
{
  const browser = await webkit.launch();
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ja-JP",
  });
  const page = await context.newPage();
  console.log("mobile / webkit");
  await page.goto(BASE);
  await page.waitForTimeout(2200);
  await shot(page, "09-hero-mobile");
  await runToEnd(page);
  await unstick(page);
  await shot(page, "10-core-samples-mobile", "section:has-text('未来のコア標本')");
  await shot(page, "11-audit-mobile", "section:has-text('検証記録')");
  await browser.close();
}

console.log(`\nSaved to ${OUT}/`);
