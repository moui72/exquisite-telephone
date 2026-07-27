---
plan: plan-short-turn-timer-options-2026-07-27-1cf1.md
generated: 2026-07-27
status: in-progress
---

# Tasks

## Phase 1: Artifact revisions (docs)
- [x] T001 [artifacts: ui] [parallel] Revise `ui.md` Lobby View roster description: the current player's entry is marked "(you)" (visible to non-hosts too, mirroring the existing "(host)" tag), and a player may click their own roster entry to rename themselves while `Room.status === 'lobby'` (F001, F002 of `feedback-lobby-self-identity-and-rename-ff4b.md`). Stamp `last_updated 2026-07-27`; `diagram_status` is already `stale` from this run's feature edit — leave it.
- [x] T002 [artifacts: datamodel] [parallel] Revise `datamodel.md`: add a Normalization Rule that `Player.name` is mutable while `Room.status === 'lobby'` via a self-rename action — a player may change only their own seat's name, lobby-only, the name is trimmed and must be non-empty, and there is no uniqueness constraint (`Player.id` is the key; duplicate names already possible at join) (F002). Stamp `last_updated 2026-07-27`.
- [x] T003 [artifacts: infrastructure] [parallel] Revise `infrastructure.md`: add the `onSetDisplayName` socket handler to the handler list, alongside the other lobby setters (`onSetTurnTimer` etc.) (F002). Stamp `last_updated 2026-07-27`.

## Phase 2: Short turn-timer options (code)
- [ ] T004 [artifacts: datamodel, ui] Test-first (constitution III): add a FAILING case to `client/src/lib/views/Lobby.test.ts` (marked `.fails` so the full-suite pre-commit hook stays green) asserting the host turn-timer selector offers the short options and emits fractional-minute values — e.g. an option labeled "30 seconds" whose selection calls `setTurnTimer(0.5)`, and options for 60s→`1`, 90s→`1.5`, 2m→`2`. Run the client suite; confirm red before implementing.
- [ ] T005 [artifacts: datamodel, ui] Implement to turn T004 green (remove the `.fails` marker): extend the `turnTimerMinutes` union in `shared/src/types.ts` to `0.5 | 1 | 1.5 | 2 | 15 | 30 | 60 | 240 | 720 | null`; add the four short options (30s/60s/90s/2m → 0.5/1/1.5/2) to `TURN_TIMER_OPTIONS` and the label map in `Lobby.svelte`, ordered before the 15m option; widen the `handleTurnTimerChange` numeric cast accordingly. The `turnTimerMinutes * 60000` deadline math is unchanged (see datamodel). Verify the full suite + svelte-check pass, and sanity-check that a 30s timer doesn't collide awkwardly with the timeout-vote / 30s cover-grace flow (verification only — no redesign).

## Phase 3: F001 self-identity marker (code)
- [ ] T006 [artifacts: ui] Test-first: add a FAILING case to `Lobby.test.ts` (marked `.fails`) asserting that, rendered as a non-host player, that player's own entry in the roster shows a "(you)" marker while other entries do not. Confirm red first.
- [ ] T007 [artifacts: ui] Implement to turn T006 green (remove `.fails`): in `Lobby.svelte`, add a "(you)" tag to the roster entry whose `player.id === state.player?.id`, mirroring the existing "(host)" tag markup; both tags may co-appear on the host's own entry. Verify suite + svelte-check.

## Phase 4: F002 self-rename (code)
- [ ] T008 [artifacts: datamodel, infrastructure] Test-first: add a FAILING server test (Vitest `.fails`) for an `onSetDisplayName` socket handler — a lobby player renaming their own seat to a trimmed non-empty name updates `Player.name` and broadcasts the updated room; a rename that isn't the caller's own seat, that targets a non-lobby room, or whose trimmed name is empty is rejected with no mutation. Model it on the existing lobby-setter handler tests. Confirm red first.
- [ ] T009 [artifacts: datamodel, infrastructure] Implement to turn T008 green (remove `.fails`): add the `onSetDisplayName` server socket handler (own-seat-only, lobby-only, trimmed-non-empty validation, then mutate `Player.name` and broadcast the room) mirroring the existing lobby setters, plus a `session.setDisplayName(name)` client emitter in the session store. Verify the full suite.
- [ ] T010 [artifacts: ui] Test-first: add a FAILING case to `Lobby.test.ts` (marked `.fails`) asserting that clicking the current player's own roster entry reveals an inline edit affordance whose submission calls `session.setDisplayName` with the new (trimmed) value. Confirm red first.
- [ ] T011 [artifacts: ui] Implement to turn T010 green (remove `.fails`): make the current player's Lobby roster entry an inline click-to-edit affordance that calls `session.setDisplayName` on submit, rejecting an empty/whitespace-only value client-side to match the server rule. Verify the full suite + svelte-check.
</content>
