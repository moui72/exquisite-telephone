---
status: approved
branch: configurable-book-laps-per-gam
created: 2026-07-18
features: [configurable-book-laps-per-gam]
surfaced-defects: []
---

# Plan: Configurable laps per book

## Goal

Let the host configure how many full rotations through the room each
book completes before the game ends (1–3 laps), defaulting to 2 under 5
players and 1 otherwise, with the default tracking live player count
until the host explicitly overrides it.

## Scope

**In scope:**
- `Room.lapsPerBook: number | null` and its host-only, lobby-only
  setter, mirroring the existing `turnTimerMinutes`/`monochromeOnly`
  pattern.
- A shared, single-source-of-truth `defaultLapsPerBook(playerCount)`
  helper (2 if `< 5`, else 1), used by both the client (to display the
  live default while `lapsPerBook` is `null`) and the server (to
  resolve a concrete value at `onStartGame` if still `null`).
- Extending the book-completion math (`computeNextEntry`/
  `computeNextEntries` in `shared/src/turnAdvancement.ts`) to multiply
  `Room.players.length` by the resolved laps count.
- A Lobby control (1/2/3) reflecting the live-default-until-overridden
  behavior described in `ui.md`.

**Out of scope:**
- Any change to author rotation or entry-type alternation — both
  already work unchanged across multiple laps (see Technical Approach).
- Any change to the Reveal page's per-book display — a multi-lap book
  is just a longer `entries` array; the existing reveal-pacing/
  gallery-grid logic already handles arbitrary-length chains.
- Any change to the turn timer, monochrome toggle, or moderation
  controls.

## Technical Approach

Add a small pure function to `shared/src/turnAdvancement.ts` (same
module as `currentRoundFor`/`computeNextEntry`, since it's part of the
same round-math single source of truth per constitution Principle VI):

```ts
export function defaultLapsPerBook(playerCount: number): 1 | 2 {
  return playerCount < 5 ? 2 : 1;
}
```

`computeNextEntry`'s completion check changes from
`position >= room.players.length` to
`position >= room.players.length * (room.lapsPerBook ?? defaultLapsPerBook(room.players.length))`
— note this makes the resolved-value fallback available even before
`onStartGame` has pinned a concrete number, so the math never needs a
separate "is this null" branch beyond the one `??`. Author rotation
(`(originIndex + position) % players.length`) and entry-type
alternation (`position % 2`) need no changes — `position` simply
continues counting past `players.length` into the next lap, and the
existing modulo math keeps working.

Server: `onStartGame` (`server/src/socket/handlers.ts`) resolves
`room.lapsPerBook` to a concrete number via the same
`defaultLapsPerBook` helper if it's still `null`, alongside its
existing `createBooksForRoom`/`roundStartedAt` reset — mirrors how
other lobby-only settings are finalized at game start. A new
`onSetLapsPerBook` handler mirrors `onSetTurnTimer`/`onSetMonochrome`
exactly (host-only, lobby-only, validates `1 | 2 | 3`), wired into the
socket dispatch table (`server/src/socket/server.ts`) the same way.

Client: `Lobby.svelte` gets a new control next to the existing turn-timer
selector, using the shared `defaultLapsPerBook` helper to display the
live default whenever `Room.lapsPerBook` is `null` (recalculating as
`state.room.players.length` changes), and switching to showing the
host's explicit choice once set. A new `setLapsPerBook` method on the
session store (`client/src/lib/stores/session.ts`) mirrors the existing
`setTurnTimer`/`setMonochrome` methods.

## Phase Breakdown

### Phase 1 — Shared round-math extension
No dependencies.

- T001 [artifacts: datamodel] Add `lapsPerBook: number | null` to the
  `Room` type in `shared/src/types.ts`, defaulting to `null` in
  `createRoom` (`server/src/domain/roomStore.ts`) — mirror
  `turnTimerMinutes`'s shape exactly. Write a failing server test in
  `roomStore.test.ts` asserting `createRoom` returns `lapsPerBook: null`
  by default; confirm it fails, then implement.
- T002 [artifacts: datamodel] [parallel] In `shared/src/
  turnAdvancement.ts`, write failing tests in `turnAdvancement.test.ts`
  asserting: (a) `defaultLapsPerBook(4)` returns `2`, `defaultLapsPerBook(5)`
  returns `1`; (b) with `Room.lapsPerBook` set to `2`, a book with
  `players.length === 3` completes (returns `null` from
  `computeNextEntry`) only after 6 entries, not 3, and author rotation
  continues correctly into the second lap (position 3's author equals
  position 0's author, position 4 equals position 1, etc.); (c) with
  `Room.lapsPerBook: null`, the same completion math falls back to
  `defaultLapsPerBook(room.players.length)`. Confirm all fail, then
  implement `defaultLapsPerBook` and update `computeNextEntry`'s
  completion check.

### Phase 2 — Server: setter + start-game resolution
Depends on Phase 1.

- T003 [artifacts: datamodel] Write a failing server test in
  `handlers.test.ts` for a new `onSetLapsPerBook` handler: accepted
  (updates `Room.lapsPerBook` and broadcasts) only when the caller is
  host and `Room.status === 'lobby'`, and only for input `1 | 2 | 3`
  (reject anything else, e.g. with a `invalid-laps-per-book` error);
  rejected with `not-host`/`room-not-in-lobby` otherwise — mirror
  `onSetTurnTimer`'s exact guard shape. Confirm failures, then implement
  `onSetLapsPerBook` in `server/src/socket/handlers.ts` and wire a
  `set_laps_per_book` event to it in `server/src/socket/server.ts`'s
  dispatch table (constitution Principle VIII — one named handler per
  event).
- T004 [artifacts: datamodel] Write a failing server test in
  `handlers.test.ts` asserting `onStartGame` resolves `room.lapsPerBook`
  to `defaultLapsPerBook(room.players.length)` when it was `null` at
  start time, and leaves an explicitly-host-set value untouched.
  Confirm failure, then implement the resolution in `onStartGame`.

### Phase 3 — Client: Lobby control
Depends on Phase 2.

- T005 [artifacts: ui] Write a failing test in `session.test.ts` (or
  wherever `setTurnTimer`/`setMonochrome` are tested) asserting a new
  `setLapsPerBook` method emits the `set_laps_per_book` event with the
  given value. Confirm failure, then implement in
  `client/src/lib/stores/session.ts`.
- T006 [artifacts: ui] Write failing tests in `Lobby.test.ts` asserting:
  (a) the laps control shows `defaultLapsPerBook(state.room.players.length)`
  when `Room.lapsPerBook` is `null`, and that this value changes as the
  test varies the player count; (b) selecting a value calls
  `setLapsPerBook` with it; (c) once `Room.lapsPerBook` is non-`null`,
  the control shows that value regardless of player count. Confirm
  failures, then implement in `Lobby.svelte`, docent-voice copy
  consistent with the existing turn-timer/monochrome controls.

### Phase 4 — Full-suite verification
Depends on Phase 3.

- T007 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test`
  across the whole workspace; confirm all green with no regressions.

## Open Questions

- Exact copy for the laps control (label, per-option text) is left to
  T006's implementation, guided by the existing docent-voice
  conventions already in `ui.md`/the codebase — same pattern as prior
  plans.
- Whether an invalid `set_laps_per_book` value should reject with a
  dedicated `invalid-laps-per-book` error code or silently clamp to the
  nearest valid value is left to T003's implementation; rejecting
  matches this codebase's existing pattern of explicit validation
  errors over silent clamping, so that's the default unless T003 finds
  a reason otherwise.
