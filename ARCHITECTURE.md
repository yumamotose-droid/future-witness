# ARCHITECTURE

## The one-sentence version

A user's question enters a nine-step pipeline that runs identically against a
live model or a hand-written script; every statement the pipeline produces is
verified against a curated corpus before it is streamed to the browser; the
browser renders it as a record, never as free-form prose.

## Request flow

```
browser                     server (Next.js route handler)
───────                     ──────────────────────────────
POST /api/deliberate
  { question, lang }   ──▶  requestSchema (Zod)
                             │ invalid → 400 with field-level messages
                             ▼
                           validateQuestionShape
                             │ structurally undeliberable → 400
                             ▼
                           rate limit (token bucket, per address per route)
                             │ exhausted → 429 + retry-after
                             ▼
                           runDeliberation()  ── async generator ──┐
                             │                                     │
                             ├── retrieveSources()  (lexical, bounded)
                             ├── pick engine: live | scripted
                             │                                     │
  SSE events  ◀──────────────┴─────────────────────────────────────┘
  meta → notice* → phase/framing → options → statement(evidence)
       → scenarios → voice-start/delta/end × N → statement(counter)
       → statement(uncertainty) → audit → done
```

Every `statement` event has already passed through the verifier. There is no
moment at which an unverified citation is on screen.

## The pipeline

| Step | Agent | Output | Verified how |
| --- | --- | --- | --- |
| 1 | CHRONOS | `Framing` — the decision restated, its premises, who can vote | assumptions are `Claim[]`, verified like any other |
| 2 | CHRONOS | `Option[]` — at least one must restructure the problem | schema-bounded (2–4, ids A–D) |
| 3 | EVIDENCE | `Statement` — cited findings with their limitations | every citation resolved; unsourced `verified` → `inference` |
| 4 | CHRONOS | `Scenario[]` — 2030/2040/2050 strata + shared indicator keys | indicator citations resolved; divergence measured |
| 5 | MIRAI | streamed narrative per scenario | always rendered as `hypothetical`, counted as such |
| 6 | COUNTER | `Statement` — attacks everything, including step 5 | verified like any other statement |
| 7 | EVIDENCE | `Statement` — the decisive unknowns | at least half must be `unknown` by prompt |
| 8 | — | the user's position, after | recorded in the browser |
| 9 | — | `AuditReport` + decision record | assembled from what actually happened |

## The two engines

`DeliberationEngine` (`src/lib/agents/engine.ts`) has seven methods and two
implementations:

- **`engine-live.ts`** — prompts a model through `AIProvider`. Each structured
  step parses, validates against a Zod schema, and on failure retries once with
  the validation error appended, then once more without the JSON schema in case
  the endpoint rejected the schema itself. After that it throws.
- **`engine-scripted.ts`** — deterministic. `curated` is a hand-written
  deliberation for the demo topic; `derived` assembles real corpus findings
  with templated framing and narration for any other question, and says so.

The orchestrator is written against the interface, so verification, budgeting,
streaming and error handling are identical in both modes. That is what makes
the scripted demo an honest preview rather than a separate fake.

**Degradation.** If a live step throws a `ProviderError`, the orchestrator
emits a notice naming the cause, switches to the scripted engine for that step
and all later ones, and reports `mode: "scripted"` in the audit. A partial
failure never silently becomes a shorter deliberation.

## The verifier

`src/lib/evidence/verify.ts` is deliberately mechanical:

1. Resolve every citation against `FINDING_INDEX`. Unresolvable ids are
   **removed**, not greyed out — a plausible dead reference is worse than none.
2. A `verified` claim with no surviving citation is **downgraded** to
   `inference`, and the downgrade is recorded with its reason.
3. An `unknown` claim is stripped of citations, so "we don't know" cannot be
   dressed up with a reference.
4. Scenario indicators go through the same rule; an unsourced direction is
   annotated in place.
5. Scenario divergence is the share of indicator keys on which the scenarios
   disagree. A low number is reported, not hidden.

The result is that the 証 stamp means exactly one thing: at least one id on
this sentence resolves to a finding a human put in the corpus.

## The two languages

A `Claim` carries `text` (Japanese, primary) and an optional `textEn`. Both are
produced in the same call, validated by the same schema, and verified together,
so switching language cannot change which citations resolved or which claim was
downgraded — only the words.

Narration is different. A run streams in the language it was started in, and
`voice-end` carries `bodyAlt` when the engine already has the other language
written. The scripted engine does; a live model writes one language only. The
client remembers the run's language as `runLang`, and when the reader switches
to a language with no alternate the panel shows the testimony as generated and
says which language it is in. **Nothing is machine-translated at render time** —
a translated testimony would be a different testimony, and the epistemic label
on it would no longer mean what it says.

## Provider abstraction

```ts
interface AIProvider {
  generateJson(req): Promise<{ raw: string; usage: { outputTokens: number } }>;
  streamText(req): AsyncIterable<string>;
}
```

Two methods, because that is all the orchestrator needs. A Claude or OpenAI
adapter is one file; nothing above this interface knows which model answered.
`ProviderError` carries a `code` and a `retryable` flag that the orchestrator
uses to decide between retrying, degrading and stopping.

## Budget and limits

- Per run: 9,000 output tokens, 110s wall clock, checked between steps.
- Per call: 2,200 output tokens, further capped by what the run has left.
- Per process: a 2,000,000-token circuit breaker for a runaway public demo.
- Per address: 10 deliberations per burst, refilling one every 30s; the
  single-chat comparison has its own bucket.

A run that hits a ceiling emits a notice, returns what it has, and still writes
an audit. It never truncates silently.

## State and storage

There is no database in the default deployment. Deliberation history lives in
`localStorage` and is exposed to React through `useSyncExternalStore`, so there
is no mount-time effect writing state. `src/lib/store/supabase.ts` exists for a
deployment that wants durable history; `supabase/schema.sql` enables RLS and
intentionally creates no policy.

## Rendering

`src/components` is presentation only. The one structural rule: agent text
reaches the DOM exclusively through `ClaimList` / `StatementBlock` /
`VoicePanel`, each of which renders a React text node inside an element that
carries the epistemic kind. `sanitizeModelText` strips markup before that
anyway — defence in depth for a rendering path somebody adds later.
