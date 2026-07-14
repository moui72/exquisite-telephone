---
status: approved
branch: turn-room-engine
created: 2026-07-14
features: [minimum-player-count-enforceme, asynchronous-play-turn-timer]
surfaced-defects: []
---

# Plan: Turn/room engine — round-gated turns, minimum player count, turn timer

## Goal

Make turn progression strictly round-gated instead of asynchronous,
enforce a minimum player count before a game can start, and add an
optional host-configurable per-turn timer (with a player vote to
resolve a stalled round) so groups can play across time zones without
requiring everyone online simultaneously.

## Scope

**In:**
- Round-gating: a room-wide derived "current round" gates which book's
  next entry is assignable/acceptable (feedback F001,
  `feedback-main-4af4.md`)
- Minimum player count enforced at `start_game`: recommend 4+, require
  ≥3 by default, floor of 1 with an explicit host override
  (`minimum-player-count-enforceme`)
- Optional per-turn timer (off/15m/30m/1hr/4hr/12hr), set by the host
  in the Lobby before starting (`asynchronous-play-turn-timer`)
- Timeout-vote flow when a round's timer expires: eligible voters
  (already-submitted players, or everyone if none have submitted yet)
  choose full turn / half turn / 15 minutes / force empty, resolved by
  plurality once everyone's voted or a 2-minute window elapses (falling
  back to force-empty if nobody votes)
- A server-side background sweep (30s interval) so stalled rounds
  advance even with no active client interaction

**Out:**
- Drawing tools, monochrome toggle (separate, already-tasked plan:
  `plan-drawing-color-and-line-width-t-2026-07-14-6006.md`) — both
  plans add fields to `shared/src/types.ts`'s `Room`; expect a small
  merge when both land (see Open Questions)
- Reveal page redesign, play-again/host-moderation controls — separate
  phases/backlog items

## Technical Approach

**Round-gating** (`shared/src/turnAdvancement.ts`): add a derived
`currentRoundFor(room) = Math.min(...room.books.map(b =>
b.entries.length))` (0 for an empty `books` array). `computeNextEntry`
gains a second gate alongside the existing "book complete" check:
return `null` if `book.entries.length > currentRoundFor(room)` (this
book is ahead of the room-wide round — not this book's turn yet).
`computeNextEntries` needs no change — it already filters out any
book `computeNextEntry` returns `null` for, so it naturally only
offers books at the current round. In `onSubmitEntry`
(`server/src/socket/handlers.ts`), distinguish the two `null` cases for
a clearer error: `book-complete` when `entries.length >=
players.length`, else `round-not-open` when blocked by the round gate.
After a successful submission, compare `currentRoundFor(room)` before
and after — if it increased, the round just advanced: reset
`Room.roundStartedAt = Date.now()`, `Room.timerExtensions = {}`,
`Room.pendingTimeoutVote = null`. `Room.roundStartedAt` is also set to
`Date.now()` in `onStartGame` when the room enters `writing` (round 0
begins).

**Minimum player count**: `StartGameInput` gains an optional
`acknowledgeSmallGame?: boolean`. `onStartGame` rejects with
`too-few-players` when `room.players.length < 3` and
`!input.acknowledgeSmallGame`. No persisted override — it's a one-time
flag on the request itself (datamodel.md Normalization Rules already
reflects this).

**Turn timer control**: new host-only `setTurnTimer` event (mirrors the
not-yet-implemented `setMonochrome` shape from the drawing-tools plan)
accepted only while `room.status === 'lobby'` and
`playerId === room.hostPlayerId`; sets `Room.turnTimerMinutes` to one
of `15 | 30 | 60 | 240 | 720 | null`.

**Timeout vote**: new `castTimeoutVote` event
(`{roomId, playerId, choice}`). A shared `resolveTimeoutVote(room, now)`
function (called both by `onCastTimeoutVote` once every eligible voter
has voted, and by the background sweep once `voteDeadline` passes)
tallies `Room.pendingTimeoutVote.votes` by plurality; ties prefer the
more lenient option in order `full > half > 15m > force-empty` (a
judgment call — easy to revisit later if it doesn't feel right in
practice). `force-empty` (including the zero-votes-cast fallback)
inserts an `Entry` with `emptyByTimeout: true` and empty `content` for
every player in `pendingTimeoutVote.stalledPlayerIds` on their
respective books, then clears `pendingTimeoutVote` — this naturally
lets round-gating's post-submission check advance the round.
`full`/`half`/`15m` instead extend `Room.timerExtensions[playerId]` for
each stalled player and clear `pendingTimeoutVote`, leaving the round
open.

**Background sweep** (`server/src/index.ts` wiring +
new `server/src/domain/timerSweep.ts`): a single `setInterval` (30s)
iterates `store.rooms.values()`, and for each room with
`status === 'writing'` and `turnTimerMinutes` set: if a
`pendingTimeoutVote` is open past its `voteDeadline`, resolve it; else
if every still-short player's deadline
(`roundStartedAt + (timerExtensions[playerId] ?? turnTimerMinutes *
60000)`) has passed and no vote is open, open one (eligible voters =
players who've submitted this round, or everyone if none have) and
broadcast `roomUpdated` to that room's Socket.IO room. Kept as a single
in-process interval per infrastructure.md's Turn Timer Sweep section —
no persistent job queue.

## Phase Breakdown

### Phase 1: Round-gating (foundational, blocks the timer's round-advance reset)
- [ ] T001 [artifacts: datamodel] Write failing tests in `shared/src/turnAdvancement.test.ts` asserting: a book at a lower `entries.length` than a sibling book in the same room returns its normal next entry from `computeNextEntry`, while a book already ahead of the room-wide minimum returns `null` even though it isn't complete. Confirm failures, then implement `currentRoundFor` and the round gate in `computeNextEntry`. Addresses feedback F001 (`feedback-main-4af4.md`).
- [ ] T002 [artifacts: datamodel] Write a failing test in `server/src/socket/handlers.test.ts` asserting `onSubmitEntry` returns `error: 'round-not-open'` (not `'book-complete'`) when a submission targets a book that's ahead of the current round. Confirm failure, then update `onSubmitEntry`'s error branch accordingly.
- [ ] T003 [artifacts: datamodel] Write a failing test asserting that after a submission completes the current round (every book reaches the same new `entries.length`), `Room.roundStartedAt` resets to the current time and `Room.timerExtensions`/`Room.pendingTimeoutVote` reset to `{}`/`null`; and that `onStartGame` sets `Room.roundStartedAt` when transitioning to `writing`. Confirm failure, then implement in `onSubmitEntry` and `onStartGame`. Add the `roundStartedAt`, `timerExtensions`, `pendingTimeoutVote` fields to `Room` (`shared/src/types.ts`) and `emptyByTimeout` to `Entry` as part of this task.
- [ ] T004 [artifacts: ui] [parallel] Write a failing test asserting the Writing/Drawing view shows a distinct "waiting for the round to finish" state (not the prior generic waiting copy) when the player's own next book exists server-side but isn't yet offered because the round hasn't caught up (i.e. `computeNextEntries` returns nothing for them but their book isn't complete). Confirm failure, then implement in `client/src/lib/views/WritingDrawing.svelte`.

### Phase 2: Minimum player count (independent of Phase 1/3/4)
- [ ] T005 [artifacts: datamodel] Write a failing test in `server/src/socket/handlers.test.ts` asserting `onStartGame` rejects with `too-few-players` when `room.players.length < 3` and `input.acknowledgeSmallGame` is not `true`, and succeeds when it is `true` (even with 1 player). Confirm failure, then add `acknowledgeSmallGame?: boolean` to `StartGameInput` and the guard to `onStartGame`.
- [ ] T006 [artifacts: ui] [parallel] Write a failing test in `client/src/lib/views/Lobby.test.ts` asserting: player-count guidance text is always shown; below 3 players an acknowledgment checkbox appears and "start game" is disabled until it's checked; at 3+ players the checkbox is absent and "start game" behaves as today. Confirm failure, then implement in `Lobby.svelte`, threading the checkbox state into `session.startGame()`'s call (extend `SessionStore.startGame` to accept the acknowledgment flag).

### Phase 3: Turn timer control and countdown (depends on Phase 1 for `roundStartedAt`)
- [ ] T007 [artifacts: datamodel] Write a failing server test for a new `onSetTurnTimer` handler: accepted only from the host while `status === 'lobby'`, setting `Room.turnTimerMinutes` to one of `15|30|60|240|720|null`; rejected otherwise. Confirm failure, then implement in `server/src/socket/handlers.ts` and wire a `setTurnTimer` event in `server/src/socket/server.ts`.
- [ ] T008 [artifacts: ui] [parallel] Write a failing test asserting the Lobby's host-only timer selector (off/15m/30m/1hr/4hr/12hr) reflects `Room.turnTimerMinutes` and emits `setTurnTimer` on change. Confirm failure, then implement in `Lobby.svelte`.
- [ ] T009 [artifacts: ui] [parallel] Write a failing test asserting the Writing/Drawing view shows a countdown to the current player's deadline (`roundStartedAt + (timerExtensions[playerId] ?? turnTimerMinutes * 60000)`) when `Room.turnTimerMinutes` is set, and shows nothing timer-related when it's `null`. Confirm failure, then implement in `WritingDrawing.svelte`.

### Phase 4: Timeout vote and background sweep (depends on Phase 1 and Phase 3)
- [ ] T010 [artifacts: datamodel] Write failing tests in a new `server/src/domain/timerSweep.test.ts` for a pure `resolveTimeoutVote(room, now)` function: plurality of cast votes wins; a full/half/15m win extends `timerExtensions` for each stalled player and clears `pendingTimeoutVote`; a force-empty win (or zero votes cast) inserts `emptyByTimeout: true` entries for every stalled player/book and clears `pendingTimeoutVote`; a `full`/`half`/`15m` tie prefers `full`, then `half`, then `15m` over `force-empty`. Confirm failures, then implement.
- [ ] T011 [artifacts: datamodel] Write failing tests for a pure `sweepRoom(room, now)` function (same module): opens a `pendingTimeoutVote` (with the correct `stalledPlayerIds`/`eligibleVoterIds` per the everyone-votes edge case) when every still-short player's deadline has passed and none is open; calls `resolveTimeoutVote` when an open vote's `voteDeadline` has passed. Confirm failures, then implement.
- [ ] T012 Write a failing server test asserting a new `onCastTimeoutVote` handler records a vote in `Room.pendingTimeoutVote.votes` (rejecting a non-eligible voter or a vote when none is pending), and calls `resolveTimeoutVote` once every eligible voter has voted. Confirm failure, then implement in `handlers.ts` and wire a `castTimeoutVote` event in `server.ts`.
- [ ] T013 Write a failing test asserting `server/src/index.ts`'s bootstrap wires a 30-second `setInterval` that calls `sweepRoom` for every `status === 'writing'` room in `store.rooms` with `turnTimerMinutes` set, broadcasting `roomUpdated` to each room whose state changed. Confirm failure, then implement — keep the entry point to wiring only (constitution Principle X); the interval callback itself lives in `timerSweep.ts`.
- [ ] T014 [artifacts: ui] [parallel] Write a failing test asserting the Writing/Drawing view shows the timeout-vote prompt (stalled player names, four options) when `Room.pendingTimeoutVote` is present and the current player is in `eligibleVoterIds`, and emits `castTimeoutVote` on choice. Confirm failure, then implement in `WritingDrawing.svelte`.
- [ ] T015 [parallel] Write a failing test asserting `onCastTimeoutVote`, the sweep's vote-open, and the sweep's force-empty resolution each emit a structured log event (`timeout_vote_opened` / `timeout_vote_resolved` / reusing `turn_advanced` with `reason: 'timeout-forced-empty'` for the auto-submitted entries) per constitution Principle IX — this is exactly the "non-trivial server operation with no human-triggered request" case observability exists for. Confirm failure, then implement.

## Open Questions

- This plan and `plan-drawing-color-and-line-width-t-2026-07-14-6006.md`
  both add fields to `shared/src/types.ts`'s `Room` (this plan:
  `turnTimerMinutes`, `roundStartedAt`, `timerExtensions`,
  `pendingTimeoutVote`; that plan: `monochromeOnly`) and both add a
  new host-only lobby-control socket event alongside `startGame`. No
  functional conflict — the fields/handlers are independent — but
  whichever tasks file is implemented second will need to merge past
  the other's changes to the same files (`types.ts`, `Lobby.svelte`,
  `handlers.ts`, `server.ts`) rather than a clean apply. Flagging so
  `/ardd-implement` isn't surprised by this when it happens.

## Production Annotation Summary

_(none — this phase introduces no new deliberate production shortcuts beyond what's already recorded in infrastructure.md's Turn Timer Sweep section, which documents the single in-process interval choice inline rather than as a shortcut/gap.)_
