---
plan: plan-configurable-book-laps-per-gam-2026-07-18-37ca.md
generated: 2026-07-18
status: in-progress
---

# Tasks

## Phase 1: Shared round-math extension

- [x] T001 [artifacts: datamodel] Add `lapsPerBook: number | null` to
  the `Room` type in `shared/src/types.ts`, defaulting to `null` in
  `createRoom` (`server/src/domain/roomStore.ts`) — mirror
  `turnTimerMinutes`'s shape exactly. Write a failing server test in
  `roomStore.test.ts` asserting `createRoom` returns `lapsPerBook: null`
  by default; confirm it fails, then implement.
- [x] T002 [artifacts: datamodel] [parallel] In `shared/src/
  turnAdvancement.ts`, write failing tests in `turnAdvancement.test.ts`
  asserting: (a) `defaultLapsPerBook(4)` returns `2`,
  `defaultLapsPerBook(5)` returns `1`; (b) with `Room.lapsPerBook` set
  to `2`, a book with `players.length === 3` completes (returns `null`
  from `computeNextEntry`) only after 6 entries, not 3, and author
  rotation continues correctly into the second lap (position 3's
  author equals position 0's author, position 4 equals position 1,
  etc.); (c) with `Room.lapsPerBook: null`, the same completion math
  falls back to `defaultLapsPerBook(room.players.length)`. Confirm all
  fail, then implement `defaultLapsPerBook` and update
  `computeNextEntry`'s completion check.

## Phase 2: Server: setter + start-game resolution

- [x] T003 [artifacts: datamodel] Write a failing server test in
  `handlers.test.ts` for a new `onSetLapsPerBook` handler: accepted
  (updates `Room.lapsPerBook` and broadcasts) only when the caller is
  host and `Room.status === 'lobby'`, and only for input `1 | 2 | 3`
  (reject anything else, e.g. with an `invalid-laps-per-book` error);
  rejected with `not-host`/`room-not-in-lobby` otherwise — mirror
  `onSetTurnTimer`'s exact guard shape. Confirm failures, then
  implement `onSetLapsPerBook` in `server/src/socket/handlers.ts` and
  wire a `set_laps_per_book` event to it in
  `server/src/socket/server.ts`'s dispatch table (constitution
  Principle VIII — one named handler per event).
- [ ] T004 [artifacts: datamodel] Write a failing server test in
  `handlers.test.ts` asserting `onStartGame` resolves
  `room.lapsPerBook` to `defaultLapsPerBook(room.players.length)` when
  it was `null` at start time, and leaves an explicitly-host-set value
  untouched. Confirm failure, then implement the resolution in
  `onStartGame`.

## Phase 3: Client: Lobby control

- [ ] T005 [artifacts: ui] Write a failing test in `session.test.ts`
  (or wherever `setTurnTimer`/`setMonochrome` are tested) asserting a
  new `setLapsPerBook` method emits the `set_laps_per_book` event with
  the given value. Confirm failure, then implement in
  `client/src/lib/stores/session.ts`.
- [ ] T006 [artifacts: ui] Write failing tests in `Lobby.test.ts`
  asserting: (a) the laps control shows
  `defaultLapsPerBook(state.room.players.length)` when
  `Room.lapsPerBook` is `null`, and that this value changes as the test
  varies the player count; (b) selecting a value calls
  `setLapsPerBook` with it; (c) once `Room.lapsPerBook` is non-`null`,
  the control shows that value regardless of player count. Confirm
  failures, then implement in `Lobby.svelte`, docent-voice copy
  consistent with the existing turn-timer/monochrome controls.

## Phase 4: Full-suite verification

- [ ] T007 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run
  test` across the whole workspace; confirm all green with no
  regressions.
