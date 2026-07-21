---
plan: plan-4663-2026-07-20-2b90.md
generated: 2026-07-20
status: completed
---

# Tasks

## Phase 1: Active-count resolution in onStartGame

- [x] T001 In `server/src/socket/handlers.ts`, resolve `const active = activePlayers(room).length` (helper from `shared/src/turnAdvancement.ts`) once near the top of the `onStartGame` start path, and use it for BOTH the minimum-player gate (`:154`, currently `room.players.length < MINIMUM_RECOMMENDED_PLAYERS`) and the lap default (`:160`, currently `defaultLapsPerBook(room.players.length)`). Leave `createBooksForRoom` and the rest untouched — they already filter kicked players. Tests (test-first, per constitution Principle III): (a) a 5-player lobby with 1 player kicked, then started, resolves `lapsPerBook` to 2 (the <5-active default), not 1; (b) a 3-player lobby with 1 kicked, started WITHOUT `acknowledgeSmallGame`, is rejected with `too-few-players`, and started WITH the acknowledgement succeeds — this pins the intended, user-visible change to when the override is required; (c) an all-present lobby resolves both values exactly as before (regression guard). [F001] [artifacts: datamodel]
- [x] T002 Correct `datamodel.md`'s two normalization rules to state the counts are of active (non-kicked) players: the **Minimum player count** rule (the `start_game` floor is measured against the active roster, so a kicked lobby player does not count toward the minimum) and the **Laps per book** live-default rule (the "current player count" that picks 2-vs-1 laps is the active count). Note in the edit that this resolves the "live player count" ambiguity the feedback flagged, and matches T001's code. No code change in this task. [F001] [artifacts: datamodel]
