# Exquisite Telephone — Project Status

_Updated: 2026-07-21 (**One `ready` tasks file: `tasks-2b0f-effb.md`
(0/3) — the fix for the laps `book-complete` broken-contract
(`d27f4eea`).** `onSubmitEntry`'s guard is laps-unaware and blocks
multi-lap games (the default <5-player game is 2 laps, so the default is
affected). The fix extracts a single `isBookComplete` helper both call
sites share, rather than correcting the duplicated condition in place —
the duplication is the root cause. Plan `plan-2b0f-2026-07-21-48cc.md` is
`approved`. This is the only outstanding work.

Earlier today: a fresh `/ardd-defects` pass cleared the seven old defects
and found this one; all three diagrams were regenerated (now `current`).

Earlier today: `tasks-aed6-231c.md` completed and merged — the Lobby's
live below-minimum warning and laps default now count active (non-kicked)
players, closing the display half of the seam whose logic half landed in
`plan-4663`. Suite green (457 tests). Every tasks file is `completed`.

This was the first `next_step_prompt: auto` chain: `/ardd-plan` →
`/ardd-status` recommended `/ardd-implement` → it auto-ran without a
prompt, and the whole active-player-count story (server, datamodel, and
now client display) is closed.

Earlier this session: the 7 code-vs-artifact defects were fixed and
merged; ArDD updated v1.0.2 → v1.0.3 (beta); `--reconfigure` set
`next_step_prompt: auto` (other three fields `solo` / `eager` / `auto`
kept).

Earlier today: **`tasks-4663-bd86.md` completed and merged —**
`onStartGame` now counts active (non-kicked) players for both the
minimum-player gate and the laps-per-book default. Delegated worktree,
2/2, clean fast-forward, reaped; suite green (454 tests). `datamodel.md`'s
Minimum-player and Laps-per-book rules were corrected to match.

**That fix surfaced a follow-on, now the one open feedback item.** The
T002 datamodel edit describes the Lobby's *live displays* (below-minimum
warning, laps default) as counting active players — but
`Lobby.svelte:40` and `:84` still use raw `players.length`, so a host who
kicks a lobby down sees a display that contradicts what the server will
do. `activePlayers` is already imported in that file (the roster render
uses it), so the fix is small. Filed as
`feedback-lobby-active-count-display-9e7d.md`.

Earlier this session: **all 7 code-vs-artifact defects were fixed and
merged to `main`**; prod and beta are both live on the defect-fix build;
CI actions bumped to v5 (Node-20 deprecation gone). Every tasks file is
`completed`; nothing is ready or in flight.

That defect pass — `tasks-25a0-15f7.md`, 10/10 in a delegated worktree —
fixed the kicked-player seam (a shared `activePlayers(room)` helper that
rotation, timeout-vote membership, and roster rendering all read from),
made timer extensions additive (a 30m timer + 15m grant yields 45m, not
15), and recorded the curation cap in `infrastructure.md`'s Production
Annotations. `plan-4663` above then extended the same active-player seam
to `onStartGame`, and its follow-on (the Lobby display) is the one open
feedback item.

**One implementer finding from the defect pass, still worth knowing:**
T003 turned out to be effectively a no-op in live play — `onStartGame`
resolves `lapsPerBook` to a concrete value at game start, so
`computeNextEntry`'s `?? defaultLapsPerBook(...)` null branch never fires
mid-game. It is T002's `activeCount * laps` completion count — not the lap
default — that actually un-strands a restarted room's books. (The other
finding from that pass, the `onStartGame` lap default counting the full
roster, is no longer latent: it was the `plan-4663` work above, now
fixed.)

Prod is deployed; the `/ardd-defects` pass that produced the seven
defects is described below.

Since the last update: both tasks files merged, `main` was pushed (beta
deployed green, `check:fly` passing in CI for the first time), and the
promote workflow was **dispatched successfully** — `release`
fast-forwarded to `96eb2ef` and prod deployed in 42s, healthy. That run
also confirmed the design premise empirically: the push to `release`
triggered **no** CI run, which is exactly why the deploy had to live
inside `promote.yml` rather than react to the push.

Prod had been 105 commits behind, so this shipped several sessions at
once — the curated phrase bank and its durable storage, the salon UI
redesign, moderation controls, help-text work, generated Fly configs.
It is the **first prod deploy that mounts the volume**, so curation data
now persists there.

**The defects pass is the headline.** Three of its seven findings are one
seam, not three bugs: `Player.kicked` is honored where a kicked player is
a *source* of work (book origins, prompt dealing) and ignored where they
are a *recipient* of it (turn rotation, timeout-vote membership, roster
rendering). Two stand out — **restart-game does not actually restore a
frozen room's continuability**, and the **curation store silently drops
every rating past 65,536** with no Production Annotation in any artifact.
One finding needs a product decision rather than a doc fix: timer
extensions *replace* the base duration instead of adding to it, so
granting "15 minutes" on a 30-minute timer moves the deadline *earlier*.

Earlier this pass: **both `ready` tasks files were implemented and
merged to `main`.** `/ardd-implement` fanned out to two parallel worktree
subagents — `tasks-help-text-accuracy-9755.md` (13/13) and
`tasks-fly-config-lockstep-dac2.md` (14/14) — and both merged clean
(help-text fast-forward, fly-config a clean merge commit) and were
reaped. `fly-config-lockstep` and `release-promotion-workflow` flipped
`tasked` -> `implemented`. **Every tasks file in the project is now
`completed`.**

The `shared-artifact` verdict on the pair proved benign: the only shared
file was `App.test.ts`, and the fly-config change there was a pure
append.

**Two follow-ups came out of implementation. The first is now resolved,
by a design change rather than by documenting what was there:**

1. **~~PAT required~~ — promotion now deploys prod itself.** As
   implemented, `promote.yml` only fast-forwarded `release` and relied on
   a push-triggered `deploy-prod` job to fire. Since a `GITHUB_TOKEN`
   push does not trigger further workflows, that needed a hand-created
   fine-grained PAT (`PROMOTE_TOKEN`) to work at all — a new manual
   operational step, a credential with an expiry, tied to one person's
   account.

   **The user rejected the PAT and chose the simpler shape:** one manual
   dispatch that fast-forwards `release` **and** deploys, authenticated
   with the `FLY_API_TOKEN_PROD` that already exists. `deploy-prod` is
   removed and `release` dropped out of `ci.yml`'s push triggers (with
   `checks` already skipped there, every job in such a run was skipped).
   **Promotion is now the only path that deploys production**, which is
   worth internalizing: `release` moving is no longer evidence that prod
   was deployed — the dispatch run is. `infrastructure.md` records this.

   Nothing is outstanding here anymore. No secret to create.
2. **The root test suite was not wired into `pnpm run test`.** Without
   it, `scripts/**` tests would never run in pre-commit or CI and would
   have read as green by never executing. A scoped root `vitest.config.ts`
   and a `test:root` step were added beyond the task text. Note this
   introduced a root `vitest` devDependency — a `pnpm install` is needed
   after pulling, or `test:root` fails with `vitest: command not found`
   (hit and resolved during the post-merge verification).

Verified post-merge on `main`: full suite green (426 client/server/shared
+ 4 root), lint and typecheck clean.

`curation-data-aggregation-pipe` remains the only backlogged feature and
still routes to `/ardd-research`, not `/ardd-plan` — its stated purpose
is the prompt-injection boundary for untrusted player text and its shape
is undecided. Worth noting for whoever takes it: the curation fold
already exists (`aggregateEvents`, `curationStore.ts:127`, plus a reading
`aggregate()` at L308) and has **no caller at all** — the curator cannot
currently read the data. That is a smaller gap than the feature implies,
and separable from the sanitization design.)_

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

- datamodel.md — current ✅ (regenerated 2026-07-21 — ER now carries the
  curated-prompt/moderation `Room` fields and the persisted
  RatingEvent/PromptRating/CandidatePhrase entities)
- infrastructure.md — current ✅ (regenerated 2026-07-21 —
  single-process + curation-volume + Fly dual-channel topology)
- ui.md — current ✅ (regenerated 2026-07-21 — actual `App.svelte`
  routing and shared-component tree)

_(All three rendered into `README.md`. Not machine-validated — headless
Chrome isn't available in this environment — but GitHub renders the
fences natively; worth a glance at the rendered README.)_

## Code-vs-Artifact Defects

**1 defect** as of 2026-07-21, from a fresh four-artifact survey — see
`.project/DEFECTS.md`. The seven prior entries were all re-verified as
fixed (`plan-25a0` / `plan-4663` / `plan-aed6`) and dropped out on the
regeneration.

- `datamodel.md` — 1, **broken-contract** (`d27f4eea`): `onSubmitEntry`'s
  `book-complete` guard (`book.entries.length >= room.players.length`,
  `handlers.ts` ~L640) is laps-unaware and runs *ahead* of the correct
  laps-aware `computeNextEntry`. So a book can never advance past one
  rotation via the submission path — and since `defaultLapsPerBook` is 2
  for <5-player games, the **default small game is affected**: a 3-player
  game blocks at the start of lap 2. Shipped undetected because every
  full-game test pins `lapsPerBook = 1` and the `book-complete` unit test
  uses a 1-player room; the laps logic is unit-tested only in isolation.
  **Now planned + tasked** in `plan-2b0f-2026-07-21-48cc.md` /
  `tasks-2b0f-effb.md` (`ready`, 0/3) — extracts a shared `isBookComplete`
  helper. Stays in `DEFECTS.md` until a `/ardd-defects` run after the fix
  re-verifies it gone.
- `infrastructure.md`, `ui.md`, `constitution.md` — all clean this run.

Two items were deliberately **not** recorded as defects (see `DEFECTS.md`
"Not defects — routed elsewhere"): the Reveal play-again readiness count
uses the raw roster (a kicked-during-reveal player inflates the
denominator, but `ui.md` doesn't specify active-only there, so no
contract is violated — a candidate `/ardd-feedback` if the consistency is
wanted), and a stale "8-color" palette code comment.

## Feedback

**0 open feedback files.**

- `feedback-lobby-active-count-display-9e7d.md` (F001, Bug) is **fixed and
  merged** via `plan-aed6-2026-07-21-2a6e.md` / `tasks-aed6-231c.md`
  (**completed 2/2**): the Lobby's live below-minimum warning and laps
  default now count active players, and `ui.md`'s Lobby wording matches
  `datamodel.md`.

_History below (all prior items resolved):_

- `feedback-lap-default-kicked-players-8005.md` (F001, Bug) — the
  `onStartGame` lap default (and, by user decision, the sibling
  minimum-player gate) counting the full roster — is **fixed and merged**
  via `plan-4663-2026-07-20-2b90.md` / `tasks-4663-bd86.md` (**completed
  2/2**). Both `onStartGame` reads now route through `activePlayers`.

- `feedback-main-338d.md` (F001: host gets no frozen-room signal after a
  kick, a regression from the Salon Footer refactor) is now **planned**
  via `plan-fly-config-lockstep-2026-07-20-8fbb.md` (Phase 1,
  T001–T004). The fix is the **gavel carrying the indication**, not
  un-suppressing the host's page-body notice — `ui.md`'s Moderation
  Panel section now states that outright rather than calling the gavel
  "the natural place."
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

1 backlogged · 14 implemented · 1 subsumed — see `.project/features/`.

- `fly-config-lockstep` (**implemented**) and `release-promotion-workflow`
  (**implemented**) — both bound to
  `plan-fly-config-lockstep-2026-07-20-8fbb.md` /
  `tasks-fly-config-lockstep-dac2.md` (**completed**, 14/14), delegated to
  a worktree subagent and merged. Planned together because they're
  ordered, not merely related: the promotion workflow operates on a
  deploy surface config-generation defines, so generation lands first.
  Both `fly.toml` and `fly.staging.toml` are now **generated** from
  `scripts/fly-config/fly.template.toml` — drift is unexpressible rather
  than merely detected — with `app` the single per-channel key, guarded by
  an allowlist assertion. The regeneration diff was verified
  comment-only, parsed values matching the pre-change oracle exactly.
  `promote.yml` was subsequently reworked to deploy prod itself rather
  than depend on a PAT-authenticated push — see the entry at the top of
  this file.
- `curation-data-aggregation-pipe` (**still backlogged**) — the
  deterministic layer where prompt-injection defense belongs, before any
  agent reads player-written text. Selected for this plan and then
  deliberately excluded: shape undecided, and it's a security boundary.
  **Next step for it is `/ardd-research`, not `/ardd-plan`.**

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

- `tasks-2b0f-effb.md` — plan `plan-2b0f-2026-07-21-48cc.md`, no bound
  features (**ready**, 0/3). The only `ready` file, so the matrix is
  silent. Single phase, all tasks tagged `[defect: d27f4eea]`.

Calibration point, still worth remembering: the last fanned-out pair's
`shared-artifact` verdict turned out benign — they were fanned out in
parallel anyway, and the only file both touched was `App.test.ts`, a pure
append. `shared-artifact` is a declared-overlap signal on artifact tags,
not evidence of code-path contact.

## In Flight

_(none — both delegated worktrees reported back, merged, and were
reaped)_

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

**Current state (2026-07-20, latest pass):** Safe to plan: **yes**.
Nothing left to implement — **all 22 tasks files are `completed`** and
nothing is in flight. Artifacts all `stable`, 0 open questions, 0 open
feedback files. One feature stays backlogged
(`curation-data-aggregation-pipe`), routed to `/ardd-research` rather
than a plan.

**Promotion works and has been exercised.** `release` is at `96eb2ef`,
identical to `main` at the time of the cut; prod is live and healthy at
https://ex-tel.ty-pe.com/. Re-dispatching is harmless (no-op push, same
tree re-shipped).

**Local commits are ahead of `origin/main`** — the ci.yml guard removal,
the artifact correction, and the regenerated `DEFECTS.md`. None affect
runtime; the next push carries them to beta.

**ArDD is up-to-date** on the beta channel — `v1.0.3`, commit `0fc43f6`
(updated 2026-07-21 from `v1.0.2`/`33ac9ae`). No migrations were pending;
all eight were already applied. `install.sh` also rewrote `Source-Path`
to the portable `~/` form and added `.project/README.md` (a reviewer
guide). One standing note it reprinted: the old absolute source path
remains in git history — this repo is public, so per the tool's own
recommendation that's accepted, not worth a history rewrite.

**All three of the help-text plan's open questions were settled during
implementation**, each as a decision task whose output a later task
consumed: the rating explanation lives **inline at the control** (not in
the rules panel), each host setting got **its own** tooltip rather than a
shared cluster, and the rules panel covers what changes a game's *shape*
(laps, curated mode, timers) while rating stays out to avoid a second
drifting copy.

**Not yet pushed.** `main` is well ahead of `origin/main` — the defect
fixes, the ci.yml guard removal, and the regenerated reports. Pushing
auto-deploys **beta**; prod is already current as of the last promotion
(the defect fixes are not on prod until the next `/ardd-plan`-free
promote dispatch).

Carried forward, none blocking:
- All three renderable artifacts are `stale` on diagrams — `datamodel`
  and `infrastructure` gained real changes this pass (active-player
  rotation, additive timer formula, the curation annotation).
- No client-side `maxlength` on the phrase input; oversize content is
  caught only server-side (`entry-too-large`) and whether the client
  surfaces that gracefully is unverified.
- **Flaky server test** — `server.test.ts > onStartGame rejects a
  non-host caller`, intermittent connect timeout. Predates this
  session's work; cost a pre-commit-hook retry this pass. Worth a fix on
  its own at some point.

**Current state:** `origin/main` and `release` are on an earlier build
(beta and prod live and healthy on it). Local `main` is well ahead —
the `onStartGame` active-count fix, the Lobby-display fix, the regenerated
diagrams, the defects pass, and now the `plan-2b0f` plan/tasks — **not
yet pushed**, so none of that is on beta or prod.

**Recommended next step:** `/ardd-implement` — execute
`tasks-2b0f-effb.md` (0/3), the laps `book-complete` fix. Small,
single-phase, test-first. `next_step_prompt: auto` is set and this is a
runnable `/ardd-*` command, so it is being **auto-run** (delegated to a
background worktree).

Also outstanding, not blocking: the unpushed local commits (push to
deploy to beta, then promote for prod). One backlogged feature
(`curation-data-aggregation-pipe`, routed to `/ardd-research`). Diagrams
all `current`.

Then, in no particular order: `/ardd-research` for
`curation-data-aggregation-pipe`'s sanitization boundary. The
`handlers.ts:160` lap-default
finding (see header) is a candidate `/ardd-feedback` note.

One standing suggestion from the ArDD reinstall, not yet acted on: the
README's ArDD badge tracks ArDD's *latest release* rather than the
version installed here, so it can read green while this project sits a
release behind. Fixing it means swapping the badge inside its markers for
the shields.io endpoint form pointing at this repo's own
`.github/badges/ardd-version.json` (written by re-running install with
`ARDD_VERSION_BADGE=1`). Left alone — it's cosmetic and yours to decide.

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
