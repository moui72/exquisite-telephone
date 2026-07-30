---
status: planned
created: 2026-07-30
plan: plan-seat-order-turn-assignment-2026-07-30-69ea.md
---

# Feedback

## Bugs
- [x] F001 Turn ordering appears wrong in play: books should pass in a fixed order, as if players were seated at a table and always passing to the left (a stable round-robin), but the observed behavior looked off. Note the *intended* design already matches this expectation — datamodel.md Normalization Rules — Author rotation specifies `authorIndex = (originIndex + position) % activeCount` over `activePlayers(room)` (join order), and `computeNextEntry` (`shared/src/turnAdvancement.ts`) implements exactly that fixed left-passing rotation. So the formula itself is not the likely culprit; the plan should investigate whether the *runtime order* of `Room.players` (which `activePlayers` preserves) is being disturbed mid-game — e.g. reconnect/rejoin (`onRejoin` in `server/src/socket/handlers.ts`) or any path that re-appends or reorders a player rather than keeping their original seat would shift every book's `originIndex`/`authorIndex` and break the fixed rotation. Verify against a concrete multi-player + reconnect repro; the fix (if real) is preserving seat order, not changing the rotation formula. [artifacts: datamodel]

  > **Cause correction (plan-seat-order-turn-assignment, 2026-07-30) — factual only.** The cited prime suspect, `onRejoin` (`server/src/socket/handlers.ts`) re-appending or reordering a player, was investigated and disproved: `onRejoin` finds the player in place by id and sets `connected = true`, and no mid-game path mutates `room.players` order (only `find`/`filter`; `push` is lobby-join only). Under real-socket multi-player + reconnect repro (single, concurrent, and kick-interleaved), seat order stayed stable and the symptom could not be reproduced. This corrects the guessed cause only; the observed-behavior report and its resolution are unchanged.
</content>
