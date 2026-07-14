# Defects

_Last verified: 2026-07-14_

## constitution.md

- **Claim:** Principle IX (Observability) — "Non-trivial server operations (room creation, player join/leave/reconnect, turn advance, game completion) emit structured, machine-readable log events, including outcome (success/failure) and identifiers sufficient to reproduce an error without a debugger attached."
  **Actual:** `onEndGame` (`server/src/socket/handlers.ts:251-270`) transitions `Room.status` to `'ended'` — a "game completion" operation — without emitting any log event at all. The other game-completion path (natural completion via `onSubmitEntry` when every book finishes, `server/src/socket/handlers.ts:355-358`) does correctly emit a `game_completed` event; `onEndGame`'s host-triggered early termination does not.
  **Location:** `server/src/socket/handlers.ts:251-270`
  **Severity:** drift (pre-existing gap, not introduced this session — already informally tracked as an outstanding item in STATUS.md's Feature Backlog notes, but not previously recorded here as a defect)

- **Claim:** Quality Standards — "Performance Budgets: any user-observable real-time operation (stroke sync latency, turn-passing, reconnect time) has a stated performance budget, defined per feature when the operation is added."
  **Actual:** No artifact states a performance budget for any real-time operation — not the three the principle names as examples (stroke sync, turn-passing, reconnect time), and not the two new ones added this session (turn-timer countdown accuracy/tick rate, timeout-vote resolution latency). A repo-wide search of `.project/artifacts/*.md` for "budget"/"latency"/"performance" finds only the principle's own text.
  **Location:** `.project/artifacts/constitution.md:120-122` (the claim itself); no corresponding budget exists anywhere in `ui.md` or `infrastructure.md`
  **Severity:** drift (pre-existing across the whole project, not newly introduced this session)

## infrastructure.md

- **Claim:** Realtime Sync — "Server-side event handling is decomposed by concern (Principle VIII): one named handler per event type (e.g. `onJoinRoom`, `onSubmitEntry`, `onDrawStroke`, `onDisconnect`)."
  **Actual:** `onDrawStroke` does not exist anywhere in the codebase — there is no per-stroke real-time sync handler. Drawing entries are synced only once, in full, via `onSubmitEntry` when a player finishes their turn (per-stroke data never leaves the client until then). The other three named handlers (`onJoinRoom`, `onSubmitEntry`, `onDisconnect`) do exist as described; only the fourth example is fictitious.
  **Location:** `.project/artifacts/infrastructure.md:36-39` (the claim); `server/src/socket/server.ts` (the real, complete event list: `createRoom`, `joinRoom`, `startGame`, `endGame`, `set_monochrome`, `setTurnTimer`, `submitEntry`, `castTimeoutVote`, `rejoin`, `disconnect`)
  **Severity:** cosmetic (an inaccurate illustrative example in prose; doesn't affect behavior, Principle VIII's decomposition requirement is otherwise genuinely upheld)

## datamodel.md

No defects found — `Room`, `Player`, `Book`, `Entry`, and `TimeoutVote` in `shared/src/types.ts` match the documented fields exactly, including the fields added this session (`monochromeOnly`, `turnTimerMinutes`, `roundStartedAt`, `timerExtensions`, `pendingTimeoutVote`, `Entry.emptyByTimeout`). The draw-op format (`shared/src/strokeData.ts`'s `StrokeOp`/`FillOp`/`DrawOp`/`DrawOps`/`serializeDrawOps`/`parseDrawOps`) matches the documented `Entry.content` shape exactly. All Normalization Rules verified against implementation: round-gating (`shared/src/turnAdvancement.ts`'s `currentRoundFor`/`computeNextEntry`), minimum player count (`onStartGame`'s `MINIMUM_RECOMMENDED_PLAYERS` guard), and the turn-timer/timeout-vote flow (`server/src/domain/timerSweep.ts`'s `resolveTimeoutVote`/`sweepRoom`, including the plurality resolution, force-empty fallback, and per-player deadline extensions) all match as documented.

## ui.md

No defects found — Lobby View (monochrome toggle, player-count guidance/override checkbox, turn-timer selector), Writing/Drawing View (coordinate-scaling fix, color/width/fill toolbar, round-gated wait state, countdown, timeout-vote prompt), Reveal View, and States all match the implementation exactly (`Lobby.svelte`, `DrawingCanvas.svelte`, `WritingDrawing.svelte`, `Reveal.svelte`, `App.svelte`, `TurnStatus.svelte`).
