---
status: approved
branch: reveal-defects
created: 2026-07-14
features: []
surfaced-defects: [f333f65c, aff300d1]
---

# Plan: Fix two Reveal-page defects (status guards, save-in-animated-mode)

## Goal

Make `onEndGame` and `onVoteToPlayAgain` actually enforce the
`status === 'reveal'` restriction `datamodel.md` already claims for
all three end-of-game actions, and add the PNG save control to the
Reveal page's animated mode so `ui.md`'s "available in both modes"
claim becomes true.

## Scope

**In:**
- `onEndGame` rejects with `room-not-in-reveal` outside `status ===
  'reveal'` (matching `onPlayAgain`'s existing guard shape)
- `onVoteToPlayAgain` rejects with the same error outside `reveal`
- A save-as-PNG button in `Reveal.svelte`'s animated-mode book section,
  reusing the existing `handleSave` function

**Out:**
- The third open defect (missing performance budgets,
  `17a7ea0a`) — already declined in `plan-4401-2026-07-14-7cf3.md`,
  not re-offered here (unaffected by this plan's scope)

## Technical Approach

No artifact changes needed — both fixes make the code match claims
`datamodel.md`/`ui.md` already state; this is purely a code-fix plan.

`onEndGame` (`server/src/socket/handlers.ts`) gains the same guard
shape `onPlayAgain` already uses: `if (room.status !== 'reveal') {
ack({ error: 'room-not-in-reveal' }); return; }`, placed after the
existing `not-host` check. `onVoteToPlayAgain` gets the identical
guard. Both are tested in `server/src/socket/handlers.test.ts`
(`onVoteToPlayAgain` already has a `describe` block there to extend;
`onEndGame`'s existing coverage lives in `server/src/socket/server.test.ts`'s
integration style — add the new case there to match).

`Reveal.svelte`'s animated-mode section (`{#if !showEverything &&
currentBook}`) gains a "Save as PNG" button next to the book title,
calling the same `handleSave(currentBook.id)` already used in the
show-everything section — no new export logic, just exposing the
existing control in the other render branch.

## Phase Breakdown

### Phase 1: Status guards (independent of Phase 2)
- [ ] T001 [defect: f333f65c] In `server/src/socket/server.test.ts`, write a failing test asserting `onEndGame` rejects with `{ error: 'room-not-in-reveal' }` when the host calls `endGame` while `Room.status` is `lobby` or `writing` (extend the existing `onEndGame` integration test coverage there). Confirm failure, then add the `status === 'reveal'` guard to `onEndGame` in `server/src/socket/handlers.ts`, placed after the existing host-only check, before the `room.status = 'ended'` assignment.
- [ ] T002 [defect: f333f65c] [parallel] In `server/src/socket/handlers.test.ts`'s existing `describe('onVoteToPlayAgain', ...)` block, write a failing test asserting it rejects with `{ error: 'room-not-in-reveal' }` when called while `Room.status` is `lobby` or `writing`, and does not modify `Room.playAgainVotes`. Confirm failure, then add the same guard to `onVoteToPlayAgain` in `server/src/socket/handlers.ts`.

### Phase 2: Save control in animated mode (independent of Phase 1)
- [ ] T003 [defect: aff300d1] [artifacts: ui] [parallel] In `client/src/lib/views/Reveal.test.ts`, write a failing test asserting a "Save as PNG" button is present and clickable while the animated (non-`showEverything`) mode is active, calling the same export path already covered by the show-everything mode's existing save test. Confirm failure, then add the button to the animated-mode book section in `Reveal.svelte`, calling `handleSave(currentBook.id)`.

## Open Questions

_(none)_
