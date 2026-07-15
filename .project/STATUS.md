# Exquisite Telephone — Project Status

_Updated: 2026-07-15 (evening). Keep this current as artifacts are refined and open questions are resolved._

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

3 defects on file — see `.project/DEFECTS.md`, last checked 2026-07-14
(read-only summary below; stale w.r.t. the two fixes landed since —
next `/ardd-defects` pass will confirm both clean).
- **drift** (`datamodel.md`, `f333f65c`): the End-of-game-controls
  Normalization Rule claims all three actions (Leave/End/Play again)
  are "only meaningful while `Room.status === 'reveal'`", but only
  `onPlayAgain` actually enforced this server-side. **Fixed and
  merged** — `tasks-reveal-defects-c65e.md` completed (3/3);
  `onEndGame` and `onVoteToPlayAgain` now both reject with
  `room-not-in-reveal` outside `status === 'reveal'`.
- **drift** (`ui.md`, `aff300d1`): the Reveal View claims the PNG save
  control is "available in both modes," but it was only rendered in
  the static show-everything grid. **Fixed and merged** — the animated
  mode now has the same "Save as PNG" button.
- **drift** (`constitution.md`, Quality Standards, `17a7ea0a`): no
  artifact states a performance budget for any real-time operation.
  Still deliberately declined (`plan-4401-2026-07-14-7cf3.md`) —
  carried forward each pass since declining the fix doesn't make the
  underlying claim true.

## Feedback

0 open feedback files. Both prior items are now `planned`:
`feedback-main-296e.md` (mouse-drawing cursor bug) into
`plan-drawing-color-and-line-width-t-2026-07-14-6006.md`;
`feedback-main-4af4.md` (round-gated turns) into
`plan-turn-room-engine-2026-07-14-9249.md`.

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 5 implemented — see
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
- `play-again-control-on-reveal-p` + `animated-interactive-reveal-bo`
  (**both implemented**) — planned together as Phase 3 (Reveal page):
  host vs. non-host end-of-game controls (leave, end game, vote to
  play again, play again with per-socket auto-rejoin into a fresh
  room) plus a paced, animated one-book-at-a-time viewer (deterministic
  cover art, timed 2-entry reveal steps, manual prev/next/skip
  controls). Also closed a previously-unnoticed gap: `App.svelte` had
  no rendering branch for `Room.status === 'ended'` at all. Plan:
  `plan-reveal-page-2026-07-14-b586.md`. Tasks:
  `tasks-reveal-page-036a.md` (**completed**, 11/11) — delegated to a
  worktree subagent, merged to `main` clean (fast-forward, no
  conflicts), worktree reaped. Verified post-merge: typecheck 0
  errors, full suite passing (shared 18 + server 86 + client 72 = 176
  tests), lint clean.
- `host-game-moderation-controls` (backlogged) — host-facing "end
  game", "kick player", and "restart game" controls. Kicking a player
  immediately makes the current game non-continuable (without
  auto-restarting), so the host has time to kick more players before
  manually restarting from turn 0. Distinct from Phase 3's "play
  again" (a fresh room after a game naturally ends) despite surface
  similarity to "restart". Still not assigned to a phase.

The `onEndGame`-not-logged gap noted during v1 implementation is now
fixed and merged — see `plan-4401-2026-07-14-7cf3.md` /
`tasks-4401-7214.md` in Code-vs-Artifact Defects above.

## Phase Plan

Backlog/feedback items grouped into 3 phases (agreed 2026-07-14). **All
three are now implemented and merged to `main`.**

1. **Turn/room engine** — implemented (manual conflict resolution
   against Phase 2 — see Feature Backlog above).
2. **Drawing tools** — implemented.
3. **Reveal page** — implemented.

`host-game-moderation-controls` is the only remaining backlog item,
not yet assigned to a phase (there's no phase left to assign it to —
it can just be planned on its own whenever).

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

**All three phases of the agreed Phase Plan, plus both defect fix-up
plans, are implemented and merged to `main`.** Of the 3 defects on
file: 2 fixed and merged, 1 deliberately declined. 0 open feedback
files. No cross-artifact conflicts or constitution violations. Working
tree clean, no worktrees in flight, all 7 tasks files `completed`.
Safe to /plan: yes. (One test flaked on a single full-suite run during
verification — passed clean on two immediate re-runs; not treated as
a regression, but worth a glance if it recurs — likely timing
sensitivity in one of the real-Socket.IO integration tests.)

## Recommended Next Step

A fresh `/ardd-defects` pass would confirm the two just-fixed items
clean (last verified 2026-07-14, before this fix landed).
`host-game-moderation-controls` is the only remaining backlogged item,
ready to plan whenever (`/ardd-plan host-game-moderation-controls`).
`/ardd-diagram` on datamodel, infrastructure, and ui would also give
this stable design a visual reference. A manual smoke test of the
merged app (`/run`) is still worth doing at some point, given how much
surface area has landed across this session.
