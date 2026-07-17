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

- [ ] T005 [artifacts: ui] Reproduce F3 live: start the server (`/run`
  pattern — build shared, build client, start server), open 3 isolated
  browser sessions (host + 2 non-host players, using the
  clear-localStorage-per-tab approach from this session, or real separate
  profiles if available), play through writing/drawing to the final
  round so the room reaches `status: reveal`, and observe specifically
  what differs between the host's client and a non-host client at that
  point (room state actually received by each socket — check via
  `read_console_messages`/`read_network_requests` or temporary logging;
  `Reveal.svelte`'s `onMount`/`isHost` behavior; component mount
  timing). Once the actual divergence is identified, write a failing
  regression test capturing it (unit test if the cause is
  component-local, e.g. in `Reveal.svelte` or `session.ts`; otherwise
  the most precise test the cause allows), then fix the real cause and
  make the test pass. If reproduction instead shows this was an artifact
  of the cleared-localStorage multi-session testing setup (not a real
  bug), stop, document that finding in this task's line, and ask the
  user how to proceed rather than fixing a non-issue.
  `[feedback: feedback-main-4258.md F001]`
- [ ] T006 [artifacts: ui] Reproduce F4 live: using the same live-session
  setup as T005, as host, open the Moderation Panel and click "kick" on
  a non-host player. Observe where the flow actually breaks: confirm
  `isHost` evaluates `true` for the host's session; confirm the
  `kickPlayer` socket event actually fires (network tab/console); confirm
  the ack arrives and contains the target's `kicked: true`; confirm the
  panel's player list re-renders from updated `room.players`. Once the
  actual break point is identified, write a failing regression test
  capturing it, then fix the real cause and make the test pass. If
  reproduction instead shows this was an artifact of the test session
  setup, stop, document the finding, and ask the user how to proceed
  rather than fixing a non-issue.
  `[feedback: feedback-main-e2ff.md F001]`

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
