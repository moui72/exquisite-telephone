---
status: approved
branch: reveal-page
created: 2026-07-14
features: [play-again-control-on-reveal-p, animated-interactive-reveal-bo]
surfaced-defects: []
---

# Plan: Reveal page — end-of-game controls and animated book viewer

## Goal

Give the Reveal page host/non-host end-of-game controls (leave, end
game, vote to play again, play again with auto-rejoin) and redesign
its default book viewer into a paced, animated, one-book-at-a-time
experience instead of a static full-grid dump.

## Scope

**In:**
- `Room.playAgainVotes` (informational readiness signal)
- Non-host: "Leave game" (client-local), "Vote to play again"
- Host: "End game" (wires the already-existing `onEndGame` handler to
  the UI for the first time), "Play again" (new room, auto-joins every
  current player via a per-socket `roomChanged` push)
- A new `ended` client-rendering state (App.svelte currently has no
  branch for it — a real, previously-unnoticed gap this feature must
  close, since "End game" now actually produces that state for
  everyone still on the page)
- Animated Reveal viewer: one book at a time, cover (name + generated
  abstract art) -> timed 2-entry-at-a-time reveal -> next book -> ...
  -> static show-everything mode, with manual prev/next/skip controls

**Out:**
- `host-game-moderation-controls` (kick player, restart mid-game) —
  separate, not-yet-planned backlog item; distinct from "play again"
  (a fresh room after the game naturally ends) despite superficial
  similarity to "restart"

## Technical Approach

**`playAgainVotes`**: `Room` gains `playAgainVotes: string[]`
(player IDs, deduplicated), set via a new host-agnostic
`onVoteToPlayAgain` handler — no host-only guard needed since the
button is simply never shown to the host client-side, and a stray
server-side vote from anyone is harmless. Purely informational; never
read by any gating logic.

**"Leave game" / "Return to home"**: one new client-only
`SessionStore.leaveGame()` — clears the stored session token and
resets local state to `{ room: null, player: null, error: null,
reconnecting: false }`. No server event. Both the Reveal page's "Leave
game" button and the new `ended`-state "Return to home" button call
this same method.

**"End game"**: no server changes — `onEndGame` already exists and is
wired in `server.ts`. Only new work: add `SessionStore.endGame()`
(`emitWithAck('endGame', {...})`, mirroring `setMonochrome`'s shape)
and a button that calls it. The resulting `Room.status === 'ended'`
broadcast needs a new `App.svelte` branch (currently missing — see
Scope) rendering "This game has ended" + "Return to home"
(`session.leaveGame()`).

**"Play again"**: new `replayRoom(store, oldRoom): { room: Room;
playerIdMap: Map<string, Player> }` in `server/src/domain/roomStore.ts`
— generates a new room code, creates one fresh `Player` (new `id`,
new `sessionToken`) per player in `oldRoom.players` (preserving name;
`connected` carried over as-is), maps the old host's id to their new
player, and returns both the new `Room` (`status: 'lobby'`, empty
`playAgainVotes`, all other fields at their `createRoom` defaults) and
an old-id -> new-`Player` map. New handler `onPlayAgain(socket, store,
sessionStore, logger, io, input: {roomId, playerId}, ack)` — host-only,
`status === 'reveal'` only, `io: SocketIOServer` (or a minimal
same-process interface, matching `timerSweep.ts`'s `BroadcastServer`
precedent for needing more than one socket's worth of reach) is a new
parameter this handler needs that no other handler does. Single-process
scale (Principle I) means no need for Socket.IO's cross-process
`fetchSockets()` adapter API: get the old room's connected socket IDs
via `io.sockets.adapter.rooms.get(oldRoomId)`, resolve each to a real
local `Socket` via `io.sockets.sockets.get(id)`, then for each: look up
its `socket.data.playerId` in `playerIdMap`, `socket.leave(oldRoomId)`
/ `socket.join(newRoom.id)`, update `socket.data.playerId`/`roomId`,
issue a session token via `sessionStore.issue(newPlayer.id,
newRoom.id)` and set it on the new `Player`, then
`socket.emit('roomChanged', { room: newRoom, player: newPlayer })`
directly to that socket (this is genuinely per-socket, not
`socket.to(room).emit`, since every player gets a *different* payload
— documented in infrastructure.md as the one exception to the
broadcast-one-shared-payload pattern). The initiating host's own
socket goes through the same loop (no special-casing) and also gets
the `ack` response. Log `{ event: 'room_created', outcome: 'success',
roomId: newRoom.id, playerId: newHostPlayerId, reason: 'play-again',
previousRoomId: oldRoom.id }` (Principle IX — this is a "room
creation" operation). The old room is left untouched in the store
(same non-cleanup precedent as `ended` rooms) — disconnected players'
new `Player` records exist but are unreachable until/unless they
learn the new room code some other way (their old session token still
only resolves the old, now-stale room); this is accepted as a known
limitation rather than solved with session-token remapping, which
would add real complexity for a genuinely rare case (Principle I).

**Client**: `SessionStore` gains `endGame()`, `leaveGame()`,
`voteToPlayAgain()`, `playAgain()`, and a new `roomChanged` socket
listener (distinct from `roomUpdated` — it updates *both* `room` and
`player`, since identity itself changes, and also calls the existing
`storeToken` helper with the new session token). `Reveal.svelte`
switches from its current bare `room: Room` prop to the same
`session: SessionStore` prop pattern already used by `Lobby.svelte`/
`WritingDrawing.svelte`, so it can read `$session` for the current
player/host status and call the new store methods. `App.svelte` passes
`session` instead of `room` to `<Reveal>` and gains the new `ended`
branch.

**Animated viewer**: a new pure `client/src/lib/reveal/coverArt.ts`
(`generateCoverArt(seed: string)`) hashes the seed string into a small
set of deterministic HSL colors/positions for a handful of overlapping
SVG circles — same "cover" every time for a given book, no external
dependency. `Reveal.svelte` tracks `currentBookIndex` and, within a
book, how many entries are currently revealed (starting at 0 = cover
only); a `setInterval` (cleaned up via `onMount`/`onDestroy`, matching
`WritingDrawing.svelte`'s existing countdown-timer pattern) advances
every 4 seconds after an initial 2.5-second cover delay, revealing up
to 2 more entries each tick, then moving to the next book once a book
is exhausted. Manual "previous"/"next"/"show everything" controls
mutate the same state directly and reset the interval's timing so
auto-advance doesn't immediately override a manual action. Once every
book has been passed (by any means), the view renders every book's
full chain at once — the same content the current static
implementation already produces, so that code is reused as the
"show everything" end state rather than deleted and rewritten.

## Phase Breakdown

### Phase 1: Data model + server (blocks Phase 2)
- [ ] T001 [artifacts: datamodel] Add `playAgainVotes: string[]` to the `Room` interface in `shared/src/types.ts`; update every existing `Room` literal fixture across `shared/`, `server/`, and `client/` test files to include it (mirrors the pattern from the last two rounds of `Room` field additions). Write/update the relevant `shared/src/types.test.ts` assertion. No dedicated new test needed beyond the type-level fixture updates — this is a pure additive field.
- [ ] T002 [artifacts: datamodel] Write a failing test for a new `onVoteToPlayAgain` handler in `server/src/socket/handlers.test.ts`: adds `playerId` to `Room.playAgainVotes` (deduplicated — voting twice doesn't duplicate the entry), broadcasts `roomUpdated`. Confirm failure, then implement in `server/src/socket/handlers.ts` and wire a `voteToPlayAgain` event in `server/src/socket/server.ts`.
- [ ] T003 [artifacts: datamodel] Write failing tests for `replayRoom(store, oldRoom)` in a new `server/src/domain/roomStore.test.ts` addition (or the existing file): returns a new `Room` with a fresh `id`, `status: 'lobby'`, empty `playAgainVotes`, and one new `Player` per player in `oldRoom.players` (new `id`/`sessionToken`, same `name`, `connected` carried over); the returned `playerIdMap` correctly maps each old player id to their new `Player`; the new room's `hostPlayerId` matches the new player mapped from the old host. Confirm failures, then implement in `server/src/domain/roomStore.ts`.
- [ ] T004 [artifacts: datamodel, infrastructure] Write a failing integration test in `server/src/socket/server.test.ts` (real Socket.IO server + client sockets, matching the existing `onSetMonochrome`/`onEndGame` integration-test style) asserting: two connected clients in a room at `status: 'reveal'`, the host emits `playAgain`, and (a) the host's ack contains the new room/player, (b) the *other* client receives a `roomChanged` event with its own distinct new `player.id` (not the host's), (c) `logger` recorded a `room_created` event with `reason: 'play-again'`. Confirm failure, then implement `onPlayAgain` in `server/src/socket/handlers.ts` (using the local-socket-lookup approach described in the plan's Technical Approach, not the cross-process `fetchSockets()` API) and wire a `playAgain` event in `server/src/socket/server.ts`, passing `io` through from `createSocketServer`.

### Phase 2: Client end-of-game controls (depends on Phase 1; ships against the current static Reveal grid)
- [ ] T005 [artifacts: ui] Write failing tests in `client/src/lib/stores/session.test.ts` for four new `SessionStore` methods: `endGame()` emits `endGame` with `{roomId, playerId}`; `leaveGame()` clears the stored session token and resets state to `{room: null, player: null, error: null, reconnecting: false}` with **no** socket emission; `voteToPlayAgain()` emits `voteToPlayAgain`; `playAgain()` emits `playAgain` and applies the ack the same way `createRoom` does. Also test a new `roomChanged` socket listener updates both `room` and `player` (unlike `roomUpdated`, which only updates `room`) and calls the token-storage helper. Confirm failures, then implement all of it in `client/src/lib/stores/session.ts`.
- [ ] T006 [artifacts: ui] Write a failing test asserting `App.svelte` renders an `ended` branch ("This game has ended" + a "Return to home" button that calls `session.leaveGame()`) when `state.room.status === 'ended'`, distinct from the existing `state.error === 'game-ended'` rejoin-failure branch. Confirm failure, then implement in `client/src/App.svelte`.
- [ ] T007 [artifacts: ui] Convert `Reveal.svelte` from its current `room: Room` prop to a `session: SessionStore` prop (matching `Lobby.svelte`/`WritingDrawing.svelte`), reading `$session` for `room`/`player`/host status. Update `App.svelte` to pass `session` instead of `room` to `<Reveal>`. Update every existing `Reveal.test.ts` case to render with a fake `session` store instead of a bare `room` prop (mirroring `Lobby.test.ts`'s `makeFakeSession` pattern) — this is a mechanical prop-plumbing change with no behavior change yet, so existing assertions should keep passing once the fixture is updated. Confirm the conversion doesn't change any existing test's expected behavior.
- [ ] T008 [artifacts: ui] [parallel] Write failing tests in `Reveal.test.ts` asserting: non-host sees "Leave game" and "Vote to play again" buttons (clicking each calls the corresponding `session` method); host sees "End game" and "Play again" instead (same click-through assertions); the readiness count (e.g. "1 of 2 ready") reflects `Room.playAgainVotes.length` vs `Room.players.length`, visible only to the host. Confirm failures, then implement the four buttons and readiness count in `Reveal.svelte`, alongside (not replacing) the existing static book-grid content.

### Phase 3: Animated reveal viewer (depends on Phase 2 for the `session` prop conversion)
- [ ] T009 [artifacts: ui] Write failing tests in a new `client/src/lib/reveal/coverArt.test.ts` for `generateCoverArt(seed: string)`: same seed always produces the same output (deterministic); different seeds produce different output (not a constant). Confirm failure, then implement the hash-seeded HSL/position generator described in the plan's Technical Approach.
- [ ] T010 [artifacts: ui] Write failing tests in `Reveal.test.ts` asserting: on initial render, only the first book's cover (player name + generated art, no entries) is shown; after the cover delay and reveal ticks elapse (use fake timers), up to 2 entries at a time become visible, advancing through the book then to the next book's cover; a "show everything" control immediately switches to the full static grid (all books, all entries) regardless of timer state; manual "previous"/"next" controls step between books without waiting for the timer. Confirm failures, then implement the `currentBookIndex`/revealed-entry-count state, the `setInterval` (registered/cleaned up via `onMount`/`onDestroy`, per constitution's touch/timer-cleanup quality standard) driving auto-advance at the plan's stated 2.5s-cover/4s-per-step timing, and the manual controls — reusing the existing full-grid rendering code as the "show everything" end state rather than rewriting it.
- [ ] T011 [artifacts: ui] [parallel] Update `client/src/lib/views/Reveal.test.ts`'s original "renders each book's full ordered chain of entries" test (predates the animated default) to either drive the "show everything" control first or assert against the new default (cover-first) behavior instead — whichever keeps the test meaningfully asserting the full-grid rendering path still works, without duplicating coverage already added in T010.

## Open Questions

_(none — all flagged design decisions confirmed during planning)_

## Production Annotation Summary

- **Disconnected players and "Play again"**: a player who is
  disconnected when the host clicks "Play again" gets a `Player`
  record created in the new room, but has no way to discover or join
  it — their old session token still only resolves the old (finished)
  room. In production, this would need either session-token remapping
  or an explicit notification/re-share-the-code flow. Recorded in
  `datamodel.md`'s Normalization Rules rather than a dedicated
  Production Annotations bullet, since it's a narrow behavioral edge
  case rather than a broad category of shortcut — worth revisiting if
  it turns out to matter in practice.
