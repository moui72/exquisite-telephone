---
plan: plan-aed6-2026-07-21-2a6e.md
generated: 2026-07-21
status: in-progress
---

# Tasks

## Phase 1: Lobby active-count displays

- [ ] T001 In `client/src/lib/views/Lobby.svelte`, change the two live displays to compute over the active (non-kicked) roster using the already-imported `activePlayers` helper: `belowMinimumPlayers` (`:40`, currently `(state.room?.players.length ?? 0) < MINIMUM_RECOMMENDED_PLAYERS`) and the live `lapsPerBook` default (`:84`, currently `state.room?.lapsPerBook ?? defaultLapsPerBook(state.room?.players.length ?? 0)`). Use `state.room ? activePlayers(state.room).length : 0` (or equivalent null-guard matching the current `?? 0`) as the count in both. Do not touch the roster render at `:210` — it already uses `activePlayers`. Tests (test-first, per constitution Principle III): (a) a 5-player lobby with 1 kicked shows the 2-lap live default (active count 4 → <5 → 2), not 1; (b) a 3-player lobby with 1 kicked shows the below-minimum warning/override checkbox (active count 2 < 3), where with the raw count it would not; (c) an all-present lobby renders both displays exactly as before (regression guard). [F001] [artifacts: ui]
- [ ] T002 Align `ui.md`'s Lobby View wording for these two displays to the active-count behavior, matching `datamodel.md`'s Minimum-player and Laps-per-book rules (corrected in `plan-4663`): the player-count guidance ("below 3 players … checkbox appears") and the laps live-default ("recalculates as players join or leave") should each state the count is of active (non-kicked) players and that a lobby kick moves them. Note in the edit that this is `ui.md` catching up to the already-landed code+datamodel behavior, not new drift. No code change in this task. [F001] [artifacts: ui]
