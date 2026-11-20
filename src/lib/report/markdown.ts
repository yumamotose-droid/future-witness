import { resolveFinding } from "@/lib/evidence/corpus";
import { KIND_META } from "@/lib/i18n/dictionary";
import type {
  Claim,
  DeliberationResult,
  Lang,
  SessionRecord,
  Statement,
} from "@/lib/types";

/**
 * The decision record.
 *
 * This is the artefact the user leaves with, and it is written so that someone
 * who was not present can audit the decision: the position held before, the
 * position held after, what was cited, what was rejected, and what was still
 * unknown at the moment of deciding. The record never contains a
 * recommendation, because the system never made one.
 */

function kindTag(claim: Claim, lang: Lang): string {
  const meta = KIND_META[claim.kind];
  const label = lang === "ja" ? meta.ja : meta.en;
  const demoted = claim.downgradedFrom
    ? lang === "ja"
      ? "／格下げ"
      : "/downgraded"
    : "";
  return `[${label}${demoted}]`;
}

function citations(claim: Claim): string {
  if (claim.sourceIds.length === 0) return "";
  const refs = claim.sourceIds
    .map((id) => {
      const hit = resolveFinding(id);
      if (!hit) return id;
      return `${hit.source.titleJa}（${hit.source.org}, ${hit.source.year}）<${hit.source.url}>`;
    })
    .join(" / ");
  return `\n    - 出典: ${refs}`;
}

function renderStatement(statement: Statement, lang: Lang): string {
  const title = lang === "ja" ? statement.titleJa : statement.titleEn;
  const lines = statement.claims.map(
    (c) => `  - ${kindTag(c, lang)} ${c.text}${citations(c)}`,
  );
  return [`### ${statement.agent} — ${title}`, ...lines].join("\n");
}

export function buildReportMarkdown(
  session: SessionRecord,
  result: DeliberationResult,
  lang: Lang = "ja",
): string {
  const L = lang === "ja";
  const out: string[] = [];

  out.push(`# ${L ? "意思決定レポート" : "Decision record"}`);
  out.push("");
  out.push(`- ${L ? "問い" : "Question"}: ${session.question}`);
  out.push(
    `- ${L ? "作成" : "Created"}: ${new Date(session.createdAt).toISOString()}`,
  );
  out.push(
    `- ${L ? "生成" : "Generation"}: ${result.audit.mode === "live" ? (L ? "ライブ生成" : "live") : L ? "事前生成（モデル未呼び出し）" : "pre-written (no model call)"} / ${result.audit.model}`,
  );
  out.push("");

  out.push(`## ${L ? "1. 立場の記録" : "1. Positions recorded"}`);
  if (session.before) {
    const option = result.options.find((o) => o.id === session.before?.optionId);
    out.push(
      `- ${L ? "審議前" : "Before"}: ${session.before.optionId} ${option ? (L ? option.labelJa : option.labelEn) : ""} / ${L ? "確信" : "certainty"} ${session.before.confidence}%`,
    );
    if (session.before.reason) out.push(`  - ${L ? "理由" : "Reason"}: ${session.before.reason}`);
  } else {
    out.push(`- ${L ? "審議前の立場は記録されていません。" : "No prior position was recorded."}`);
  }
  if (session.after) {
    const option = result.options.find((o) => o.id === session.after?.optionId);
    out.push(
      `- ${L ? "審議後" : "After"}: ${session.after.optionId} ${option ? (L ? option.labelJa : option.labelEn) : ""} / ${L ? "確信" : "certainty"} ${session.after.confidence}%`,
    );
    if (session.after.reason) out.push(`  - ${L ? "理由" : "Reason"}: ${session.after.reason}`);
  }
  if (session.before && session.after) {
    const moved = session.before.optionId !== session.after.optionId;
    const delta = session.after.confidence - session.before.confidence;
    out.push(
      `- ${L ? "変化" : "Movement"}: ${moved ? (L ? "選択が変わった" : "choice changed") : L ? "選択は変わらなかった" : "choice unchanged"} / ${L ? "確信" : "certainty"} ${delta >= 0 ? "+" : ""}${delta}`,
    );
  }
  out.push("");

  out.push(`## ${L ? "2. 問いの立て直しと前提" : "2. The question restated, and its premises"}`);
  out.push(L ? result.framing.coreJa : result.framing.coreEn);
  out.push("");
  for (const assumption of result.framing.assumptions) {
    out.push(`- ${kindTag(assumption, lang)} ${assumption.text}${citations(assumption)}`);
  }
  out.push("");
  out.push(`### ${L ? "影響を受ける人と投票可能性" : "Affected parties and their vote"}`);
  for (const s of result.framing.stakeholders) {
    out.push(
      `- ${L ? s.nameJa : s.nameEn} — ${L ? s.horizonJa : s.horizonEn} — ${s.hasVote ? (L ? "参加できる" : "can take part") : L ? "参加できない" : "cannot take part"}`,
    );
  }
  out.push("");

  out.push(`## ${L ? "3. 選択肢" : "3. Options"}`);
  for (const option of result.options) {
    out.push(`- **${option.id}. ${L ? option.labelJa : option.labelEn}** — ${L ? option.summaryJa : option.summaryEn}`);
  }
  out.push("");

  out.push(`## ${L ? "4. 根拠・反証・未解決" : "4. Evidence, objections, unknowns"}`);
  for (const statement of result.statements) {
    out.push(renderStatement(statement, lang));
    out.push("");
  }

  out.push(`## ${L ? "5. 未来シナリオ" : "5. Future scenarios"}`);
  for (const scenario of result.scenarios) {
    out.push(`### ${scenario.id}. ${L ? scenario.nameJa : scenario.nameEn}`);
    out.push(`- ${L ? "前提" : "Premise"}: ${L ? scenario.premiseJa : scenario.premiseEn}`);
    for (const stratum of scenario.strata) {
      out.push(
        `- ${stratum.year}: ${L ? stratum.headlineJa : stratum.headlineEn} — ${L ? stratum.detailJa : stratum.detailEn}`,
      );
    }
    out.push(`- ${L ? "指標" : "Indicators"}:`);
    for (const indicator of scenario.indicators) {
      out.push(
        `  - ${L ? indicator.labelJa : indicator.labelEn}: ${indicator.direction} — ${L ? indicator.noteJa : indicator.noteEn}`,
      );
    }
    const voice = result.voices.find((v) => v.scenarioId === scenario.id);
    if (voice) {
      out.push(
        `- ${L ? "2050年の証言（仮想シナリオ）" : "2050 testimony (hypothetical)"}: ${L ? voice.witness.nameJa : voice.witness.nameEn}, ${voice.witness.age} / ${L ? voice.witness.placeJa : voice.witness.placeEn}`,
      );
      out.push(`  > ${voice.body}`);
    }
    out.push("");
  }

  out.push(`## ${L ? "6. 残された疑問" : "6. Questions left open"}`);
  if (session.openQuestions.length === 0) {
    out.push(L ? "- 記録されていません。" : "- None recorded.");
  } else {
    for (const q of session.openQuestions) out.push(`- ${q}`);
  }
  out.push("");

  out.push(`## ${L ? "7. 検証記録" : "7. Verification record"}`);
  const a = result.audit;
  out.push(`- ${L ? "検証した記述" : "Statements checked"}: ${a.claimsTotal}`);
  out.push(
    `- ${L ? "内訳" : "Breakdown"}: verified ${a.byKind.verified} / inference ${a.byKind.inference} / hypothetical ${a.byKind.hypothetical} / unknown ${a.byKind.unknown}`,
  );
  out.push(`- ${L ? "照合した出典" : "Citations resolved"}: ${a.citationsChecked}`);
  out.push(
    `- ${L ? "存在せず削除した出典" : "Citations removed as non-existent"}: ${a.citationsRejected}${a.rejectedIds.length ? ` (${a.rejectedIds.join(", ")})` : ""}`,
  );
  out.push(`- ${L ? "格下げした記述" : "Downgraded statements"}: ${a.downgrades.length}`);
  for (const d of a.downgrades) {
    out.push(`  - ${d.statementId}: ${d.from} → ${d.to} — ${d.reason}`);
  }
  out.push(`- ${L ? "シナリオの分岐度" : "Scenario divergence"}: ${a.scenarioDivergence}`);
  out.push(`- ${L ? "所要時間" : "Elapsed"}: ${a.elapsedMs}ms`);
  out.push("");

  out.push(`## ${L ? "8. 参照した資料" : "8. Documents referenced"}`);
  const used = new Set<string>();
  for (const statement of result.statements) {
    for (const claim of statement.claims) {
      for (const id of claim.sourceIds) used.add(id);
    }
  }
  for (const id of [...used].sort()) {
    const hit = resolveFinding(id);
    if (!hit) continue;
    out.push(`- \`${id}\` — ${hit.source.titleJa}`);
    out.push(`  - ${L ? "発行機関" : "Publisher"}: ${hit.source.org} (${hit.source.year})`);
    out.push(`  - ${L ? "参照箇所" : "Passage"}: ${hit.source.locator}`);
    out.push(`  - ${L ? "地域" : "Region"}: ${hit.source.region}`);
    out.push(`  - ${L ? "適用範囲" : "Applicability"}: ${L ? hit.source.scopeJa : hit.source.scopeEn}`);
    out.push(`  - ${L ? "URL確認日" : "URL checked"}: ${hit.source.checkedOn}`);
    out.push(`  - URL: ${hit.source.url}`);
  }
  out.push("");

  out.push("---");
  out.push(
    L
      ? "このレポートはFUTURE WITNESSが生成した記録です。システムは結論を出していません。判断と、その責任は記録者本人にあります。2050年の証言はすべて条件付きの仮想であり、予測ではありません。"
      : "This record was produced by FUTURE WITNESS. The system reached no conclusion. The decision, and responsibility for it, belong to the person who recorded it. Every 2050 testimony is a conditional hypothetical, not a prediction.",
  );

  return out.join("\n");
}
