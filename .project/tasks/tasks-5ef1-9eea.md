---
plan: plan-5ef1-2026-07-17-9e40.md
generated: 2026-07-17
status: in-progress
---

# Tasks

## Phase 1: Confirmed-root-cause fixes (F1, F2)

- [x] T001 [artifacts: ui] Write a failing test in
  `client/src/lib/views/WritingDrawing.svelte`'s test file reproducing
  F1: render the component for "player B" whose `myTurn` is assigned and
  who has typed a partial phrase (or drawn partial strokes) into local
  draft state, then simulate an incoming room-state update in which
  player B's `myTurn` is unchanged in identity (same `bookId`+`position`)
  but the object reference differs (e.g. because another player, "player
  A", submitted their own entry elsewhere in the room). Assert player B's
  `textValue`/`drawnOps` are still intact after that update — this test
  should fail against current code, which clears them.
  `[feedback: feedback-main-3ea6.md F001]`
- [x] T002 [artifacts: ui] Fix the draft-reset reactive statement in
  `client/src/lib/views/WritingDrawing.svelte` (currently `$: if (myTurn)
  { textValue = ''; drawnOps = []; }` around line 51-54). Track the
  previous turn's identity (`bookId` + `position`) in a local variable
  and only clear `textValue`/`drawnOps` when the *identity* of the
  assigned turn changes (i.e. a genuinely new turn was assigned to this
  player), not merely when `myTurn`'s object reference changes due to an
  unrelated room broadcast. Make T001 pass.
  `[feedback: feedback-main-3ea6.md F001]`
- [x] T003 [artifacts: ui] [parallel] Write a failing test in
  `client/src/lib/components/DrawingCanvas.svelte`'s test file
  reproducing F2: mount the canvas, select a non-default color and/or
  width, dispatch `pointerdown` then a `pointermove` (without a
  `pointerup`), and assert the canvas context's `strokeStyle`/`lineWidth`
  (or the rendered segment, if that's what's inspectable in the test
  environment) already reflects the newly-selected color/width during
  this in-progress stroke — not the previous stroke's values. This test
  should fail against current code, which only updates `ctx` on
  `redrawAll()` after the stroke's `onOpsChange` fires.
  `[feedback: feedback-main-6d3d.md F001]`
- [x] T004 [artifacts: ui] [parallel] Fix
  `client/src/lib/components/DrawingCanvas.svelte`'s `handlePointerDown`
  to set `ctx.strokeStyle = effectiveColor` and `ctx.lineWidth =
  activeWidth` before starting the new stroke (`currentStroke =
  [toPoint(event)]`), so a stroke drawn live always uses the
  currently-selected color/width from its first segment onward, not just
  after it's finalized into an op. Make T003 pass.
  `[feedback: feedback-main-6d3d.md F001]`

## Phase 2: Reproduce-then-fix (F3, F4)

- [ ] T005 [artifacts: ui] STOPPED — reproduced live but root cause is
  architectural, not a small local bug; escalating rather than
  unilaterally fixing. Using `claude-in-chrome` against a real running
  server (3 isolated tabs, localStorage cleared before joining, host +
  2 non-host, played a full 3-player game to `status: reveal`), the
  exact reported symptom reproduced: at reveal onset all 3 clients
  showed byte-identical state (same book, cover shown, 0 entries
  revealed — confirmed via a same-batch simultaneous read across all 3
  tabs), so there is no server/socket divergence and no `isHost`
  branching exists anywhere in `Reveal.svelte`'s timer path (`isHost`
  only swaps button labels/labels, per static reading). But over the
  ~30s animated sequence, the host's tab reliably raced ahead — reaching
  the static "show everything" full-grid end state while the two
  non-host tabs were still mid-animation on an earlier book (confirmed
  twice, once via polled screenshots, once via a same-batch read of
  `document.querySelectorAll('h2').length` — host=3 books/grid,
  non-host=1 book/animated — while all three read `hasFocus: false` at
  the same instant, ruling out simple document-visibility throttling as
  the sole explanation).

  Root cause: `Reveal.svelte`'s `startCoverDelay`/`startTickInterval`
  (lines ~56-66) run a **plain client-local `setTimeout`/`setInterval`
  seeded from that client's own `onMount`**, with no shared clock — each
  socket's animation timeline is entirely independent, derived from
  when *that* browser mounted the component, not from anything the
  server broadcasts. Any skew between clients (tab backgrounding,
  scheduler jitter, or simply the accumulated JS-timer drift Chrome
  permits) compounds unrecoverably over the 3-book sequence, since nothing
  ever resyncs one client's `currentBookIndex`/`revealedCount` to
  another's or to a server-side reference point. This matches the
  reported symptom exactly and is a real bug, not a testing-rig fluke —
  but it is a **timer-per-client design gap**, not a one-line fix: a
  correct fix means the server stamping something like a
  `Room.revealStartedAt` timestamp when `status` flips to `reveal`, and
  `Reveal.svelte` deriving `currentBookIndex`/`revealedCount` as a pure
  function of `now - revealStartedAt` (a shared clock) instead of
  incrementing local counters on local ticks. That is a new `Room`
  field — a decision belonging in `datamodel.md`, which I'm not
  authorized to add unilaterally (constitution: don't modify
  `.project/artifacts/*.md` during implementation; stop and report if an
  artifact decision looks incomplete/wrong instead of editing it
  myself). Per this task's own escape hatch and that rule, stopping here
  rather than inventing the schema change. Left unchecked, tasks file
  left `in-progress`. **Ask the user**: should a follow-up
  `/ardd-refine datamodel` (or a new plan) add a server-synchronized
  reveal clock, given this is a real, reproducible bug? `[feedback:
  feedback-main-4258.md F001]`
- [ ] T006 [artifacts: ui] STOPPED — does not reproduce; kick works
  correctly in live testing. Using the same live 3-tab session (host +
  2 non-host, real server), tested the exact reported flow — as host,
  opened the Moderation Panel and clicked "Kick" on a non-host player —
  in **both** `status: writing` and `status: reveal`, twice
  independently. In both phases: `kickPlayer` fired, the ack/broadcast
  round-tripped, the target's row immediately showed struck-through
  with a disabled "Kicked" button in the host's panel, and (in the
  `writing` case) the room-wide "this game can't continue" notice
  appeared correctly on the kicked-adjacent non-host's own screen too
  (confirmed via screenshot on that player's own tab), matching
  `ui.md`'s Moderation Panel spec precisely. This directly contradicts
  the reported symptom ("the kick control... does nothing... target
  player is not kicked") — the control visibly does exactly what it
  should, both times tested. No code path exists where kick could
  silently no-op (traced `ModerationPanel.svelte` → `session.kickPlayer`
  → socket ack, all wired straightforwardly, matching `DEFECTS.md`'s
  prior finding that the kick handler and its tests were already clean).
  Per this task's escape hatch, stopping rather than inventing a fix for
  a non-reproducing issue. Left unchecked, tasks file left
  `in-progress`. **Ask the user**: is there a specific
  browser/device/reproduction path for F4 not covered here (e.g. the
  *kicked player's own* client shows no notice or ejection when kicked
  mid-`reveal` — observed as a real gap, but arguably in-spec since
  `ui.md` only documents the writing-phase `nonContinuable` notice, not
  a reveal-phase one) — or should `feedback-main-e2ff.md` be closed as
  not reproducing? `[feedback: feedback-main-e2ff.md F001]`

## Phase 3: Verification

- [ ] T007 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run
  test` across the whole workspace (shared/server/client) and confirm
  everything passes. Then manually smoke-test all four fixes live via
  the `/run` pattern with 3 real isolated player sessions: (1) submit a
  phrase as one player while another player has unsubmitted draft text —
  confirm it survives; (2) mid-stroke, change color/width and confirm
  the live line updates immediately; (3) play a full game through to
  Reveal and confirm the host sees the animated book replays same as
  non-host players; (4) as host, kick a non-host player and confirm they
  are actually marked kicked (struck-through in the roster) for
  everyone. Report results.
