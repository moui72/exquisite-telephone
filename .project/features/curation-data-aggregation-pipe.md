---
slug: curation-data-aggregation-pipe
status: tasked
logged: 2026-07-20
plan: plan-curation-data-aggregation-pipe-2026-07-22-4c9b.md
tasks: tasks-curation-data-aggregation-pipe-d7bf.md
---

A deterministic (non-agent) aggregation step reads the append-only curation event files and produces a consolidated view of prompt ratings and candidate phrases for the curator.
Why: it is the layer where untrusted player-written text is bounded and sanitized before any agent context ever sees it, so prompt-injection defense lives here rather than being scattered into the write path (see [[player-prompt-rating]]). Deliberately deterministic and agent-free for that reason. Shape is undecided; the write path was designed to not presuppose it.
