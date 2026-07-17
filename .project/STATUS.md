# Exquisite Telephone — Project Status

_Updated: 2026-07-17 (`tasks-5ef1-9eea.md`'s worktree reported back and
merged (non-fast-forward, no conflicts): 2 of its 4 bugs are fixed with
passing regression tests (F1 input-clearing, F2 stale draw color/width);
the other 2 hit the reproduce-first task's escape hatch and need a
decision — see Open Questions below. The tasks file stays `in-progress`
(4/7) on `main`, not `completed`, until F3/F4 are resolved one way or
another. Combined with the earlier-merged PNG-export fix
(`tasks-7b9d-a92c.md`, 3/3, `completed`), full suite on `main` is now 214
tests, all green (lint/typecheck clean too). A fresh `/ardd-audit` full
pass also ran this session — 8 findings (0 suggestions, 5 questions, 3
risks) written to `.project/audit.md`, not tracked here since it isn't
part of this report's schema; see that file directly.). Keep this
current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

## Open Questions

- **F3 (host missing Reveal replays, `feedback-main-4258.md`) — real bug,
  needs a scoping decision.** Live 3-tab reproduction confirmed the
  symptom and found the root cause: `Reveal.svelte`'s reveal-pacing
  animation runs a plain client-local `setTimeout`/`setInterval` per
  socket, seeded from that client's own `onMount`, with no shared clock
  — timer drift between clients compounds unrecoverably over a 3-book
  sequence, so the host's tab reliably raced ahead of non-host tabs to
  the static end state. A correct fix needs a new `Room` field (e.g.
  `revealStartedAt`, stamped server-side when `status` flips to
  `reveal`) so every client derives its animation position as a pure
  function of `now - revealStartedAt` instead of local counters — a
  `datamodel.md` decision, not something the implementer was authorized
  to add unilaterally. Decide: scope a follow-up `/ardd-refine
  datamodel` + plan for a server-synchronized reveal clock, or handle
  differently.
- **F4 (kick button doing nothing, `feedback-main-e2ff.md`) — does not
  reproduce.** Live-tested the exact reported flow (host kicks a
  non-host player) in both `writing` and `reveal` phases, twice
  independently — kick worked correctly every time: ack/broadcast
  round-tripped, target shown struck-through with a disabled "Kicked"
  button, room-wide "can't continue" notice appeared correctly during
  `writing`. This directly contradicts the original report. Decide:
  close `feedback-main-e2ff.md` as non-reproducing, or is there a
  specific path not covered (one candidate surfaced during testing: the
  *kicked player's own* client shows no notice/ejection when kicked
  mid-`reveal` — possibly in-spec, since `ui.md` only documents a
  writing-phase `nonContinuable` notice, not a reveal-phase one)?

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

0 open feedback files. All seven items to date are `planned`:
`feedback-main-296e.md` (mouse-drawing cursor bug) and
`feedback-main-4af4.md` (round-gated turns) into their original
2026-07-14 plans; `feedback-main-8a99.md` (F001, PNG-export flood-fill
leak) into `plan-7b9d-2026-07-17-dded.md` (tasked as
`tasks-7b9d-a92c.md`, **completed 3/3, merged to `main`**); and the four
items found in this session's `/run` smoke-testing into
`plan-5ef1-2026-07-17-9e40.md` (tasked as `tasks-5ef1-9eea.md`,
**in-progress, 4/7, merged to `main` at that progress**):
- `feedback-main-3ea6.md` (F001, input-clearing) — **fixed**, regression
  test passing.
- `feedback-main-6d3d.md` (F001, stale draw-tool color/width mid-stroke)
  — **fixed**, regression test passing.
- `feedback-main-4258.md` (F001, host missing Reveal replays) — **not
  yet fixed**; reproduced live with a confirmed root cause, but the fix
  needs a `datamodel.md` decision — see Open Questions above.
- `feedback-main-e2ff.md` (F001, kick button doing nothing) — **does not
  reproduce** on further live testing — see Open Questions above.

Neither plan has bound features (both are pure bug-fix plans), so
neither is reflected in the Feature Backlog counts below.

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

_(none — both delegated worktrees from this session reported back,
merged clean, and were reaped)_

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
change). 0 open feedback files, but 2 open questions now block full
closure of `tasks-5ef1-9eea.md` — see Open Questions above. Of the 5
bugs found this session: 3 are fully fixed and merged (input-clearing,
stale draw color/width, PNG-export flood-fill leak — all with passing
regression tests); 1 (host missing Reveal replays) reproduced live with
a confirmed root cause but needs a `datamodel.md` decision before it can
be fixed; 1 (kick button doing nothing) does not reproduce on further
live testing and needs a decision on whether to close it. 0
backlogged/planned/tasked features — every feature in the register is
`implemented` (both new plans bind no features). No cross-artifact
conflicts or constitution violations. Working tree clean on `main`; no
worktrees in flight — both this session's delegated worktrees reported
back, merged (one fast-forward, one non-fast-forward, neither with
conflicts), and were reaped. `tasks-7b9d-a92c.md` (3/3) is `completed`;
`tasks-5ef1-9eea.md` (4/7) stays `in-progress` pending the two open
questions. 9 tasks files now `completed`, 1 `in-progress`. Full suite on
`main` post-merge: 214 tests passing (shared 18 + server 110 + client
86), typecheck clean, lint clean. A manual `/run` smoke test this
session (3 real isolated player sessions, live in Chrome) confirmed the
core write→draw→write loop, round-gating, and the drawing-canvas
pointer-accuracy fix all work correctly end-to-end; the 5 bugs above
were reported separately by the user after that session, from further
hands-on use. Root cause was confirmed and fixed for 3 of the 5
(input-clearing: `WritingDrawing.svelte`'s draft-reset reactive
statement fired on any room broadcast, not just this player's own turn
changing; stale color/width: `DrawingCanvas.svelte` only applied the
selected color/width to the canvas context after a stroke finished, not
when it started; PNG-export flood-fill leak: `pngExport.ts`'s
`renderBookOntoContext` scoped the flood fill to the *entire* composite
canvas instead of just the current entry's own row — distinct from
`ui.md`'s already-documented exact-match-color Production Annotation,
which is about tolerance, not bounding). The other 2 needed live
reproduction per the plan's design: the Reveal-replay bug turned out
real (a per-client unsynchronized animation clock — see Open Questions),
while the kick bug turned out not to reproduce at all, directly
contradicting the original report. A separate `/ardd-audit` full pass
wrote 8 findings (0 suggestions, 5 questions, 3 risks) to
`.project/audit.md` — open, not yet resolved. Safe to /plan: yes.

## Recommended Next Step

Resolve the two open questions above (both need your input, not more
investigation): whether to scope a follow-up plan for a
server-synchronized Reveal clock (F3), and whether to close the
non-reproducing kick-button feedback item (F4) or dig into the one
specific gap surfaced during testing (kicked player's own client during
`reveal`). Once decided, `/ardd-plan` can finish out `tasks-5ef1-9eea.md`
(currently 4/7, blocked on exactly these two tasks). Also worth doing at
some point: `/ardd-diagram` on datamodel, infrastructure, and ui to
bring the now-stale diagrams back in sync, and a look through
`.project/audit.md`'s open findings (5 questions, 3 risks) to decide
which merit a refine or backlog entry.
