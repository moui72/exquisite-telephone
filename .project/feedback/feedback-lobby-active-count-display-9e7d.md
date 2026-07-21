---
status: planned
created: 2026-07-21
plan: plan-aed6-2026-07-21-2a6e.md
---

# Feedback

## Bugs

- [x] F001 The Lobby's two live displays — the below-minimum-players
  warning and the live laps-per-book default — compute over the raw
  roster, not the active (non-kicked) count, so they disagree with both
  the server and `datamodel.md`. `Lobby.svelte:40`
  `belowMinimumPlayers = (state.room?.players.length ?? 0) < MINIMUM_RECOMMENDED_PLAYERS`
  and `Lobby.svelte:84`
  `state.room?.lapsPerBook ?? defaultLapsPerBook(state.room?.players.length ?? 0)`
  both use `players.length`. After `plan-4663`, `onStartGame` enforces
  both against `activePlayers(room).length` and `datamodel.md`'s
  Minimum-player and Laps-per-book rules now state the count is of active
  players — but the Lobby *display* a host reads before starting still
  counts kicked players. Concretely: kick a lobby to 2 real players and
  the Lobby can still show "enough to start" and a 1-lap default, then the
  server rejects the start (or resolves 2 laps) — the display contradicts
  what happens. The same file already imports `activePlayers` and uses it
  for the roster render (`Lobby.svelte:210`) and `WritingDrawing.svelte:54`
  already computes over it, so the fix is to route these two computations
  through `activePlayers(state.room).length` too — an internally
  consistent client, not a new dependency. Surfaced by the `plan-4663`
  T002 implementer as datamodel↔client drift the artifact edit exposed.
  [artifacts: ui]
