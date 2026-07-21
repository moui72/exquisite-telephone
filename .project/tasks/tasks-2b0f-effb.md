---
plan: plan-2b0f-2026-07-21-48cc.md
generated: 2026-07-21
status: ready
---

# Tasks

## Phase 1: single-source book completion

- [ ] T001 Add `isBookComplete(room: Room, book: Book): boolean` to `shared/src/turnAdvancement.ts`, exported from the shared package, computing `activeCount === 0 || book.entries.length >= activeCount * laps` — resolving `activeCount = activePlayers(room).length` and `laps = room.lapsPerBook ?? defaultLapsPerBook(activeCount)` exactly as `computeNextEntry` already does. Refactor `computeNextEntry`'s first completion null-branch (currently `if (activeCount === 0 || position >= activeCount * laps) return null;`) to call `isBookComplete(room, book)` so the condition has one definition. Do NOT change the round-gating branch (`position > currentRoundFor(room)`) or the kicked-origin branch (`originIndex === -1`). [defect: d27f4eea] [artifacts: datamodel]
- [ ] T002 In `server/src/socket/handlers.ts` `onSubmitEntry`, replace the guard `if (book.entries.length >= room.players.length) { ack({ error: 'book-complete' }); return; }` with `if (isBookComplete(room, book)) { ack({ error: 'book-complete' }); return; }` (importing `isBookComplete` from `@exquisite-telephone/shared`). This preserves the distinct `book-complete` ack while making it laps- and active-count-aware. [defect: d27f4eea]
- [ ] T003 Tests (test-first per constitution Principle III), added to `shared/src/turnAdvancement.test.ts` and `server/src/socket/handlers.test.ts`: (a) unit — `isBookComplete` is false at `position = activeCount*laps - 1`, true at `activeCount*laps`, and true when `activeCount === 0`; (b) unit — a book at `entries.length === players.length` in a `lapsPerBook`-2 room is NOT complete (the regression the old guard caused); (c) handler — a 3-player game with `lapsPerBook` resolved to 2 accepts the first lap-2 submission (no `book-complete`) and only returns `book-complete` after `players.length * 2` entries; (d) handler — a `lapsPerBook = 1` game still returns `book-complete` after one full rotation (regression guard). Write the failing tests first, confirm red, then land T001/T002. If a red state must be committed, use Vitest's `test.fails` marker, removed on the implementing commit. [defect: d27f4eea]
