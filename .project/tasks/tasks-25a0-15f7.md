---
plan: plan-25a0-2026-07-20-1822.md
generated: 2026-07-20
status: in-progress
---

# Tasks

## Phase 1: Active-player rotation

- [x] T001 Add an `activePlayers(room: Room): Player[]` helper to `shared/src/` (e.g. in a new `activePlayers.ts` or alongside `turnAdvancement.ts`) returning `room.players.filter((p) => !p.kicked)`, exported from the shared package index. Write colocated tests: empty roster, no-kicked (returns all, same order), some-kicked (excludes only those), all-kicked (returns empty). Test-first per constitution Principle III. [artifacts: constitution]
- [x] T002 Rewrite `computeNextEntry` in `shared/src/turnAdvancement.ts` to rotate over `activePlayers(room)` instead of `room.players`: resolve `originIndex` via `findIndex` within the active list; if the origin author is kicked (`findIndex` returns `-1`), return `null` explicitly rather than letting the index arithmetic underflow; compute `authorIndex` modulo the active-player count; and check completion against `activeCount * laps`. Preserve the existing round-gating check (`position > currentRoundFor(room)`). This fixes restart not restoring continuability. Add tests: a restarted room with one kicked player assigns turns only to remaining players and its books complete; a book whose origin author is kicked yields `null`; an all-present room behaves exactly as before (regression guard). [defect: 30285161] [artifacts: datamodel]
- [x] T003 Point `defaultLapsPerBook`'s effective player count at the active count wherever it feeds `computeNextEntry`'s completion math, so `room.lapsPerBook ?? defaultLapsPerBook(activeCount)` is used and a restarted room's books actually complete rather than waiting on turns never assigned. Verify against T002's restarted-room test (extend it if the lap default is what would otherwise strand the book). [artifacts: datamodel]

## Phase 2: Vote membership and roster rendering

- [x] T004 In `server/src/domain/timerSweep.ts`, exclude kicked players from the timeout-vote membership sets — `stalledPlayerIds` (line ~168) and the derived voter/`submittedPlayerIds` set (line ~177) — by filtering through `activePlayers` from T001 rather than `room.players`. A kicked player must no longer appear as stalled or as an eligible voter. Test: a room with a kicked, turn-due player does not open a vote against them / does not count them toward plurality. [defect: bf503c53] [artifacts: datamodel]
- [x] T005 [parallel] Filter kicked players out of the roster rendering in `client/src/lib/views/Lobby.svelte` (the `{#each state.room.players as player}` at ~line 210) and `client/src/lib/components/TurnStatus.svelte` (`{#each room.players as player}` at ~line 16), so no non-host view lists a kicked player. Test: assert a kicked player is absent from the rendered `Lobby`/`TurnStatus` output — not merely that `ModerationPanel` still filters. [defect: 4de54acc] [artifacts: ui]

## Phase 3: Timer extensions become additive

- [x] T006 Make the turn deadline additive in both `server/src/domain/timerSweep.ts` (`deadlineFor`, ~line 138: `roundStartedAt + (extensions ?? FULL_TURN_MS)`) and `client/src/lib/views/WritingDrawing.svelte` (the `deadline` derivation, ~lines 73-77): compute `roundStartedAt + base + (timerExtensions[id] ?? 0)` so an extension adds to the base duration rather than replacing it. Do NOT change the accumulation site (`timerExtensions[id] = (existing ?? 0) + extensionMs`) — it is already correct. Test: granting an extension moves the deadline later; a 30-minute timer plus a 15-minute grant yields a 45-minute deadline (the current code inverts this to 15). [defect: e3de2e2a] [artifacts: datamodel]
- [x] T007 Correct `datamodel.md`'s `Room.timerExtensions` field description and its stated deadline formula from the replacing form to the additive form, matching the code after T006 and `ui.md`. This is an artifact catching up to a deliberate code change, not new drift — note that in the edit. [defect: e3de2e2a] [artifacts: datamodel]

## Phase 4: Remaining UI drift

- [x] T008 [parallel] Fix the `waitingForRoundToFinish` condition in `client/src/lib/views/WritingDrawing.svelte` (~lines 44-50) to compare a book's `entries.length` against `activeCount * laps` (its true completion length) rather than `players.length` (one lap), so the "waiting for the round to finish" state holds for the whole game rather than only the first lap. Use the same active-count / laps resolution as Phase 1. Test: in a default 3-4 player (2-lap) game, a player who finishes their second-lap entry early sees the waiting state, not the generic hint. [defect: 1e4c9016] [artifacts: ui]
- [x] T009 [parallel] Add the documented "Return to home" control to the rejoin-a-dead-room branch in `client/src/App.svelte` (~lines 38-41, the `state.error === 'game-ended'` branch), matching the control already present on the `room.status === 'ended'` and kicked branches, in docent-voice copy. Test: the game-ended-error screen renders a return control that resets to the host/join page. [defect: 2d6dda28] [artifacts: ui]

## Phase 5: Curation cap annotation

- [ ] T010 [parallel] Add the curation event cap to `infrastructure.md`'s `## Production Annotations` section: `MAX_CURATION_EVENTS = 65_536`; events past the cap are dropped (not rotated), so a curator holds the *first* N ratings rather than the most recent; the accepted-shortcut rationale (one human reads curation data every few weeks); and the backlogged `curation-data-aggregation-pipe` as the intended remedy. No code change — the behavior and its inline `PRODUCTION ANNOTATION` comment at `server/src/domain/curationStore.ts:225` already exist; this only records it where the constitution requires. [defect: d991281a] [artifacts: infrastructure]
