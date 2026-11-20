/**
 * Checks that every URL in the evidence corpus actually resolves.
 *
 * The corpus records a `checkedOn` date meaning "this URL was seen in search
 * results that day". That is weaker than it sounds, and this script makes the
 * weaker claim testable: it fetches each URL and reports the status. It does
 * not read the document, so it still cannot tell you the figure is on the page
 * — that remains a human job and DATA_SOURCES.md says so.
 *
 *   npx tsx scripts/verify-sources.mts
 */
import { CORPUS } from "../src/lib/evidence/corpus.js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface Result {
  id: string;
  url: string;
  status: number | string;
  ms: number;
  finalUrl?: string;
}

async function probe(url: string): Promise<Omit<Result, "id" | "url">> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    // HEAD first; many government servers reject it, so fall back to a ranged GET.
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": UA },
    });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": UA, range: "bytes=0-2048" },
      });
    }
    return {
      status: res.status,
      ms: Date.now() - started,
      finalUrl: res.url !== url ? res.url : undefined,
    };
  } catch (error) {
    return {
      status: (error as Error).name === "AbortError" ? "timeout" : "error",
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

const results: Result[] = [];
for (const source of CORPUS) {
  const r = await probe(source.url);
  results.push({ id: source.id, url: source.url, ...r });
  const good = typeof r.status === "number" && r.status >= 200 && r.status < 400;
  console.log(
    `${good ? "OK  " : "NG  "} ${String(r.status).padEnd(7)} ${String(r.ms).padStart(5)}ms  ${source.id}`,
  );
  if (r.finalUrl) console.log(`         → ${r.finalUrl}`);
}

const reached = results.filter(
  (r) => typeof r.status === "number" && r.status >= 200 && r.status < 400,
);
// 403 means a server refused this client, not that the document is gone. Several
// government and UN sites block non-browser user agents. Those are reported
// separately and must be confirmed in a real browser, not counted as failures.
const blocked = results.filter((r) => r.status === 403);
const missing = results.filter(
  (r) => !reached.includes(r) && !blocked.includes(r),
);

console.log(`\n到達 ${reached.length} / 要ブラウザ確認 ${blocked.length} / 到達不能 ${missing.length}（全 ${results.length} 件）`);
if (blocked.length) {
  console.log("\n403（ボット拒否の可能性。実ブラウザで確認すること）:");
  for (const b of blocked) console.log(`  ${b.id}  ${b.url}`);
}
if (missing.length) {
  console.log("\n到達できなかったもの（要修正）:");
  for (const b of missing) console.log(`  ${b.id}  [${b.status}]  ${b.url}`);
}
process.exit(missing.length ? 1 : 0);
