# Exquisite Telephone — Project Status

_Updated: 2026-07-20 (`/ardd-plan` ran over the help-text audit
feedback and both recorded defects. Plan
`plan-help-text-accuracy-2026-07-20-e6e1.md` **approved** (5 phases, 3
open questions); `tasks-help-text-accuracy-9755.md` generated and
`ready` (13 tasks).

Scope covers F001-F004 from `feedback-help-text-audit-e243.md` plus
defects `c217e21f` and `f678931d`. `feedback-main-338d.md` was
deliberately left `open` and untouched — it is a state-broadcast bug
sharing no files with this work.

Two structural decisions in the plan: the two defects sit in **different
phases** rather than being batched as "the doc fixes", because
`f678931d` cannot be corrected until the tooltip question is settled —
`ui.md`'s claim becomes true or false depending on what the code does;
and the plan commits to **structural** prose tests (a tooltip exists per
control; the panel makes no mode-specific claim) rather than assertions
pinned to exact wording, which would break on every copy edit and get
deleted.)_

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

## Open Questions

_(none — both prior open questions were resolved this session. F3:
user confirmed a server-synchronized reveal clock; `datamodel.md` now
records `Room.revealStartedAt` and its derivation rule. F4: the user
clarified the real, reproducing bug — the earlier "does not reproduce"
finding only checked the host's own view; the kicked player's own
client never reacted to its own `kicked` flag at all, and separately the
user wants kicked players fully removed from the host's roster display,
reversing the "stay struck-through" design — `datamodel.md` now records
the own-client-ejection rule; `ui.md` refine for the roster-display and
Reveal-view changes is in progress. Implementation for both is pending
a plan.)_

## Diagrams

- datamodel.md — stale ⚠️ (run /ardd-diagram datamodel — two new
  persisted entities this pass, plus the four `Room` fields from the
  prior pass)
- infrastructure.md — stale ⚠️ (run /ardd-diagram infrastructure — the
  Curation Store and its volume are a genuinely new node and edge)
- ui.md — stale ⚠️ (run /ardd-diagram ui — textual-only changes, so the
  diagram content won't actually change, just its `current` stamp)

## Code-vs-Artifact Defects

**2 defects** as of 2026-07-20 — see `.project/DEFECTS.md`.
`infrastructure.md`'s handler list omits three wired handlers, and
`ui.md` overclaims tooltip coverage (four tooltips, seven controls).
Both are now **surfaced and planned** in
`plan-help-text-accuracy-2026-07-20-e6e1.md` (T001 and T010). They will
drop out of `DEFECTS.md` on the next `/ardd-defects` run once fixed —
that file is fully regenerated each run, never hand-edited.

## Feedback

- **1 open feedback file** — `feedback-main-338d.md` (F001: host gets
  no frozen-room signal after a kick, a regression from the Salon Footer
  refactor). Deliberately left out of the help-text plan: a
  state-broadcast bug sharing no files with that work. Will be picked up
  by a later `/ardd-plan`.
- `feedback-help-text-audit-e243.md` is now **planned** (all four items
  incorporated) via `plan-help-text-accuracy-2026-07-20-e6e1.md`.

_History below (all prior items resolved):_ `feedback-main-7922.md` (F001 Bug — drawing
submit button unclickable; F002 Bug — palette needs a white erase/undo
option) is `planned` via `plan-main-2026-07-19-05fb.md`, and both items
are now **fixed and merged to `main`** (`tasks-main-be75.md`,
**completed 4/4**).

`feedback-main-5fdc.md` (F001, UX: the
salon-gallery-ui-redesign theme was only ever applied to `GiltFrame`,
not broadly across the app) is `planned` via
`plan-1449-2026-07-18-2ce0.md` (`tasks-1449-a6ef.md`, `ready`, 0/9) —
not yet implemented. Prior: `feedback-main-8da5.md` (F001 bug —
`ModerationPanel`/`WritingDrawing` double-render the "game can't
continue" notice; F002 UX — Error/Empty states show raw error codes
instead of docent-voice copy) is `planned` via
`plan-7c63-2026-07-18-f55f.md`, and both items are now **fixed and
merged to `main`** (`tasks-7c63-355f.md`, **completed 5/5**). All
seven prior items are `planned`, and every one is now fixed and merged
to `main`: `feedback-main-296e.md`
(mouse-drawing cursor bug) and `feedback-main-4af4.md` (round-gated
turns) from their original 2026-07-14 plans; `feedback-main-8a99.md`
(F001, PNG-export flood-fill leak) via `plan-7b9d-2026-07-17-dded.md`
(`tasks-7b9d-a92c.md`, **completed 3/3**); and all four items found in
this session's `/run` smoke-testing via `plan-5ef1-2026-07-17-9e40.md`
(`tasks-5ef1-9eea.md`, **completed 8/8**):
- `feedback-main-3ea6.md` (F001, input-clearing) — **fixed**.
- `feedback-main-6d3d.md` (F001, stale draw-tool color/width mid-stroke)
  — **fixed**.
- `feedback-main-4258.md` (F001, host missing Reveal replays) —
  **fixed**: `Room.revealStartedAt` now gives every client a shared
  clock to derive Reveal-animation pacing from, instead of independent
  local timers.
- `feedback-main-e2ff.md` (F001, kick button doing nothing) — **fixed**:
  the user's follow-up clarified the real gap (kicked player's own
  client never reacted to being kicked at all, and the host's roster
  didn't visibly change) — now the kicked player's own client is ejected
  to a dedicated "you were removed" state, and kicked players are
  removed entirely from the host's roster (reversing the prior
  struck-through-but-visible design).

Neither plan has bound features (both are pure bug-fix plans), so
neither is reflected in the Feature Backlog counts below.

## Feature Backlog

3 backlogged · 0 planned · 0 tasked · 12 implemented · 1 subsumed — see
`.project/features/`. No tasks file is `ready` or `in-progress`. Three
backlogged entries, none urgent:
`curation-data-aggregation-pipe` (the deterministic layer where
prompt-injection defense belongs, before any agent reads player-written
text), `release-promotion-workflow` (a `workflow_dispatch` that
fast-forwards `release` from `main`), and `fly-config-lockstep` (lint or
generate the two Fly configs so they cannot silently diverge — the drift
this session fixed by hand).

- `player-prompt-rating` (**implemented** 2026-07-20, logged 2026-07-20) — the player
  who draws a book's opening phrase rates it inline on that drawing
  turn. A bank phrase's rating increments its tally; a thumbs-up on a
  player-written phrase joins the candidate pool; a thumbs-down on a
  player-written phrase is discarded (no destination, and no use for
  recording that someone disliked a player's writing). Introduces the
  app's first durable storage, scoped to curation data only. Plan:
  `plan-curated-phrase-bank-2026-07-20-4eeb.md` (**approved**, 6
  phases, 1 open question — near-miss candidate dedup, non-blocking).
  Tasks: `tasks-curated-phrase-bank-e335.md` (**completed**, 21/21),
  merged to `main`.
- `book-love-reactions` (**subsumed** by `player-prompt-rating`,
  2026-07-20) — book hearts at Reveal. Dropped rather than deferred:
  rating on the drawing turn mines player phrases with one mechanism
  instead of two. Hearts as a purely social feature would be a fresh
  backlog entry; ArDD never revives a subsumed slug.

- `curated-prompt-mode` (**implemented** 2026-07-20, logged 2026-07-19) — a
  host-selectable curated prompt mode alongside the existing free-form
  mode: each player is dealt N phrases from a predetermined fixed set
  and picks one, with N host-configurable and an optional host-toggled
  write-in option. Distinctness across players is structural (a single
  shuffle partitioned across players, not per-player sampling). Plan:
  `plan-curated-prompt-mode-2026-07-19-cfab.md` (**approved**, 5
  phases, 0 open questions). Tasks:
  `tasks-curated-prompt-mode-4e57.md` (**completed**, 11/11), merged to
  `main`.
- `in-game-rules-and-guidance` (**implemented**) — a dismissible Rules
  Overview panel (Foyer + Lobby), docent-voice turn hints on the
  Writing/Drawing view, and `(?)` info tooltips on all three host
  settings. Plan: `plan-in-game-rules-and-guidance-2026-07-19-5540.md`
  (approved, 4 phases). Tasks:
  `tasks-in-game-rules-and-guidance-4c59.md` (**completed**, 6/6) —
  delegated to a worktree subagent, merged to `main` clean (no
  conflicts), worktree reaped. Verified post-merge: typecheck 0 errors
  (331 files), full suite 136 tests passing, lint clean. Found and
  fixed a real label-association a11y bug along the way (a labelable
  `<button>` nested inside a settings `<label>` stole the implicit
  association).

- `configurable-book-laps-per-gam` (**implemented**) — game-creation
  setting for how many laps each book takes before the game ends and
  Reveal begins (default 2 laps under 5 players, 1 lap otherwise, max
  3). Plan: `plan-configurable-book-laps-per-gam-2026-07-18-37ca.md`
  (approved, 4 phases). Tasks:
  `tasks-configurable-book-laps-per-gam-2b08.md` (**completed**, 7/7) —
  delegated to a worktree subagent, merged to `main` clean (no
  conflicts), worktree reaped. Verified post-merge: typecheck 0 errors
  (327 files), full suite 269 tests passing (25 shared + 119 server +
  125 client), lint clean.
- `salon-gallery-ui-redesign` (**implemented**) — "tongue-in-cheek
  exquisite" salon/gallery UI redesign (gilt-frame signature component,
  Fraunces/Rubik/Space Mono type, candy-bright color tokens, docent-
  voiced copy) across Lobby, WritingDrawing, Reveal, the Moderation
  Panel, and terminal states, replacing the current unbranded
  default-Tailwind look. Plan: `plan-salon-gallery-ui-redesign-2026-07-
  18-885b.md` (approved, 6 phases). Tasks:
  `tasks-salon-gallery-ui-redesign-7729.md` (**completed**, 11/11) —
  delegated to a worktree subagent, merged to `main` clean (no
  conflicts), worktree reaped. Verified post-merge: typecheck 0 errors
  (216 files), full suite 135 tests passing (shared 18 + server 112 +
  client 105), lint clean. Two implementer judgment calls flagged for
  the user, not yet routed to feedback — see the entry at the top of
  this file.

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

## Work Queue

- `tasks-help-text-accuracy-9755.md` — plan
  `plan-help-text-accuracy-2026-07-20-e6e1.md`, no bound features
  (**ready**, 0/13). Sole `ready` file, so `parallel-matrix.sh` is
  silent by design; nothing in flight to conflict with.

## In Flight

_(none — the full-app reskin worktree reported back, merged clean,
and was reaped)_

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

**Current state (2026-07-20, latest pass):** Safe to implement:
**yes**. `tasks-help-text-accuracy-9755.md` is `ready` at 0/13.
Artifacts `stable`, 0 open questions; nothing in flight. One feedback
file stays open by choice (`feedback-main-338d.md`); three features stay
backlogged, none urgent.

**Three open questions are assigned to tasks rather than left
floating** — T004 (where the rating explanation lives), T007 (extend the
curated tooltip or add separate ones), T011 (what the rules panel should
cover). Each is a decision task whose output a later task depends on, so
implementation cannot quietly guess.

**Not yet pushed.** `main` is ~61 commits ahead of `origin/main`.
Pushing auto-deploys **beta** — the first deploy that will mount the
volume and persist ratings.

Carried forward, none blocking:
- All three renderable artifacts are `stale` on diagrams.
- No client-side `maxlength` on the phrase input; oversize content is
  caught only server-side (`entry-too-large`) and whether the client
  surfaces that gracefully is unverified.
- **Flaky server test** — `server.test.ts > onStartGame rejects a
  non-host caller`, intermittent connect timeout. Predates this
  session's work.

**Recommended next step:** `/ardd-implement` —
`tasks-help-text-accuracy-9755.md` (13 tasks). Then `/ardd-diagram
datamodel` + `/ardd-diagram infrastructure` for the two diagrams whose
shape actually changed.

---

_Historical, from prior passes:_

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
change). 0 open feedback files, 0 open questions. **All 5 bugs found
this session are fixed and merged to `main`** (see Feedback above):
input-clearing, stale draw color/width, PNG-export flood-fill leak, a
server-synchronized Reveal clock (`Room.revealStartedAt`, resolving the
host-races-ahead bug), and the kicked-player flow (own-client ejection
to a new terminal state + full roster removal on the host's side,
reversing the prior struck-through-but-visible design). `datamodel.md`
and `ui.md` were both refined 2026-07-17 with these decisions before
implementation — both `stable`, and all three renderable artifacts
(datamodel, infrastructure, ui) now have `diagram_status: current`
after a fresh `/ardd-diagram` pass regenerated all three into `README.md`.
0 backlogged, 0 planned, 0 tasked, 9 implemented features —
`configurable-book-laps-per-gam` implemented and merged this pass. No
cross-artifact conflicts or constitution violations. All diagrams
current except `ui.md` (stale — pending a fresh `/ardd-diagram ui`
pass; this session's changes were textual, no new component nodes).
0 open feedback files — `feedback-main-7922.md` (F001 drawing submit
button unclickable, F002 palette needs a white erase/undo option) is
fixed and merged to `main` via `plan-main-2026-07-19-05fb.md` /
`tasks-main-be75.md` (**completed 4/4**). `feedback-main-5fdc.md`'s
F001 (theme not applied broadly) fixed and merged via
`plan-1449-2026-07-18-2ce0.md` / `tasks-1449-a6ef.md` (completed 9/9).
Nothing in flight. ArDD is up-to-date on the beta channel (`v1.0.1`, commit `9fd6fbb` — the final release superseded the `v1.0.1-beta.1` prerelease previously installed).
Working tree clean on `main`; no worktrees in flight — all three
delegated worktrees this session reported back, merged (two
fast-forward/non-fast-forward clean merges, one merge that needed the
on-disk Claude signing key after a locked-1Password commit failure —
still clean, no conflicts), and were reaped. **All 10 tasks files in the
project are now `completed`** — `tasks-7b9d-a92c.md` (3/3) and
`tasks-5ef1-9eea.md` (8/8, the last two tasks — T005-T008 — resolved in
a second delegated round after this session's `/ardd-refine` decisions).
Full suite on `main`: 222 tests passing (shared 18 + server 112 + client
92), typecheck clean, lint clean. A manual `/run` smoke test earlier this
session (3 real isolated player sessions, live in Chrome) confirmed the
core write→draw→write loop, round-gating, and the drawing-canvas
pointer-accuracy fix all work correctly end-to-end; the 5 bugs above
were reported separately by the user from further hands-on use, and 2 of
them needed a second round of live investigation plus user-supplied
context (a genuine reproduction gap for the kick bug — the earlier check
only verified the host's own view, not the kicked player's client or the
roster's *removal*, not strikethrough) before both were fully understood
and fixed. A separate `/ardd-audit` full pass wrote 8 findings (0
suggestions, 5 questions, 3 risks) to `.project/audit.md` — open, not
yet resolved; unrelated to this session's bug fixes. Safe to /plan: yes.

Nothing blocking. Worth doing: a fresh `/ardd-defects` pass to clear
the now-fixed `62ab502f` entry from `DEFECTS.md`'s snapshot,
`/ardd-diagram ui` to clear the diagram's `stale` stamp, a manual look
at the new Rules Overview panel / info tooltips in a real browser to
confirm they read right beyond what automated tests can check, and a
look through `.project/audit.md`'s open findings (5 questions, 3 risks
— one, the Performance Budgets question, is now moot per this
session's constitution trim) to decide which of the rest merit a
refine or backlog entry.
