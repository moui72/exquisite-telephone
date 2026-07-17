# Exquisite Telephone — Project Status

_Updated: 2026-07-17 (a fifth bug found this session: an unbounded
background flood-fill on a drawing turn leaks into the exported PNG's
entire background instead of staying bounded to that turn's entry —
`feedback-main-8a99.md`, open, not yet planned. The prior four bugs from
this session's smoke-testing are already planned/tasked as
`tasks-5ef1-9eea.md` (0/7, `ready`). A fresh `/ardd-audit` full pass also
ran this session — 8 findings (0 suggestions, 5 questions, 3 risks)
written to `.project/audit.md`, not tracked here since it isn't part of
this report's schema; see that file directly.). Keep this current as
artifacts are refined and open questions are resolved._

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

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel` — `kicked`/`nonContinuable` fields added by this plan's artifact changes aren't reflected yet)
- infrastructure.md — stale ⚠️ (run `/ardd-diagram infrastructure` — `onKickPlayer`/`onRestartGame` handlers added)
- ui.md — stale ⚠️ (run `/ardd-diagram ui` — Moderation Panel added)

## Code-vs-Artifact Defects

1 defect on file — see `.project/DEFECTS.md`, last checked 2026-07-15
(fresh full pass; the two previously-recorded fixes reconfirmed clean
in code and dropped from the file).
- **drift** (`constitution.md`, Quality Standards): no artifact states
  a performance budget for any real-time operation. Still deliberately
  declined (`plan-4401-2026-07-14-7cf3.md`) — carried forward each
  pass since declining the fix doesn't make the underlying claim true.

## Feedback

1 open feedback file — see `.project/feedback/`, will be picked up by the
next `/ardd-plan`:
- `feedback-main-8a99.md` (F001, bug, `[artifacts: infrastructure, ui]`):
  an unbounded background flood-fill on a drawing turn leaks into the
  exported PNG's entire background instead of staying bounded to that
  turn's entry.

The other six items to date are all `planned`: `feedback-main-296e.md`
(mouse-drawing cursor bug) and `feedback-main-4af4.md` (round-gated
turns) into their original 2026-07-14 plans; the four items found in
this session's `/run` smoke-testing — `feedback-main-3ea6.md` (F001,
input-clearing), `feedback-main-4258.md` (F001, host missing Reveal
replays), `feedback-main-6d3d.md` (F001, stale draw-tool color/width
mid-stroke), and `feedback-main-e2ff.md` (F001, kick button doing
nothing) — all into `plan-5ef1-2026-07-17-9e40.md`, now tasked as
`tasks-5ef1-9eea.md` (0/7, `ready`). That plan has no bound features
(it's a pure bug-fix plan), so it isn't reflected in the Feature Backlog
counts below.

## Feature Backlog

0 backlogged · 0 planned · 0 tasked · 7 implemented — see
`.project/features/`.

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
- `host-game-moderation-controls` (**implemented**) — host-facing "end
  game" (now host-only at any `Room.status`, relaxed from the prior
  reveal-only guard), "kick player" (`Player.kicked`), and "restart
  game" (resets the same room to a fresh turn 0, requires
  `Room.nonContinuable`) controls. Kicking a player during `writing`
  immediately sets `Room.nonContinuable` and freezes further
  submissions (`onSubmitEntry` rejects `room-non-continuable`) rather
  than trying to make the round-robin turn engine skip the kicked
  player's orphaned turn in place — the host must restart or end.
  Distinct from Phase 3's "play again" (a fresh room/players after a
  game naturally ends). Plan:
  `plan-host-game-moderation-controls-2026-07-15-9c9b.md`. Tasks:
  `tasks-host-game-moderation-controls-7c9d.md` (**completed**, 12/12)
  — delegated to a worktree subagent, merged to `main` clean
  (fast-forward, no conflicts), worktree reaped. 4 phases: shared types
  + kick-excluding book generation (T001–T002), server handlers
  (T003–T007), client Moderation Panel + "game can't continue" notice
  (T008–T011), full-suite verification (T012). Verified post-merge:
  typecheck 0 errors, full suite passing (shared 18 + server 110 +
  client 83 = 211 tests), lint clean. One server test flaked once
  during a pre-commit hook run (timing-sensitive Socket.IO integration
  test) but passed clean on immediate re-run and on the final full-suite
  pass — not treated as a regression. No artifact changes were needed
  during implementation beyond what `/ardd-plan` already applied
  (`client/src/lib/stores/session.ts` turned out to be the right home
  for the new socket methods, not `client.ts` as the plan's T008
  suggested — a minor implementer judgment call, no artifact impact).

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

`host-game-moderation-controls` was planned and tasked on its own
(not part of any of the 3 phases above) and is now implemented and
merged — see Feature Backlog.

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

**All 7 features (the original 3-phase Phase Plan, both defect
fix-up plans, and now `host-game-moderation-controls`) are
implemented and merged to `main`.** The last backlogged feature added
host-only "kick player"/"end game" (any status)/"restart game"
controls; datamodel/infrastructure/ui were amended accordingly (new
`Player.kicked`/`Room.nonContinuable` fields, relaxed `onEndGame`
guard, new `onKickPlayer`/`onRestartGame` handlers, new Moderation
Panel UI section) and all three are `stale` on diagrams pending a
fresh `/ardd-diagram` pass. 1 defect remains on file (the
deliberately-declined performance-budget claim, unaffected by this
change). 1 open feedback file (the PNG-export flood-fill leak — see
Feedback above), plus 4 already-planned bugs from this session's `/run`
smoke-testing now tasked as `tasks-5ef1-9eea.md` (0/7, `ready`), 0
backlogged/planned/tasked features — every feature in the register is
`implemented` (this session's bug-fix plan binds no features). No
cross-artifact conflicts or constitution violations. Working tree clean;
no worktrees in flight; 8 prior tasks files `completed`, plus the new
`tasks-5ef1-9eea.md` at `ready` (0/7) — not yet started. Full suite: 211
tests passing (shared 18 + server 110 + client 83), typecheck clean,
lint clean — as of the last full run, before this session's pending
fixes. A manual `/run` smoke test this session (3 real isolated player
sessions, live in Chrome) confirmed the core write→draw→write loop,
round-gating, and the drawing-canvas pointer-accuracy fix all work
correctly end-to-end; all 5 bugs now recorded (4 planned + 1 open) were
reported separately by the user after that session, from further
hands-on use. Root cause was confirmed by reading the code for 2 of the
4 already-planned bugs (input-clearing: `WritingDrawing.svelte`'s
draft-reset reactive statement fires on any room broadcast, not just
this player's own turn changing; stale color/width: `DrawingCanvas.svelte`
only applies the selected color/width to the canvas context after a
stroke finishes, not when it starts) — Phase 1 of that plan fixes these
directly. The other 2 (host missing Reveal replays; kick button doing
nothing) read correctly in the code on static inspection — including the
kick handler, which `DEFECTS.md`'s last pass found matching its artifact
description with passing tests — so Phase 2 reproduces both live before
writing a fix, rather than guessing. The newest bug (PNG-export
flood-fill leak) hasn't been triaged in code yet — it's plausibly related
to how `applyFill`'s scanline flood-fill interacts with an entry's own
canvas bounds vs. the exported composite's, given `ui.md`'s Production
Annotations already flag the fill tool's exact-match-only boundary
behavior as a known rough edge, though that's a different aspect (color
tolerance, not bounding) — worth checking during planning whether they're
related or distinct. A separate `/ardd-audit` full pass wrote 8 findings
(0 suggestions, 5 questions, 3 risks) to `.project/audit.md` — open, not
yet resolved. Safe to /plan: yes.

## Recommended Next Step

`/ardd-implement` to work `tasks-5ef1-9eea.md` (0/7, `ready`) — Phase 1
(T001-T004) fixes the two confirmed bugs with tests; Phase 2
(T005-T006) reproduces the other two live before fixing; Phase 3 (T007)
is full-suite + manual verification. Separately, `/ardd-plan` to pick up
the new PNG-export flood-fill bug (`feedback-main-8a99.md`) whenever
convenient — it's independent of the other four. Also worth doing at
some point: `/ardd-diagram` on datamodel, infrastructure, and ui to
bring the now-stale diagrams back in sync, and a look through
`.project/audit.md`'s open findings (5 questions, 3 risks) to decide
which merit a refine or backlog entry.
