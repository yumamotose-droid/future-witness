# AGENTS.md

**Read [CLAUDE.md](CLAUDE.md) first.** It holds this project's non-negotiable
rules — never fabricate a citation, never present scripted output as live,
keep the four epistemic kinds structural, the system does not recommend — plus
the commands and the house style. The Next.js 16 notes below are framework
guidance from the scaffold and still apply.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
