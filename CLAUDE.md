# CLAUDE.md — working rules for this repository

## What this project is

FUTURE WITNESS (未来の証人) is a deliberation interface. A person brings one
contested decision; the system restates it, lays out options, assembles cited
evidence, branches the future into scenarios, lets a fictional person in 2050
describe living inside each one, attacks all of it, and records what the person
decided — before and after. It never reaches a conclusion itself.

The whole project rests on one promise: **a reader can check everything the
screen asserts.** Every change must leave that promise intact.

## Non-negotiable rules

1. **Never fabricate a citation, a statistic, a URL or a study.** Every citable
   claim resolves to a finding in `src/lib/evidence/corpus.ts`, and the
   verifier removes any id that does not. If you add a source, you must have
   actually opened it, and you must record `checkedOn`.
2. **Never present scripted output as live.** `RunMode` is `"scripted"` unless
   a real model call produced the content. A run that falls back mid-way says
   so and is reported as scripted.
3. **Keep the four epistemic kinds structural.** Agent prose reaches the screen
   only inside a `Claim` carrying `verified | inference | hypothetical |
   unknown`. Do not add a rendering path that prints raw model text.
4. **The system does not recommend.** No component, prompt or document may tell
   the user which option to pick. COUNTER argues; it does not conclude.
5. **No secret reaches the browser.** There is no `NEXT_PUBLIC_` variable in
   this repository and there must not be one. All model calls happen in route
   handlers.
6. **State limitations in the product, not only in the docs.** If a number has
   a caveat, the caveat ships next to the number.

## Commands

```bash
npm run dev          # development server on :3000
npm run build        # production build (must pass before any claim of done)
npm run start        # serve the production build
npm run lint         # eslint, zero warnings allowed
npm run typecheck    # tsc --noEmit
npm run test         # vitest unit suite
npm run test:e2e     # playwright, builds and serves production
npm run verify       # typecheck + lint + test + build
```

## Layout

```
src/lib/types.ts            domain model; the Claim type is the centre of it
src/lib/evidence/           corpus, retrieval, verification
src/lib/agents/             prompts, schemas, the two engines, orchestrator
src/lib/ai/                 provider abstraction + Gemini adapter
src/lib/security/           input hardening, rate limiting, budget
src/lib/report/             the decision record
src/app/api/deliberate/     the SSE pipeline endpoint
src/components/             presentation; no business logic
tests/unit/                 vitest
tests/e2e/                  playwright, run against a production build
```

## House style

- Comments explain **why**, never what. If a comment restates the code, delete it.
- Japanese is the primary language of the product. Every user-visible string
  exists in both `ja` and `en`; the English says the same thing, not more.
- No `any`. No `@ts-expect-error` without a one-line reason.
- Components take data and render it. Fetching, parsing and verification happen
  in `src/lib`.
- Tailwind v4 with the tokens in `globals.css`. Do not introduce a colour that
  is not in the palette; the epistemic stamps are the only tinted elements.

## Before saying something works

Run `npm run verify`, and for anything touching the UI, look at it in a browser
at 390px and at desktop width, in both appearances. `TEST_REPORT.md` records
what was actually executed; do not add a claim to it that you did not run.
