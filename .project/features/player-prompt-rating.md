---
slug: player-prompt-rating
status: tasked
logged: 2026-07-20
plan: plan-curated-phrase-bank-2026-07-20-4eeb.md
tasks: tasks-curated-phrase-bank-e335.md
---

Players can thumbs-up or thumbs-down each curated prompt they are dealt or draw from, with ratings accumulating per phrase-bank entry so weak cards can be retired and strong ones kept.
Why: grows and prunes the curated prompt pool organically from real play instead of hand-curated review sessions. Non-trivial: the app is in-memory only (rooms, sessions), so per-phrase tallies outliving a process restart require persistence infrastructure the architecture does not yet have.
