/**
 * Builds the narration track.
 *
 * macOS speaks Japanese through Kyoko. The rate in each segment is a starting
 * point, not a promise: punctuation adds pauses that no character count
 * predicts, so each line is synthesised, measured, and re-synthesised faster
 * until it fits its segment. If it will not fit by 205 — past which Kyoko
 * sounds hurried rather than calm — the script says so and stops, because the
 * fix then is shorter writing, not faster speech.
 *
 *   npx tsx scripts/make-narration.mts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { SEGMENTS, TOTAL_SECONDS } from "./video-segments.js";

const OUT = "artifacts/video/work";
const MAX_RATE = 205;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

function duration(file: string): number {
  return Number(
    execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "csv=p=0", file,
    ]).toString().trim(),
  );
}

function speak(text: string, rate: number, file: string): number {
  execFileSync("say", ["-v", "Kyoko", "-r", String(rate), "-o", file, text]);
  return duration(file);
}

const timeline: { id: string; startSec: number; seconds: number; rate: number; speechSec: number }[] = [];
const parts: string[] = [];
let cursor = 0;
let failed = false;

for (const seg of SEGMENTS) {
  const aiff = `${OUT}/${seg.id}.aiff`;
  const budget = seg.seconds - seg.leadInMs / 1000 - 0.25; // tail breath
  let rate = seg.rate;
  let spoken = speak(seg.narration, rate, aiff);

  while (spoken > budget && rate < MAX_RATE) {
    rate = Math.min(MAX_RATE, Math.ceil(rate * (spoken / budget) * 1.02));
    spoken = speak(seg.narration, rate, aiff);
  }

  const fits = spoken <= budget;
  if (!fits) failed = true;
  console.log(
    `${fits ? "OK  " : "OVER"} ${seg.id.padEnd(14)} 話速${String(rate).padStart(3)} ` +
    `発話${spoken.toFixed(1)}s / 枠${budget.toFixed(1)}s`,
  );

  // Pad: silence before (the beat), the speech, then silence to fill the segment.
  const wav = `${OUT}/${seg.id}.wav`;
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-f", "lavfi", "-t", String(seg.leadInMs / 1000), "-i", "anullsrc=r=48000:cl=stereo",
    "-i", aiff,
    "-f", "lavfi", "-t", String(Math.max(0, seg.seconds - seg.leadInMs / 1000 - spoken)),
    "-i", "anullsrc=r=48000:cl=stereo",
    "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]",
    "-map", "[out]", "-ar", "48000", "-ac", "2", "-t", String(seg.seconds), wav,
  ]);

  parts.push(wav);
  timeline.push({ id: seg.id, startSec: cursor, seconds: seg.seconds, rate, speechSec: spoken });
  cursor += seg.seconds;
}

writeFileSync(`${OUT}/concat.txt`, parts.map((p) => `file '${p.split("/").pop()}'`).join("\n"));
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-f", "concat", "-safe", "0",
  "-i", `${OUT}/concat.txt`, "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2",
  "artifacts/video/narration.wav",
]);
writeFileSync("artifacts/video/timeline.json", JSON.stringify({ totalSeconds: TOTAL_SECONDS, timeline }, null, 2));

const total = duration("artifacts/video/narration.wav");
console.log(`\nナレーション: ${total.toFixed(2)} 秒（目標 ${TOTAL_SECONDS} 秒）`);
console.log("artifacts/video/narration.wav / timeline.json");
if (failed) {
  console.log("\n枠に収まらない区間がある。話速ではなく文面を短くすること。");
  process.exit(1);
}
