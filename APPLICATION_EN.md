# APPLICATION_EN — submission copy in English

For: **Google AI Challenge** <https://googlejp25.withgoogle.com/awards>
Deadline: **30 November 2026, 23:59 JST**
Category: **Society & Planet**

> **Which version to use.** The contest is run in Japanese and
> `APPLICATION_JP.md` is the copy to paste into the form. This file exists for
> the English-language audience — an international reader of the repository, an
> English PR blurb if one is wanted, and the English captions in the demo video.
>
> The official page says judging is of **the idea**, not the polish of the
> finished product. So the idea leads here and the verification results sit at
> the back as evidence that it is not just talk. That order is deliberate.

---

# Part 1 — Copy blocks

## Title

**Short (22 characters)**

```
FUTURE WITNESS (未来の証人)
```

**Full (44 characters)**

```
FUTURE WITNESS — The future has no vote yet.
```

## Summary

**One line (110 characters)**

```
Future generations cannot vote today. This brings their view into the room, with checkable evidence beside it.
```

**Short (393 characters)**

```
Decisions about land, energy and cities are made by people who will not live with most of their consequences. FUTURE WITNESS takes one contested decision and sets out, side by side, evidence that can be checked, several futures the choice would open, a person in 2050 describing life inside each one, and a sustained objection to all of it. Then it hands the decision back. It never concludes.
```

**Full (914 characters)**

```
Decisions about land, energy and cities are made by people who will not live with most of their consequences: future generations cannot express preferences through prices in markets, and cannot vote. FUTURE WITNESS runs one decision through four roles. It restates the question and names who has no vote, branches the future into 2030, 2040 and 2050, lets one person living there describe an ordinary day, and then objects to all of it. The load-bearing part is verification: every citation Gemini produces is resolved against a hand-curated corpus, ids that do not exist are removed before the screen, the statement is demoted from verified evidence to inference, and the number removed is shown every run. Every sentence carries one of four epistemic kinds, so the boundary between fact and story is a property of the data model. The system reaches no conclusion; it records the user's decision and how it moved.
```

## PR blurb (254 characters)

```
In a period where the argument is whether to trust AI output, this is a piece of work that can say: you don't have to — it has been counted. Citations are checked against a real corpus, non-existent ones are removed before render, and the count is shown.
```

---

# Part 2 — Against the four judging criteria

## Originality

Dialogue with future generations is not new — MIT Media Lab's Future You and
Japan's Future Design practice are close prior work, and this submission says
so. Typed arguments, multi-persona debate and a standing adversary all have
prior art too (OmouAI, KITA AI and others). The research for this submission
**retired one of the originality claims it started with**
(see `COMPETITOR_ANALYSIS.md` §4). **What remains is mechanism.**

Citation existence checking is surfaced *in the product*: ids that do not
resolve are removed, the statement is demoted, and **the removal count is shown
to the reader**. Putting the unflattering number on screen is the part I could
not find elsewhere. The adversarial role is also required to **attack our own
staging** — to argue that the 2050 testimony may be doing emotional work the
evidence does not support.

## Impact

The target is decisions about environment, planning, energy and education.
Institutional demand exists — the European Citizens' Panel on Intergenerational
Fairness met from September to November 2025 — and what is missing is the tool
that comes *before* it: something one person can run at a desk.

## AI Utility

Gemini is used not as a machine that asserts, but as one that **constructs
several futures and then argues against itself**. Building defensible options
from an arbitrary question, laying out consequences over decades, and writing
one life inside them is not template work.

Equally, **the parts that do not need AI are named as such**: citation
checking, enforcing epistemic types, and recording positions before and after
are deterministic code. "Checking an LLM's output with an LLM proves nothing" is
answered in the design rather than in the pitch.

## Scalability

The question is free text. The corpus is swappable. Japanese and English are
both supported. It runs in a browser with no account. The model provider sits
behind a two-method interface, so another model is one adapter file.

Honestly: **each domain and region needs its corpus curated by hand.** That
constraint is published along with the design.

---

# Part 3 — Supporting material

## The problem

Future generations cannot express preferences through prices in markets and
cannot vote in democracies, so their interests are structurally excluded. One
answer — Future Design — has people play the role of an imaginary future
generation in planning workshops. That requires assembling people for hours or
days. **There is no way for one person, now, to run one decision through the
same structure.**

## The system

| Role | What it does |
| --- | --- |
| CHRONOS | Restates the question, surfaces its premises, names who cannot vote, and branches the future into 2030 / 2040 / 2050 |
| EVIDENCE | Quotes only the documents it was handed, and attaches each figure's limitation to the figure |
| MIRAI | One person living in that future describes an ordinary day — conditional, never predictive |
| COUNTER | Objects to all of it, **including this system's own staging** |

## What is actually original

1. **Citation existence checking, surfaced.** Removal and demotion counts are
   reported every run.
2. **Per-sentence epistemic typing**, validated by schema. Output that fails
   validation never renders. **This one is not original**: OmouAI
   (arXiv 2609.31078) types arguments as empirical / predictive / normative.
   The axis differs — ours turns on whether a citation resolves — but typing
   arguments is prior art and is not claimed as new.
3. **The adversary attacks our own narration.**
4. **Before-and-after measurement**, gated so the position is recorded before
   any AI output is seen.
5. **A single-chat baseline ships with the product**, so the claim can be
   checked rather than believed.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, Zod 4,
**Google Gemini API (`@google/genai`)**, Server-Sent Events, Web Speech API,
Vitest, Playwright. The API key is server-side only; this repository contains no
`NEXT_PUBLIC_` variable.

## Deployability, and its honest limit

**Where it fits:** the hour before a planning meeting, when one person needs the
argument structured. Teaching intergenerational ethics through a concrete case.

**Why it is not drop-in:** the corpus holds national and global statistics, not
the local data a specific case needs. The system says so on every run, names
what would resolve each unknown, and says who could collect it.

## Verified results

- 0 type errors, 0 lint warnings, production build passes, 0 dependency vulnerabilities
- 60 unit tests and 20 end-to-end tests pass (Chromium and WebKit / iPhone 13)
- Demo run: 36 statements (8 verified / 10 inference / 12 hypothetical / 6 unknown),
  **28 citations all resolved, 0 removed**, scenario divergence 100%, about 11 seconds
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
