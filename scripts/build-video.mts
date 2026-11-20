/**
 * Composes the finished demo video.
 *
 * Inputs: the browser recording, the narration track, and the captions and end
 * card rendered as PNGs by render-captions. No text is drawn by ffmpeg — this
 * build has no freetype — so every glyph on screen came out of the browser in
 * the project's own typefaces.
 *
 *   npx tsx scripts/build-video.mts
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { TOTAL_SECONDS } from "./video-segments.js";

const V = "artifacts/video";
const OUT = `${V}/future-witness-demo.mp4`;
const W = 1280;
const H = 720;
const FADE_AT = TOTAL_SECONDS - 3.2;

const cues = JSON.parse(readFileSync(`${V}/cues.json`, "utf8")) as {
  file: string; start: number; end: number;
}[];

const args: string[] = ["-v", "error", "-y"];

// 0: the screen recording. 1: the narration.
args.push("-i", `${V}/screen.webm`);
args.push("-i", `${V}/narration.wav`);
// 2..n: captions, then the end card. Looped so each has its own full timeline.
for (const c of cues) args.push("-loop", "1", "-framerate", "30", "-t", String(TOTAL_SECONDS), "-i", c.file);
args.push("-loop", "1", "-framerate", "30", "-t", String(TOTAL_SECONDS), "-i", `${V}/captions/endcard.png`);

const chain: string[] = [];
// Hold the last frame if the recording came up a little short, then cut to length.
chain.push(
  `[0:v]fps=30,scale=${W}:${H},tpad=stop_mode=clone:stop_duration=3,` +
  `trim=0:${TOTAL_SECONDS},setpts=PTS-STARTPTS,format=rgba[base]`,
);

let last = "base";
cues.forEach((c, i) => {
  const input = i + 2;
  chain.push(`[${input}:v]scale=${W}:-1,format=rgba[c${i}]`);
  chain.push(
    `[${last}][c${i}]overlay=x=0:y=H-h-26:format=auto:` +
    `enable='between(t,${c.start},${c.end})'[v${i}]`,
  );
  last = `v${i}`;
});

const endIdx = cues.length + 2;
chain.push(
  `[${endIdx}:v]scale=${W}:${H},format=rgba,` +
  `fade=t=in:st=${FADE_AT}:d=1.3:alpha=1[ec]`,
);
chain.push(`[${last}][ec]overlay=0:0:format=auto:enable='gte(t,${FADE_AT})'[vout]`);

args.push(
  "-filter_complex", chain.join(";"),
  "-map", "[vout]", "-map", "1:a",
  "-t", String(TOTAL_SECONDS),
  "-c:v", "libx264", "-preset", "slow", "-crf", "20",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  OUT,
);

console.log(`合成中（字幕 ${cues.length} 枚 + エンドカード）…`);
execFileSync("ffmpeg", args, { stdio: "inherit" });

const probe = (k: string) =>
  execFileSync("ffprobe", [
    "-v", "error", "-show_entries", k, "-of", "csv=p=0", OUT,
  ]).toString().trim();

const duration = Number(probe("format=duration"));
const size = statSync(OUT).size;
console.log(`\n${OUT}`);
console.log(`  長さ   ${duration.toFixed(2)} 秒（上限 90 秒）`);
console.log(`  解像度 ${probe("stream=width,height").split("\n")[0].replace(",", "x")}`);
console.log(`  容量   ${(size / 1024 / 1024).toFixed(1)} MB`);
if (duration > 90.0) {
  console.log("\n90秒を超えている。区間の秒数を削ること。");
  process.exit(1);
}
