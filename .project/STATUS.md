# Exquisite Telephone — Project Status

_Updated: 2026-07-14 (night). Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

## Open Questions

_(none)_

## Diagrams

- datamodel.md — unrendered ⚠️ (never generated — run `/ardd-diagram datamodel`)
- infrastructure.md — unrendered ⚠️ (never generated — run `/ardd-diagram infrastructure`)
- ui.md — unrendered ⚠️ (never generated — run `/ardd-diagram ui`)

## Code-vs-Artifact Defects

0 defects — see `.project/DEFECTS.md`, last checked 2026-07-14. The dead
`'drawing'` value in `RoomStatus` (`shared/src/types.ts`) and the
corresponding dead branch in `client/src/App.svelte` found by this run's
fresh survey are now fixed and re-verified; all 4 defects from yesterday's
pass remain fixed too.

## Feedback

0 open feedback files. Both prior items are now `planned`:
`feedback-main-296e.md` (mouse-drawing cursor bug) into
`plan-drawing-color-and-line-width-t-2026-07-14-6006.md`;
`feedback-main-4af4.md` (round-gated turns) into
`plan-turn-room-engine-2026-07-14-9249.md`.

## Feature Backlog

3 backlogged · 0 planned · 0 tasked · 3 implemented — see
`.project/features/`. Target a backlogged slug with `/ardd-plan
<slug>`.

- `fly-io-deployment` (implemented) — deployed at
  https://exquisite-telephone.fly.dev/. Plan:
  `plan-fly-io-deployment-2026-07-13-20ad.md`. Tasks:
  `tasks-fly-io-deployment-e2db.md` (completed, 7/7).
- `drawing-color-and-line-width-t` (**implemented**) — color
  selection, adjustable line width, a fill tool, and a host-configurable
  pre-game monochrome toggle for the drawing interface; also folded in
  the mouse-cursor-accuracy bug fix (feedback F001,
  `feedback-main-296e.md`, `planned`). Plan:
  `plan-drawing-color-and-line-width-t-2026-07-14-6006.md`. Tasks:
  `tasks-drawing-color-and-line-width-t-c7de.md` (**completed**,
  10/10) — delegated to a worktree subagent, merged to `main` clean
  (fast-forward, no conflicts), worktree reaped.
- `minimum-player-count-enforceme` + `asynchronous-play-turn-timer`
  (**implemented**) — planned together as Phase 1 (turn/room engine),
  since the timer feature depends on round-gating. Also folded in the
  round-gated-turns bug fix (feedback F001, `feedback-main-4af4.md`,
  `planned`). Plan: `plan-turn-room-engine-2026-07-14-9249.md`. Tasks:
  `tasks-turn-room-engine-1d61.md` (**completed**, 15/15) — delegated
  to a worktree subagent. 4 phases: round-gating (T001–T004), minimum
  player count (T005–T006), turn timer control/countdown (T007–T009),
  timeout vote + background sweep (T010–T015). **Merge required manual
  conflict resolution** (not a clean apply, as flagged during
  planning): both this branch and `drawing-color-and-line-width-t`
  independently extended `Room` (`shared/src/types.ts`), `Lobby.svelte`,
  `session.ts`, and the socket handler/dispatch surface
  (`handlers.ts`/`server.ts`) — 14 files conflicted. Resolved by
  combining both features' additions (never favoring one side), plus
  fixing a handful of `Room` test fixtures in each branch that
  predated the other branch's new fields. Verified post-merge:
  typecheck 0 errors, full suite passing (shared 18 + server 75 +
  client 55 = 148 tests), lint clean.
- `play-again-control-on-reveal-p` (backlogged) — on the Reveal page,
  non-host players see "Leave game" (back to host/join page) and "Vote
  to play again" (waits for the host); the host sees "End game" (back
  to host/join page) and "Play again" (hosts a new game, auto-joining
  all current players).
- `animated-interactive-reveal-bo` (backlogged) — redesign the Reveal
  page's book viewer into a fun, animated, interactive experience: one
  book at a time, opening on a "cover" (player name + randomly
  generated colorful abstract design), timed auto-advance revealing up
  to 2 pages at a time, then showing everything at the end.
- `host-game-moderation-controls` (backlogged) — host-facing "end
  game", "kick player", and "restart game" controls. Kicking a player
  immediately makes the current game non-continuable (without
  auto-restarting), so the host has time to kick more players before
  manually restarting from turn 0. Not yet assigned to a phase (logged
  after the phase grouping below was agreed; closest in spirit to
  Phase 1's turn/room engine but not discussed at grouping time).

One gap surfaced during v1 implementation is still a candidate for
`/ardd-backlog`: observability logging for the start-game/end-game
transitions (currently unlogged; Principle IX covers room
creation/join/leave/reconnect/turn-advance/completion only). Note the
turn-room-engine plan above does add timeout-vote-specific logging
(T015), but that doesn't cover plain start-game/end-game.

## Phase Plan

Backlog/feedback items grouped into 3 phases (agreed 2026-07-14):

1. **Turn/room engine** — **implemented and merged to `main`** (with
   manual conflict resolution against Phase 2 — see Feature Backlog
   above). Done.
2. **Drawing tools** — **implemented and merged to `main`**. Done.
3. **Reveal page** — `play-again-control-on-reveal-p` +
   `animated-interactive-reveal-bo`. Not yet planned.

`host-game-moderation-controls` still isn't assigned to a phase (see
Feature Backlog above).

## In Flight

_(none)_

## fly-io-deployment: shipped

Deployed and live at **https://exquisite-telephone.fly.dev/**
(Fly org `personal`, app `exquisite-telephone`). `tasks-fly-io-deployment-e2db.md`
completed 7/7; feature flipped to `implemented`.

Verified end-to-end against the real deployment (not just locally):
`GET /` serves the client (200), `GET /healthz` returns `ok`, and real
`socket.io-client` connections confirmed room create + join +
`roomUpdated` broadcast across two clients, plus rejoin-after-disconnect
via session token.

**Bug found and fixed during verification**: a fresh Fly app's first
deploy provisions 2 machines by default (for HA), but this app's
in-memory room state has no cross-process adapter (Principle VI) — a
room created on one machine 404'd when a join landed on the other.
Fixed with `fly scale count 1`; `fly.toml` now documents this so a
future fresh-app deploy doesn't silently reintroduce it.

Design note worth a glance: `fly.toml` sets `auto_stop_machines = "off"`
/ `min_machines_running = 1` (always-on) rather than scale-to-zero,
since in-memory room state would be lost if the machine suspended
mid-game — reasonable given [[infrastructure]], but a cost/tradeoff
decision not explicitly specified in the artifact.

## v1 Implementation Status

`tasks-main-a0d8.md` — **completed**, 19/19 tasks, merged to `main`
(commit range `f24f557..ff86fbe`, fast-forwarded). Verified on `main`:
76/76 tests passing (12 shared + 29 server + 35 client), lint clean,
typecheck clean (0 errors across 205 files), production build succeeds.
A full Node/TypeScript + Socket.IO server and Svelte + Tailwind client
now implement the complete v1 game loop: room create/join, lobby,
round-robin write/draw turn loop, reconnect-tolerant sessions, reveal
view, and client-side PNG export.

Package manager converted from npm to pnpm (`pnpm-workspace.yaml`,
`workspace:*` internal deps, CI and pre-commit hook updated) — verified
lint/typecheck/76 tests/build all pass under pnpm.

Repo is public on GitHub: https://github.com/moui72/exquisite-telephone
(`origin`, `main` tracked). CI runs on push/PR there.

## Summary

0 defects open (not re-verified against this session's two feature
merges yet — see Recommended Next Step). 0 open feedback files. No
cross-artifact conflicts or constitution violations. Phases 1 and 2 of
the phase plan (turn/room engine, drawing tools) are both implemented
and merged to `main` — working tree clean, no worktrees in flight.
Safe to /plan: yes.

## Recommended Next Step

A fresh `/ardd-defects` pass is worth running now — last verified
2026-07-14, before this session's two substantial feature merges
(round-gated turns, min player count, turn timer, drawing color/width/
fill/monochrome). Phase 3 (Reveal page — `/ardd-plan
play-again-control-on-reveal-p animated-interactive-reveal-bo`) is
ready to plan whenever. `host-game-moderation-controls` still needs a
phase assignment before or when it's planned. `/ardd-backlog` for the
one remaining gap noted during v1 implementation (start/end-game
observability logging) is still outstanding. `/ardd-diagram` on
datamodel, infrastructure, and ui would also give this stable design a
visual reference. Also worth a manual smoke test of the merged app
(`/run`) given how much surface area landed in one session.
