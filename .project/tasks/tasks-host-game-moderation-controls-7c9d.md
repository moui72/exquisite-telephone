---
plan: plan-host-game-moderation-controls-2026-07-15-9c9b.md
generated: 2026-07-16
status: in-progress
---

# Tasks

## Phase 1: Shared types and turn-advancement guard rail
- [x] T001 [artifacts: datamodel] Add `kicked: boolean` to `Player` and `nonContinuable: boolean` to `Room` in `shared/src/types.ts`. Test-first (constitution Principle III): update `shared` fixtures/tests that construct a `Room`/`Player` literal to include the new fields.
- [x] T002 [artifacts: datamodel] Add a `createBooksForActivePlayers`-style helper (or extend `createBooksForRoom`) in `server/src/domain/roomStore.ts` that excludes `kicked` players when generating `books`, with a unit test covering: no kicked players (same output as today), one kicked player (excluded from `books`), all players kicked (edge case — should not be reachable in practice since a fully-kicked room can't restart with 0 players, but the helper itself should not throw).

## Phase 2: Server handlers [parallel with Phase 3]
- [x] T003 [artifacts: datamodel, infrastructure] Remove the `room.status !== 'reveal'` guard from `onEndGame` in `server/src/socket/handlers.ts`; keep the host-only check. Update `handlers.test.ts`/`server.test.ts` cases that currently assert `room-not-in-reveal` for `onEndGame` outside `reveal` — those now assert success instead. Test-first: write the updated assertions before touching the handler.
- [x] T004 [artifacts: datamodel, infrastructure] Add `onKickPlayer` (host-only) to `server/src/socket/handlers.ts`: sets the target `Player.kicked = true`; if `room.status === 'writing'`, also sets `room.nonContinuable = true`; logs a structured `player_kicked` event (outcome success/failure per constitution Principle IX) with `roomId`/`kickedPlayerId`/`hostPlayerId`; broadcasts `roomUpdated`. Test-first, covering: non-host rejected, room-not-found, kick during `lobby` (no `nonContinuable`), kick during `writing` (sets `nonContinuable`), kick during `reveal` (no `nonContinuable`), double-kick is idempotent.
- [x] T005 [artifacts: datamodel, infrastructure] Add a `Room.nonContinuable` guard to `onSubmitEntry` in `server/src/socket/handlers.ts`: reject with `room-non-continuable` before any other check when `room.nonContinuable` is `true`. Test-first.
- [x] T006 [artifacts: datamodel, infrastructure] Add `onRestartGame` (host-only, requires `room.nonContinuable === true`) to `server/src/socket/handlers.ts`: regenerates `books` via T002's helper (excluding kicked players), clears `entries`/`timerExtensions`/`pendingTimeoutVote`, sets `status = 'writing'`, `roundStartedAt = Date.now()`, `nonContinuable = false`; logs a structured `game_restarted` event; broadcasts `roomUpdated`. Test-first, covering: non-host rejected, room-not-found, rejected when `nonContinuable` is `false` (distinct error code, e.g. `nothing-to-restart`), successful restart excludes kicked players from the new `books`, `roundStartedAt` and timer state reset correctly.
- [x] T007 [artifacts: infrastructure] Wire `onKickPlayer` and `onRestartGame` into the Socket.IO dispatch surface in `server/src/socket/server.ts`, alongside the other named handlers (constitution Principle VIII — no inline logic in the dispatcher).

## Phase 3: Client Moderation Panel [parallel with Phase 2]
- [x] T008 [artifacts: ui] Add `kickPlayer`/`restartGame` methods to the client socket wrapper (`client/src/lib/socket/client.ts`) mirroring the existing `endGame`/`playAgain` shape (ack-based, per the recent `timeout()`+`emitWithAck()` pattern), plus their request/response types in `client/src/lib/socket/types.ts`.
- [x] T009 [artifacts: ui] Add a `ModerationPanel.svelte` component (`client/src/lib/components/`): host-only (checked against `session.player.id === room.hostPlayerId`), a collapsible per-player kick list, an "End game" button, and a "Restart game" button shown only when `room.nonContinuable` is `true`. Mobile-friendly touch targets per constitution Principle II.
- [ ] T010 [artifacts: ui] Mount `ModerationPanel` from `Lobby.svelte`, `WritingDrawing.svelte`, and `Reveal.svelte` (or lift it into a shared layout wrapper if that turns out cleaner once T009 exists — implementer's call, no artifact impact either way). Reveal's existing host "End game" button (`onEndGame` call) can now simply reuse the same panel/handler rather than a page-local one, if that doesn't complicate the existing Reveal end-of-game-controls layout; if it does, leave Reveal's existing button as-is and just add the panel for `lobby`/`writing`.
- [ ] T011 [artifacts: ui] Add a "this game can't continue" notice (visible to every player, not just the host) shown whenever `room.nonContinuable` is `true`, distinct from the host-only restart control — non-host players need to know why the game froze even though they can't fix it themselves.

## Phase 4: Integration verification
- [ ] T012 Full-suite run (`pnpm test`, `pnpm typecheck`, `pnpm lint`) after Phases 1–3 land, confirming no regression in the existing End-of-game-controls / turn-advancement / timer-sweep test coverage that this plan's changes touch.
