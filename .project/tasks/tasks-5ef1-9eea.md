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

## Phase 2: Resolved decisions (F3, F4) — datamodel/ui refined 2026-07-17

Both tasks below were originally stopped pending user decisions (see
git history for the full investigation notes). Both decisions are now
made and recorded in `.project/artifacts/datamodel.md` and
`.project/artifacts/ui.md` (refined 2026-07-17). Load both artifacts
before starting either task.

- [ ] T005 [artifacts: datamodel, ui] **Reveal pacing: server-synchronized
  clock.** Confirmed root cause: `Reveal.svelte`'s `startCoverDelay`/
  `startTickInterval` run a plain client-local `setTimeout`/
  `setInterval` per socket with no shared clock, so timer drift between
  clients compounds over a multi-book sequence (the host's tab reliably
  raced ahead of non-host tabs to the static end state). Per the now-
  refined `datamodel.md` (Room table + Normalization Rules — Reveal
  pacing) and `ui.md` (Reveal View): add `Room.revealStartedAt:
  timestamp | null` to the shared `Room` type
  (`shared/src/types.ts`), stamp it server-side in `onSubmitEntry`
  (`server/src/socket/handlers.ts`) at the exact point `room.status` is
  set to `'reveal'`. In `Reveal.svelte`, replace the local
  `currentBookIndex`/`revealedCount` counters (currently driven by
  `setTimeout`/`setInterval` ticks) with values derived as a pure
  function of `Date.now() - room.revealStartedAt` against the existing
  cadence constants (`COVER_DELAY_MS`, `TICK_MS`, `ENTRIES_PER_TICK`) —
  a `setInterval` can still drive periodic re-computation/re-render, but
  the *position* must be computed from the shared clock, not
  incremented locally. Manual previous/next/skip controls continue to
  work by overriding the clock-derived position locally (per `ui.md`).
  Write a test first (server-side: `onSubmitEntry` stamps
  `revealStartedAt` when `status` flips to `reveal`; client-side:
  `Reveal.svelte` computes the same book/entry position from a given
  `revealStartedAt` + elapsed time, independent of when the component
  mounted) per this project's test-first paradigm, confirm it fails,
  then implement. `[feedback: feedback-main-4258.md F001]`
- [ ] T006 [artifacts: datamodel, ui] **Kicked player's own client is
  ejected from the game.** Confirmed root cause: nothing in the client
  reacts to a player's own `kicked` flag — `player.kicked` is referenced
  only in `ModerationPanel.svelte` (the host's own display), so a kicked
  player's own browser keeps rendering its normal view indefinitely. Per
  the now-refined `datamodel.md` (Moderation Normalization Rules) and
  `ui.md` (new **Kicked** state): when a client's own player record
  (found via matching `state.player.id` against the incoming
  `room.players`) shows `kicked: true`, the app must render a distinct
  terminal state — "You were removed from this game by the host" plus a
  "Return to home" control (same client-local reset as `Ended`/"Leave
  game") — instead of the normal Lobby/WritingDrawing/Reveal view for
  that `Room.status`. This is a routing-level change (likely in
  `App.svelte`, alongside its existing `state.room.status` branches, or
  in the shared session store if that's a better fit — use your
  judgment for where the check belongs, consistent with Principle VI).
  Write a failing test first reproducing this (a kicked player's client
  should show the new Kicked state, not its normal view, regardless of
  `Room.status`), then implement. `[feedback: feedback-main-e2ff.md
  F001]`
- [ ] T007 [artifacts: ui] **Kicked players removed entirely from the
  visible roster (reversing the prior struck-through treatment).**
  Confirmed via user testing that the host's roster view did not
  reflect kicks as expected. Per the now-refined `ui.md` (Moderation
  Panel): `ModerationPanel.svelte`'s player list must filter out any
  `player.kicked === true` entries entirely (`room.players.filter(p =>
  !p.kicked)`) rather than rendering them struck-through with a disabled
  "Kicked" button as it does now. The underlying `Player` record and
  `Room.players` array are untouched server-side (per `datamodel.md` —
  needed so already-authored entries in Reveal still resolve to a real
  author name via `playerName()` lookups elsewhere in the client); this
  is a display-only filter in the roster list. Write a failing test
  first (a kicked player should not appear in `ModerationPanel`'s
  rendered list at all), then implement. `[feedback:
  feedback-main-e2ff.md F001]`

## Phase 3: Verification

- [ ] T008 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run
  test` across the whole workspace (shared/server/client) and confirm
  everything passes. Then manually smoke-test all fixes live via the
  `/run` pattern with 3 real isolated player sessions: (1) submit a
  phrase as one player while another player has unsubmitted draft text —
  confirm it survives; (2) mid-stroke, change color/width and confirm
  the live line updates immediately; (3) play a full game through to
  Reveal and confirm all 3 clients advance through books/entries in
  lockstep (same book, same revealed-entry count, at the same time),
  not just the host; (4) as host, kick a non-host player and confirm:
  the kicked player disappears entirely from the host's roster, the
  kicked player's own browser immediately shows the new "You were
  removed" state, and (if kicked during `writing`) the "can't continue"
  notice still appears for remaining players. Report results.
