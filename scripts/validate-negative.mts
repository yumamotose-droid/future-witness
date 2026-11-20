/**
 * Negative control for the validation harness.
 *
 * A check suite that always passes proves nothing. This feeds the pipeline's
 * own output through four deliberate corruptions and asserts that the
 * verifier, or the harness, catches each one. If any corruption slips through,
 * the corresponding green tick in runs-scripted.json is worthless.
 *
 *   npx tsx scripts/validate-negative.mts
 */
import { verifyStatements } from "../src/lib/evidence/verify.js";
import { FOREST_EVIDENCE, FOREST_SCENARIOS } from "../src/lib/agents/scripts/forest.js";
import type { Statement } from "../src/lib/types.js";

const cases: { name: string; run: () => { caught: boolean; evidence: string } }[] = [];

/* 1 — a fabricated citation must be removed and the claim demoted. */
cases.push({
  name: "捏造した出典IDが削除され、記述が格下げされる",
  run: () => {
    const poisoned: Statement = {
      ...FOREST_EVIDENCE,
      claims: [
        {
          kind: "verified",
          text: "森林は年間999兆円の価値があると国連が認定している。",
          sourceIds: ["un-global-forest-value-2026#headline"],
        },
      ],
    };
    const { statements, audit } = verifyStatements([poisoned], []);
    const c = statements[0].claims[0];
    return {
      caught: audit.citationsRejected === 1 && c.kind === "inference" && c.sourceIds.length === 0,
      evidence: `kind=${c.kind} 出典=${c.sourceIds.length} 削除=${audit.citationsRejected}`,
    };
  },
});

/* 2 — "verified" with no citation at all must not survive as verified. */
cases.push({
  name: "出典のない「確認された根拠」が格下げされる",
  run: () => {
    const { statements, audit } = verifyStatements(
      [{ ...FOREST_EVIDENCE, claims: [{ kind: "verified", text: "断定", sourceIds: [] }] }],
      [],
    );
    return {
      caught: statements[0].claims[0].kind === "inference" && audit.downgrades.length === 1,
      evidence: `kind=${statements[0].claims[0].kind} 格下げ=${audit.downgrades.length}`,
    };
  },
});

/* 3 — three paraphrases of one future must score as low divergence. */
cases.push({
  name: "シナリオが分岐していないとき、分岐度が低く出る",
  run: () => {
    const same = FOREST_SCENARIOS.map((s) => ({
      ...s,
      indicators: FOREST_SCENARIOS[0].indicators.map((i) => ({ ...i })),
    }));
    const { audit } = verifyStatements([], same);
    return {
      caught: audit.scenarioDivergence === 0,
      evidence: `分岐度=${(audit.scenarioDivergence * 100).toFixed(0)}%`,
    };
  },
});

/* 4 — the harness's prose checks must reject a conclusion being pushed. */
cases.push({
  name: "結論を押し付ける文面が検査に引っかかる",
  run: () => {
    const pushy = "以上より、選択肢Bを選ぶべきである。";
    // COUNTER really does say this, and it must not be flagged: telling the
    // reader to doubt the presentation is not recommending an option.
    const neutral = "読者はこの配分そのものを疑うべきである。";
    const rule = /(選択肢[A-D]?|[A-D]案)[^。]{0,24}(べき|推奨|勧め|望ましい)|(結論として|総合すると|最終的に|以上より)[^。]{0,30}(選ぶ|採用|推奨|望ましい|べき)/;
    return {
      caught: rule.test(pushy) && !rule.test(neutral),
      evidence: `押し付け=${rule.test(pushy)} / 中立=${rule.test(neutral)}`,
    };
  },
});

let failures = 0;
console.log("陰性対照 — 壊したものが検出されるか\n");
for (const c of cases) {
  const { caught, evidence } = c.run();
  if (!caught) failures += 1;
  console.log(`${caught ? "検出した  " : "見逃した  "} ${c.name}`);
  console.log(`             ${evidence}`);
}
console.log(
  failures
    ? `\n${failures} 件を見逃した。対応する検査は信用できない。\n`
    : "\n4件すべて検出。検査は実際に落ちる。\n",
);
process.exit(failures ? 1 : 0);
