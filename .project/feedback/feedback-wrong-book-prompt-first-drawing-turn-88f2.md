---
status: planned
created: 2026-07-30
plan: plan-seat-order-turn-assignment-2026-07-30-69ea.md
---

# Feedback

## Bugs
- [x] F001 A player, on their first drawing turn, saw a prompt (the phrase to illustrate) that belonged to a *different* book than the one they were drawing for. The displayed prompt is `previousEntry = myBook.entries[myTurn.position - 1]` where `myBook = books.find(b => b.id === myTurn.bookId)` (`client/src/lib/views/WritingDrawing.svelte`), so the book+phrase shown come straight from the server-assigned `myTurn` — meaning the *assignment* handed the player the wrong book/position, not a display slip. This is very likely the **same root cause** as `feedback-turn-ordering-fixed-rotation-f1a4.md` (the fixed seat-to-seat rotation being disturbed): `computeNextEntry` (`shared/src/turnAdvancement.ts`) computes `authorIndex = (originIndex + position) % activeCount` over `activePlayers`, so if `Room.players` seat order shifts mid-game (reconnect/`onRejoin` re-appending a player is the prime suspect), a player gets assigned a book/position that isn't the one their seat should hold — surfacing here as "a prompt from a different book." Plan should treat this and f1a4 together; verify with a multi-player + reconnect repro, and check `myTurn`/`myBook` reactivity in WritingDrawing isn't compounding it with a stale value. [artifacts: ui, datamodel]

  > **Cause correction (plan-seat-order-turn-assignment, 2026-07-30) — factual only.** The cited prime suspect, `onRejoin` re-appending a player and shifting the seat order, was investigated and disproved: `onRejoin` (`server/src/socket/handlers.ts`) finds the player in place by id and sets `connected = true`, never re-appending, and no mid-game path reorders `room.players`. On the client, `myTurn`/`myBook`/`previousEntry` all derive from one `state.room` snapshot, so the displayed prompt is always the assigned book's or none — a foreign-book prompt is structurally impossible short of a wrong server assignment, which requires seat-order drift that does not occur. Real-socket and component repros (including out-of-order/stale and torn-room updates) did not reproduce the symptom. This corrects the guessed cause only; the observed-behavior report and its resolution are unchanged.
</content>
