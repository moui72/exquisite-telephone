# Exquisite Telephone — Project Status

_Updated: 2026-07-18 (`/ardd-plan` ran: consumed `feedback-main-5fdc.md`'s
F001 (accepted) into a new 4-phase plan, `plan-1449-2026-07-18-2ce0.md`
(approved) — Phase 1 clarifies `ui.md` (theme applies globally, not just
to `GiltFrame`, plus a slate-to-token mapping table), Phase 2 adds a
global `app.css` base layer (body bg/color/font, heading font), Phase 3
does the actual per-view reskin across Lobby/WritingDrawing/Reveal/
ModerationPanel/App-terminal-states/TurnStatus-DrawingCanvas-check (6
parallel tasks, each with a source-scan regression-guard test asserting
no `slate-` substring remains — meant to prevent a repeat of the
"looked plausible but only half-landed" failure mode from the first
pass), Phase 4 full-suite verification. Tasks file
`tasks-1449-a6ef.md` generated and `ready` (9 tasks; no bound features).
`feedback-main-5fdc.md` flipped `open` -> `planned`. No unsurfaced
defects, no existing approved plan superseded. Prior entry:
`/ardd-feedback` logged `feedback-main-5fdc.md`:
F001 (UX) — the user reported the reskinned UI still "looks very
plain," which a code check confirmed: `salon-gallery-ui-redesign`
only actually reskinned the `GiltFrame` component itself; `font-
display`/`font-body` are never applied anywhere, and the theme's
background/text colors (`bg-butter`/`bg-velvet`/`bg-ink`/`bg-marigold`)
appear nowhere outside `GiltFrame.svelte` — page headings, body text,
labels, borders, and most buttons across Lobby/WritingDrawing/Reveal/
ModerationPanel/TurnStatus/App terminal states are still stock
Tailwind slate-gray/white. Open, queued for the next `/ardd-plan`.
**ArDD update available**: installed `c5ce6e9`, source (beta channel)
at `v0.10.3-beta.3` — run `/ardd-update` when convenient. Prior entry:
`/ardd-implement` ran `tasks-7c63-355f.md` end to
end: delegated to a worktree subagent (solo mode, `delegation: eager`),
all 5 tasks completed and committed — `ui.md` clarified (host-only
notice suppression rule, error-code-mapping rule), the duplicate
"game can't continue" notice fixed in `WritingDrawing.svelte`
(host-excluded, non-host still sees it), and an `ERROR_COPY`/
`FALLBACK_ERROR_COPY` lookup added to `Lobby.svelte` replacing the raw
`{state.error}` render — both test-first, both confirmed failing before
the fix. Tasks file flipped `completed`; no bound features (`features:
[]`) so nothing to flip to `implemented`. Merged clean to `main`
(`merge_policy: auto`, no conflicts, 6 files changed), worktree reaped.
Post-merge typecheck reconfirmed clean (216 files, 0 errors). Full
suite per the subagent's own T005 run: 243 tests green (shared 18 +
server 112 + client 113), lint clean. `feedback-main-8da5.md` (F001,
F002) is now fully resolved and merged — nothing further tracked from
it. All diagrams remain current (the `ui.md` edits were textual
clarifications, no new component nodes). Prior entry: `/ardd-diagram
ui` then `/ardd-plan` ran: `ui.md`'s
diagram regenerated (`graph TD`, `README.md` UI section) and stamped
`current`. Then a no-feature-slug `/ardd-plan` consumed the one open
feedback file, `feedback-main-8da5.md` — both F001 and F002 accepted by
the user and incorporated into a new 3-phase plan,
`plan-7c63-2026-07-18-f55f.md` (approved): Phase 1 clarifies `ui.md`
(single-visibility rule for the "can't continue" notice; error-code-
mapping rule for Lobby's Error state), Phase 2 implements both fixes
test-first, Phase 3 full-suite verification. Tasks file
`tasks-7c63-355f.md` generated and `ready` (5 tasks; no bound features —
`features: []`). `feedback-main-8da5.md` flipped `open` -> `planned`,
stamped with the consuming plan. No unsurfaced defects, no existing
approved plan superseded (none in scope overlap). Prior entry:
`/ardd-feedback` logged `feedback-main-8da5.md`:
the two implementer judgment calls flagged after
`salon-gallery-ui-redesign`'s implementation, filed at the user's
request — F001 (Bug, `[artifacts: ui]`): `ModerationPanel` and
`WritingDrawing` both render the "game can't continue" notice,
double-showing it when the panel's expanded; F002 (UX,
`[artifacts: ui]`): Error/Empty states in `Lobby.svelte` still show raw
server error codes instead of docent-voice copy. Both open, queued for
the next `/ardd-plan`. Prior entry: `/ardd-implement` ran
`tasks-salon-gallery-ui-
redesign-7729.md` end to end: delegated to a worktree subagent (solo
mode, `delegation: eager`), all 11 tasks completed and committed
(Tailwind salon/gallery tokens + webfonts, `GiltFrame.svelte` signature
component, docent-voice reskin of Lobby/WritingDrawing/Reveal/
ModerationPanel/App terminal states, a new `prefersReducedMotion`
store), tasks file flipped `completed`, feature flipped `implemented`.
Merged clean to `main` (`merge_policy: auto`, no conflicts, 22 files
changed), worktree reaped. Post-merge typecheck reconfirmed clean (216
files, 0 errors). Full suite per the subagent's own T011 run: 135 tests
green (shared 18 + server 112 + client 105), lint clean. `ui.md`'s
`diagram_status` is `stale` (expected — a Visual Identity section was
added; run `/ardd-diagram ui`). **Two implementer judgment calls
flagged for review, not yet resolved:** (1) `ModerationPanel.svelte` now
also renders the "game can't continue" notice inside the panel (T009),
matching `ui.md`'s literal description, but the notice was already
shown in `WritingDrawing.svelte` too — a host with the panel open during
a non-continuable game now sees it twice; presentational only. (2) T010
left the **Error** and **Empty** terminal states without docent-voice
copy: `Lobby.svelte` renders raw server error codes
(`room-not-found`/`not-host`/etc.) verbatim with no human-readable copy
layer to translate, a pre-existing gap this redesign didn't introduce
and no task authorized building an error-code-to-copy mapping; Empty is
just Lobby with one player, already covered. Neither was decided
unilaterally — both are surfaced here for the user to route via
`/ardd-feedback` if they want either tracked as follow-up work. Prior
entry: `/ardd-plan salon-gallery-ui-redesign` ran:
designed and applied the feature's `ui.md` changes — a new "Visual
Identity" section (color tokens, Fraunces/Rubik/Space Mono type
pairing, the reusable Gilt Frame signature component, the Docent Voice
copy rule, a `prefers-reduced-motion` carve-out for Reveal's decorative
flourish only) plus short per-view framing notes (Lobby = RSVP card,
Writing/Drawing = easel, Reveal = gallery opening) — replacing the old
bare `## Styling` section; `ui.md` stays `stable`, `diagram_status` now
`stale` pending a fresh `/ardd-diagram ui` pass. No changes needed to
datamodel/infrastructure/constitution — presentation-layer only. Plan
`plan-salon-gallery-ui-redesign-2026-07-18-885b.md` approved (6 phases,
0 Complexity Tracking/Production Annotation entries — neither
warranted); tasks file `tasks-salon-gallery-ui-redesign-7729.md`
generated and `ready` (11 tasks, T001/T005/T011 untested by design —
config-only, pure-restyle-no-behavior-change, and a verification run,
respectively — every other task carries a failing-test-first
requirement per constitution Principle III). Feature flipped
`backlogged` -> `planned` -> `tasked`. Re-confirmed on this pass: no
cross-artifact issues, no orphaned completion flips, nothing in flight,
no open feedback, no documented-but-untracked capabilities, no epic
grouping. Prior entry:
`/ardd-update --beta` ran: project deliberately switched from the
`stable` to the `beta` channel and updated to v0.10.2, no pending
migrations, no frontmatter backfill needed. `tasks-5ef1-9eea.md` is
fully `completed`
(8/8): after the user supplied missing context on the two previously-
open questions, `datamodel.md`/`ui.md` were refined with the resolved
decisions (server-synchronized `Room.revealStartedAt` for Reveal
pacing; kicked-player own-client ejection; full roster removal instead
of strikethrough), and a second delegated worktree implemented T005-T008
against that guidance — merged clean (non-fast-forward, no conflicts).
All 5 bugs found that session are fixed and merged. Combined with
the PNG-export fix (`tasks-7b9d-a92c.md`, 3/3, `completed`), all 10
tasks files in the project are now `completed`, full suite on `main` is
222 tests, all green (lint/typecheck clean too). A fresh `/ardd-audit`
full pass also ran that session — 8 findings (0 suggestions, 5
questions, 3 risks) written to `.project/audit.md`, not tracked here
since it isn't part of this report's schema; see that file directly.).
Keep this current as artifacts are refined and open questions are
resolved._

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

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — current ✅

## Code-vs-Artifact Defects

1 defect on file — see `.project/DEFECTS.md`, last checked 2026-07-15
(fresh full pass; the two previously-recorded fixes reconfirmed clean
in code and dropped from the file).
- **drift** (`constitution.md`, Quality Standards): no artifact states
  a performance budget for any real-time operation. Still deliberately
  declined (`plan-4401-2026-07-14-7cf3.md`) — carried forward each
  pass since declining the fix doesn't make the underlying claim true.

## Feedback

0 open feedback files. `feedback-main-5fdc.md` (F001, UX: the
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

0 backlogged · 0 planned · 0 tasked · 8 implemented — see
`.project/features/`.

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
0 backlogged, 0 planned, 0 tasked, 8 implemented features. No
cross-artifact conflicts or constitution violations. All diagrams
current. 0 open feedback files — `feedback-main-5fdc.md` planned into
`plan-1449-2026-07-18-2ce0.md` (approved, tasked, `tasks-1449-a6ef.md`
ready, 0/9, not yet implemented). Nothing in flight. ArDD update
available (beta channel, `v0.10.3-beta.3`).
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

## Recommended Next Step

`/ardd-implement` to execute `tasks-1449-a6ef.md` (9 tasks, ready) —
the full-app theme reskin. `/ardd-update` when convenient (beta channel
has a newer release). Also worth doing at some point: a look through
`.project/audit.md`'s open findings (5 questions, 3 risks) to decide
which merit a refine or backlog entry.
