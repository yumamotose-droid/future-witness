/**
 * Renders the subtitles and the end card as transparent PNGs.
 *
 * This ffmpeg build has neither libass nor freetype, so text cannot be drawn
 * at encode time. Rendering them in the browser instead is the better answer
 * anyway: the captions come out in the project's own typefaces, laid out by
 * the same engine as the app, instead of in whatever libass would have picked.
 *
 * Needs the production server running (it serves the self-hosted fonts).
 *   npx tsx scripts/render-captions.mts
 */
import { chromium } from "@playwright/test";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { SEGMENTS } from "./video-segments.js";

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:3100";
const OUT = "artifacts/video/captions";
const W = 1280;
const CAPTION_H = 150;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

interface Cue { file: string; start: number; end: number }

const timeline = JSON.parse(
  readFileSync("artifacts/video/timeline.json", "utf8"),
) as { timeline: { id: string; startSec: number; seconds: number; speechSec: number }[] };

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: W, height: 720 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
// Load the app so its self-hosted fonts are available to this document.
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

async function shot(html: string, height: number, file: string) {
  await page.setViewportSize({ width: W, height });
  await page.evaluate((markup) => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.innerHTML = markup;
    document.body.style.cssText =
      "margin:0;background:transparent;width:100%;height:100%;overflow:hidden";
  }, html);
  await page.waitForTimeout(220);
  await page.screenshot({ path: file, omitBackground: true });
}

const cues: Cue[] = [];

for (const seg of SEGMENTS) {
  const t = timeline.timeline.find((x) => x.id === seg.id);
  if (!t) continue;
  const lines = seg.subtitle;
  const speechStart = t.startSec + 0.25; // captions lead the voice slightly
  const window = Math.max(1.2, t.speechSec + 0.9);
  const per = window / lines.length;

  for (const [i, line] of lines.entries()) {
    const file = `${OUT}/${seg.id}-${i}.png`;
    await shot(
      `<div style="
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-family:var(--font-gothic),'Hiragino Sans',sans-serif;">
         <div style="
            background:rgba(37,41,35,0.82);
            padding:18px 34px;
            max-width:1080px;
            color:#F5F2EB;
            font-size:31px;
            line-height:1.5;
            letter-spacing:0.03em;
            text-align:center;
            border-left:2px solid #B4A17B;">${line}</div>
       </div>`,
      CAPTION_H,
      file,
    );
    cues.push({
      file,
      start: Number((speechStart + i * per).toFixed(2)),
      end: Number((speechStart + (i + 1) * per).toFixed(2)),
    });
  }
  console.log(`  ${seg.id}: ${lines.length} 行`);
}

/* The end card, full frame. */
await shot(
  `<div style="
      position:absolute;inset:0;background:#252923;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;">
     <div style="font-family:var(--font-mincho),'Hiragino Mincho ProN',serif;
                 font-size:60px;color:#F5F2EB;letter-spacing:0.14em;">FUTURE WITNESS</div>
     <div style="width:70px;height:1px;background:#B4A17B;"></div>
     <div style="font-family:var(--font-mincho),'Hiragino Mincho ProN',serif;
                 font-size:25px;color:#B4A17B;letter-spacing:0.1em;">The Future Has a Voice.</div>
     <div style="font-family:var(--font-plex-mono),monospace;font-size:13px;
                 color:#8A8F81;letter-spacing:0.26em;margin-top:14px;">未来の証人</div>
   </div>`,
  720,
  `${OUT}/endcard.png`,
);
console.log("  endcard");

await browser.close();
writeFileSync("artifacts/video/cues.json", JSON.stringify(cues, null, 2));
console.log(`\n字幕 ${cues.length} 枚 + エンドカード → ${OUT}`);
