---
status: planned
created: 2026-07-30
plan: plan-seat-order-turn-assignment-2026-07-30-69ea.md
---

# Feedback

## Bugs
- [x] F001 A player, on their first drawing turn, saw a prompt (the phrase to illustrate) that belonged to a *different* book than the one they were drawing for. The displayed prompt is `previousEntry = myBook.entries[myTurn.position - 1]` where `myBook = books.find(b => b.id === myTurn.bookId)` (`client/src/lib/views/WritingDrawing.svelte`), so the book+phrase shown come straight from the server-assigned `myTurn` — meaning the *assignment* handed the player the wrong book/position, not a display slip. This is very likely the **same root cause** as `feedback-turn-ordering-fixed-rotation-f1a4.md` (the fixed seat-to-seat rotation being disturbed): `computeNextEntry` (`shared/src/turnAdvancement.ts`) computes `authorIndex = (originIndex + position) % activeCount` over `activePlayers`, so if `Room.players` seat order shifts mid-game (reconnect/`onRejoin` re-appending a player is the prime suspect), a player gets assigned a book/position that isn't the one their seat should hold — surfacing here as "a prompt from a different book." Plan should treat this and f1a4 together; verify with a multi-player + reconnect repro, and check `myTurn`/`myBook` reactivity in WritingDrawing isn't compounding it with a stale value. [artifacts: ui, datamodel]
</content>
