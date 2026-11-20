/**
 * The descending hairline — the page's signature.
 *
 * It is the span of time one decision covers. The near tick is labelled and
 * marked in gold because that year can act; the far tick is faint and
 * unlabelled on the control side because 2050 has no way to answer. The whole
 * argument of the project is in the asymmetry of two tick marks, so nothing
 * else on the page competes with it.
 */
export function Timeline({
  from = "2026",
  to = "2050",
  className = "",
}: {
  from?: string;
  to?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 left-6 w-px sm:left-10 ${className}`}
    >
      <div
        className="anim-draw h-full w-px"
        style={{
          background:
            "linear-gradient(180deg, var(--gold) 0%, var(--rule-strong) 22%, var(--rule) 70%, transparent 100%)",
        }}
      />
      <div className="absolute top-[14%] left-0 flex items-center gap-2">
        <span className="h-px w-3 bg-[var(--gold)]" />
        <span
          className="t-mono anim-settle text-[var(--gold)]"
          style={{ animationDelay: "900ms" }}
        >
          {from}
        </span>
      </div>
      <div className="absolute top-[72%] left-0 flex items-center gap-2">
        <span className="h-px w-3 bg-rule-strong" />
        <span
          className="t-mono anim-settle text-ink-faint"
          style={{ animationDelay: "1300ms" }}
        >
          {to}
        </span>
      </div>
    </div>
  );
}
