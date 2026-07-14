---
slug: asynchronous-play-turn-timer
status: tasked
logged: 2026-07-13
plan: plan-turn-room-engine-2026-07-14-9249.md
tasks: tasks-turn-room-engine-1d61.md
---

Host can enable asynchronous play by setting a per-turn timer (15m/30m/1hr/4hr/12hr); each player gets that much time to submit their turn, and the round advances once everyone has submitted or every remaining player's timer has expired.
Why: lets groups play across time zones or busy schedules instead of requiring everyone online simultaneously, unlike the current synchronous-only session shape.

Depends on: round-gated turn progression (feedback F001,
`.project/feedback/feedback-main-4af4.md`) — this feature's "round
advances once everyone has submitted or timer expires" presupposes a
global round concept that doesn't exist yet (today each book advances
independently, with no room-wide barrier). Plan F001 first, or as this
feature's first phase.
