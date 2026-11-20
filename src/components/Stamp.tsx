import type { EpistemicKind, Lang } from "@/lib/types";
import { KIND_META } from "@/lib/i18n/dictionary";

/**
 * The epistemic stamp.
 *
 * One pressed character in the margin, the way an archive marks a document's
 * status. A single kanji reads faster than a coloured pill and does not compete
 * with the text it qualifies — and because the whole interface is otherwise
 * untinted, this is the only mark on the page carrying colour, which is exactly
 * the thing a reader must not miss.
 */
const DIE: Record<EpistemicKind, string> = {
  verified: "証",
  inference: "推",
  hypothetical: "仮",
  unknown: "？",
};

export function Stamp({
  kind,
  lang,
  pressed = false,
}: {
  kind: EpistemicKind;
  lang: Lang;
  pressed?: boolean;
}) {
  const meta = KIND_META[kind];
  const label = lang === "ja" ? meta.ja : meta.en;
  const desc = lang === "ja" ? meta.descJa : meta.descEn;
  return (
    <span
      className={`stamp${pressed ? " anim-press" : ""}`}
      data-kind={kind}
      role="img"
      aria-label={`${label}: ${desc}`}
      title={`${label} — ${desc}`}
    >
      {DIE[kind]}
    </span>
  );
}

export function StampLegend({ lang }: { lang: Lang }) {
  const kinds: EpistemicKind[] = [
    "verified",
    "inference",
    "hypothetical",
    "unknown",
  ];
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3">
      {kinds.map((kind) => (
        <div key={kind} className="flex items-center gap-2">
          <Stamp kind={kind} lang={lang} />
          <dt className="t-mono-plain text-ink-soft">
            {lang === "ja" ? KIND_META[kind].ja : KIND_META[kind].en}
          </dt>
        </div>
      ))}
    </dl>
  );
}
