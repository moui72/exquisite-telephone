---
plan: plan-7c63-2026-07-18-f55f.md
generated: 2026-07-18
status: in-progress
---

# Tasks

## Phase 1: Artifact clarifications

- [x] T001 [artifacts: ui] In `ui.md`'s Moderation Panel section,
  clarify that the "this game can't continue" notice is visible to the
  host via the panel only — the page-body broadcast copy (described in
  Writing / Drawing View) is suppressed for the host specifically, to
  avoid showing it twice; non-host players (who never see the panel)
  still see it via the page body. Addresses feedback F001 in
  `.project/feedback/feedback-main-8da5.md`.
- [x] T002 [artifacts: ui] [parallel] In `ui.md`'s States section (Error
  bullet), record that every server error code reaching Lobby's error
  state is translated to docent-voice copy via a mapping (never shown
  raw), with a generic fallback line for any unmapped code. Addresses
  feedback F002 in `.project/feedback/feedback-main-8da5.md`.

## Phase 2: Implementation

- [x] T003 [artifacts: ui] Write a failing test in
  `WritingDrawing.test.ts` asserting the "game can't continue" alert
  does NOT render when the current player is the host (even though
  `Room.nonContinuable` is true), and DOES still render for a non-host
  player under the same condition. Confirm the test fails against
  current behavior, then add the host-exclusion condition to the
  existing `{#if state.room.nonContinuable}` block in
  `WritingDrawing.svelte`. Addresses feedback F001.
- [ ] T004 [artifacts: ui] [parallel] Write failing tests in
  `Lobby.test.ts` asserting: (a) each of `room-not-found`, `not-host`,
  `too-few-players`, `room-not-in-lobby`, `invalid-token`, `game-ended`
  renders its own docent-voice copy (not the raw code string), and (b)
  an unrecognized/unmapped error code renders the generic fallback line
  rather than the raw string. Confirm failures, then implement the
  error-code-to-copy mapping in `Lobby.svelte`. Addresses feedback F002.

## Phase 3: Full-suite verification

- [ ] T005 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run
  test` across the whole workspace; confirm all green with no
  regressions.
