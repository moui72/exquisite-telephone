---
slug: host-game-moderation-controls
status: tasked
logged: 2026-07-14
plan: plan-host-game-moderation-controls-2026-07-15-9c9b.md
tasks: tasks-host-game-moderation-controls-7c9d.md
---

Host-facing moderation controls: an "end game" button (e.g. for offensive content), a "kick player" control, and a "restart game" control. Kicking a player immediately makes the current game non-continuable (but does not auto-restart), giving the host time to kick additional players before manually restarting the game from turn 0.
Why: server-side onEndGame support already exists with no UI wired to it (noted during v1 implementation); this expands that gap to also cover kicking and restarting.
