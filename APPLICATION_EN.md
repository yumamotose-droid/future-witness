# APPLICATION_EN — submission copy (English)

Intended for: Google AI Challenge (category: Society & Planet)
Deadline: 30 November 2026, 23:59 JST

---

## Title

**FUTURE WITNESS — The future has no vote yet.**

## Summary

Decisions about land, energy and cities are made by people who will not live
with most of their consequences. FUTURE WITNESS takes one contested decision and
sets out, side by side, the evidence that can be checked, several futures the
choice would open, a person in 2050 describing life inside each one, and a
sustained objection to all of it. Then it hands the decision back. Every
citation the model produces is resolved against a curated corpus before it
reaches the screen; ones that do not exist are removed, the statement is demoted
from evidence to inference, and the count of removals is displayed.

## The problem

Future generations cannot express preferences through prices in markets and
cannot vote in democracies, so their interests are structurally excluded from
decisions. This is a studied institutional failure, and one answer —
"Future Design" — has people play the role of an imaginary future generation in
planning workshops. But that requires assembling people for hours or days.
**There is no way for one person, at a desk, now, to run one decision through
the same structure.**

Institutional demand exists: the European Citizens' Panel on Intergenerational
Fairness met from September to November 2025. What is missing is the tool that
comes before it.

## The system

Four roles produce one record.

| Role | What it does |
| --- | --- |
| CHRONOS | Restates the question, surfaces its hidden premises and names who cannot vote. Branches the future into 2030 / 2040 / 2050 strata |
| EVIDENCE | Quotes only from the documents it was handed, and attaches each figure's limitation to the figure |
| MIRAI | One person living in that future describes an ordinary day — conditional, never predictive |
| COUNTER | Objects to all of it, **including this system's own staging** |

The user decides. The system never concludes.

## Where AI is necessary — and where it is not

**Necessary:** constructing several defensible options from an arbitrary
question, building a timeline of consequences for each, and writing one life
inside them. None of that is template work.

**Not necessary:** citation checking, enforcing epistemic typing, recording
positions before and after. Those are deterministic code. **Stating that split
ourselves** is part of the design.

## What is actually original

Dialogue with future generations is not new — MIT Media Lab's Future You is
close prior work. What is new here is mechanism, not concept:

1. **Citation existence checking, surfaced in the product.** Ids that do not
   resolve are removed before render, the statement is downgraded, and the
   removal count is reported every run.
2. **Per-sentence epistemic typing.** Every sentence carries
   `verified | inference | hypothetical | unknown`, validated by schema. The
   separation of fact from scenario is a property of the data model, not a hope
   about the prompt.
3. **The adversary attacks our own narration.** COUNTER is required to argue
   that the 2050 testimony may be doing emotional work the evidence does not
   support.
4. **Before-and-after measurement.** A single conversation cannot produce this;
   it spans the deliberation.
5. **A single-chat baseline ships with the product**, so the claim can be
   checked rather than believed.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, Zod 4,
**Google Gemini API (`@google/genai`)**, Server-Sent Events, Web Speech API,
Vitest, Playwright.

The API key is server-side only; this repository contains no `NEXT_PUBLIC_`
variable. The provider sits behind a two-method interface, so another model is
one adapter file.

## Deployability, and its honest limit

**Where it fits:** the hour before a planning meeting, when one person needs the
argument structured. Teaching intergenerational ethics through a concrete
decision.

**Why it is not drop-in:** the corpus holds national and global statistics, not
the local data a specific case needs. The system says so on every run, names
what would resolve each unknown, and says who could collect it.

## Verified results

- 0 type errors, 0 lint warnings, production build passes, 0 dependency vulnerabilities
- 54 unit tests and 18 end-to-end tests pass (Chromium and WebKit / iPhone 13)
- Demo run: 36 statements (8 verified / 10 inference / 12 hypothetical / 6 unknown),
  **28 citations all resolved, 0 removed**, scenario divergence 100%, ~2.0s
- No horizontal scroll at 390px; no console errors
- 19 evidence screenshots

## Stated honestly as unverified

- **No live Gemini call has ever been made** (no API key held). The verification
  layer, budget, streaming and UI are shared with the scripted engine and are
  fully tested; live latency and the real rate of fabricated citations are not.
- There is no evidence that decision quality improves. The product says so.
- Whether AI may speak for future generations is unresolved; the objection is
  built into the system rather than answered.
- Screen-reader testing and contrast measurement have not been performed.

## In one line

**In a period where the argument is whether to trust AI output, this is a piece
of work that can say: you don't have to — it has been counted.**
