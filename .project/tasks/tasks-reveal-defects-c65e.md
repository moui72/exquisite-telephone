---
plan: plan-reveal-defects-2026-07-14-c2bb.md
generated: 2026-07-14
status: in-progress
---

# Tasks

## Phase 1: Status guards

- [x] T001 [defect: f333f65c] In `server/src/socket/server.test.ts`, write a failing test asserting `onEndGame` rejects with `{ error: 'room-not-in-reveal' }` when the host emits `endGame` while `Room.status` is `lobby` or `writing` (extend the existing `onEndGame` integration test coverage there, matching its established real-Socket.IO-server style). Confirm the test fails against current `onEndGame`, then add a `room.status !== 'reveal'` guard (returning `ack({ error: 'room-not-in-reveal' })`) to `onEndGame` in `server/src/socket/handlers.ts`, placed after the existing host-only check and before the `room.status = 'ended'` assignment.
- [x] T002 [defect: f333f65c] [parallel] In `server/src/socket/handlers.test.ts`'s existing `describe('onVoteToPlayAgain', ...)` block, write a failing test asserting `onVoteToPlayAgain` rejects with `{ error: 'room-not-in-reveal' }` when called while `Room.status` is `lobby` or `writing`, and that `Room.playAgainVotes` is unmodified in that case. Confirm the test fails against current `onVoteToPlayAgain`, then add the identical `room.status !== 'reveal'` guard to `onVoteToPlayAgain` in `server/src/socket/handlers.ts`.

## Phase 2: Save control in animated mode

- [ ] T003 [defect: aff300d1] [artifacts: ui] [parallel] In `client/src/lib/views/Reveal.test.ts`, write a failing test asserting a "Save as PNG" button is present in the animated (non-`showEverything`) mode and, when clicked, triggers the same export path already covered by the show-everything mode's existing save test (reuse that test's assertion shape against `exportFn`). Confirm the test fails against current `Reveal.svelte` (no save button renders in animated mode), then add a "Save as PNG" button to the animated-mode book section (the `{#if !showEverything && currentBook}` branch), calling `handleSave(currentBook.id)` — matching the button already present in the show-everything section.
