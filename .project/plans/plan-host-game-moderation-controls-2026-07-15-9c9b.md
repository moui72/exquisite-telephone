---
status: approved
branch: host-game-moderation-controls
created: 2026-07-15
features: [host-game-moderation-controls]
surfaced-defects: []
---

# Plan: Host Game Moderation Controls

## Goal

Give the host kick-player, end-game-anytime, and restart-game controls so
disruptive or offensive-content situations can be handled without waiting
for the game to reach Reveal.

## Scope

**In scope:**
- Host-only "kick player" during `lobby`/`writing`/`reveal`.
- Host-only "end game" reachable from any `Room.status` (relaxing the
  existing reveal-only guard on `onEndGame`).
- Host-only "restart game" — resets the same room to a fresh turn 0,
  available once a kick has made the room `nonContinuable`.
- A Moderation Panel in the client, host-only, visible during
  `lobby`/`writing`/`reveal`.

**Out of scope:**
- Non-host / player-initiated kick voting.
- Persistent bans or blocking a kicked player from rejoining via room
  code (a kicked player can still rejoin as a *new* player if they have
  the code — only their old `Player` record is marked `kicked`).
- Any change to the round-robin author-index math to skip a kicked
  player's turn in place — see Technical Approach.

## Technical Approach

Per [[datamodel]] Normalization Rules — Moderation (amended by this
plan's artifact-change step): `Player.kicked` and `Room.nonContinuable`
are the two new fields. Kicking during `writing` freezes the room
(`onSubmitEntry` rejects with `room-non-continuable` while
`Room.nonContinuable` is `true`) rather than teaching
`computeNextEntry`/`computeNextEntries` (`shared/src/turnAdvancement.ts`)
to skip a kicked player's now-orphaned turn — that would require
shifting the round-robin author-index math for every book mid-round,
which is a materially bigger change than this feature needs. Restart
regenerates `books` via a kicked-excluding variant of the existing
`createBooksForRoom` (`server/src/domain/roomStore.ts`), reusing the same
`Room.id` and every non-kicked `Player`'s existing `id`/`sessionToken` —
distinct from `replayRoom` (Play Again), which mints a brand-new room and
new players.

`onEndGame`'s `Room.status !== 'reveal'` guard (added in
`tasks-reveal-defects-c65e.md` to fix a drift defect) is removed —
host-only becomes the only check — per [[datamodel]]'s amended
End-of-game-controls rule.

## Phase Breakdown

### Phase 1: Shared types and turn-advancement guard rail
- [ ] T001 `[artifacts: datamodel]` Add `kicked: boolean` to `Player` and
  `nonContinuable: boolean` to `Room` in `shared/src/types.ts`. Test-first
  (constitution Principle III): update `shared` fixtures/tests that
  construct a `Room`/`Player` literal to include the new fields.
- [ ] T002 `[artifacts: datamodel]` Add a `createBooksForActivePlayers`-
  style helper (or extend `createBooksForRoom`) in
  `server/src/domain/roomStore.ts` that excludes `kicked` players when
  generating `books`, with a unit test covering: no kicked players (same
  output as today), one kicked player (excluded from `books`), all
  players kicked (edge case — should not be reachable in practice since a
  fully-kicked room can't restart with 0 players, but the helper itself
  should not throw).

### Phase 2: Server handlers `[parallel with Phase 3]`
- [ ] T003 `[artifacts: datamodel, infrastructure]` Remove the
  `room.status !== 'reveal'` guard from `onEndGame` in
  `server/src/socket/handlers.ts`; keep the host-only check. Update
  `handlers.test.ts`/`server.test.ts` cases that currently assert
  `room-not-in-reveal` for `onEndGame` outside `reveal` — those now
  assert success instead. Test-first: write the updated
  assertions before touching the handler.
- [ ] T004 `[artifacts: datamodel, infrastructure]` Add `onKickPlayer`
  (host-only) to `server/src/socket/handlers.ts`: sets the target
  `Player.kicked = true`; if `room.status === 'writing'`, also sets
  `room.nonContinuable = true`; logs a structured `player_kicked` event
  (outcome success/failure per constitution Principle IX) with
  `roomId`/`kickedPlayerId`/`hostPlayerId`; broadcasts `roomUpdated`.
  Test-first, covering: non-host rejected, room-not-found, kick during
  `lobby` (no `nonContinuable`), kick during `writing` (sets
  `nonContinuable`), kick during `reveal` (no `nonContinuable`),
  double-kick is idempotent.
- [ ] T005 `[artifacts: datamodel, infrastructure]` Add a
  `Room.nonContinuable` guard to `onSubmitEntry` in
  `server/src/socket/handlers.ts`: reject with `room-non-continuable`
  before any other check when `room.nonContinuable` is `true`. Test-first.
- [ ] T006 `[artifacts: datamodel, infrastructure]` Add `onRestartGame`
  (host-only, requires `room.nonContinuable === true`) to
  `server/src/socket/handlers.ts`: regenerates `books` via T002's helper
  (excluding kicked players), clears `entries`/`timerExtensions`/
  `pendingTimeoutVote`, sets `status = 'writing'`, `roundStartedAt =
  Date.now()`, `nonContinuable = false`; logs a structured
  `game_restarted` event; broadcasts `roomUpdated`. Test-first, covering:
  non-host rejected, room-not-found, rejected when `nonContinuable` is
  `false` (`room-not-continuable`... — reuse a clear distinct error code,
  e.g. `nothing-to-restart`), successful restart excludes kicked players
  from the new `books`, `roundStartedAt` and timer state reset correctly.
- [ ] T007 `[artifacts: infrastructure]` Wire `onKickPlayer` and
  `onRestartGame` into the Socket.IO dispatch surface in
  `server/src/socket/server.ts`, alongside the other named handlers
  (constitution Principle VIII — no inline logic in the dispatcher).

### Phase 3: Client Moderation Panel `[parallel with Phase 2]`
- [ ] T008 `[artifacts: ui]` Add `kickPlayer`/`restartGame` methods to the
  client socket wrapper (`client/src/lib/socket/client.ts`) mirroring the
  existing `endGame`/`playAgain` shape (ack-based, per the recent
  `timeout()`+`emitWithAck()` pattern), plus their request/response types
  in `client/src/lib/socket/types.ts`.
- [ ] T009 `[artifacts: ui]` Add a `ModerationPanel.svelte` component
  (`client/src/lib/components/`): host-only (checked against
  `session.player.id === room.hostPlayerId`), a collapsible per-player
  kick list, an "End game" button, and a "Restart game" button shown only
  when `room.nonContinuable` is `true`. Mobile-friendly touch targets per
  constitution Principle II.
- [ ] T010 `[artifacts: ui]` Mount `ModerationPanel` from `Lobby.svelte`,
  `WritingDrawing.svelte`, and `Reveal.svelte` (or lift it into a shared
  layout wrapper if that turns out cleaner once T009 exists — implementer's
  call, no artifact impact either way). Reveal's existing host "End game"
  button (`onEndGame` call) can now simply reuse the same panel/handler
  rather than a page-local one, if that doesn't complicate the existing
  Reveal end-of-game-controls layout; if it does, leave Reveal's existing
  button as-is and just add the panel for `lobby`/`writing`.
- [ ] T011 `[artifacts: ui]` Add a "this game can't continue" notice
  (visible to every player, not just the host) shown whenever
  `room.nonContinuable` is `true`, distinct from the host-only restart
  control — non-host players need to know why the game froze even though
  they can't fix it themselves.

### Phase 4: Integration verification
- [ ] T012 Full-suite run (`pnpm test`, `pnpm typecheck`, `pnpm lint`)
  after Phases 1–3 land, confirming no regression in the existing
  End-of-game-controls / turn-advancement / timer-sweep test coverage
  that this plan's changes touch.

## Open Questions

- Whether a kicked player's client, if still connected, should see an
  explicit "you were kicked" message vs. just losing turn eligibility
  silently and discovering it via the frozen-game notice (T011). Left to
  the implementer's judgment during T009/T010 — no artifact currently
  specifies client-side messaging for this case, and it doesn't block any
  other task.

## Production Annotation Summary

None — this plan introduces no new production shortcut or gap beyond
what [[datamodel]] and [[infrastructure]] already annotate (in-memory-only
state, no account system, single-process scaling).
