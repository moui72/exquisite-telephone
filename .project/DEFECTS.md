# Defects

_Last verified: 2026-07-15_

## constitution.md

- **Claim:** Quality Standards — "Performance Budgets: any user-observable real-time operation (stroke sync latency, turn-passing, reconnect time) has a stated performance budget, defined per feature when the operation is added."
  **Actual:** Still no artifact states a performance budget for any real-time operation. Deliberately declined as a fix in `plan-4401-2026-07-14-7cf3.md`; carried forward here rather than dropped, since declining a fix doesn't make the underlying claim true.
  **Location:** `.project/artifacts/constitution.md:120-122` (the claim itself); no corresponding budget exists anywhere in `ui.md` or `infrastructure.md`
  **Severity:** drift (pre-existing across the whole project; a known, standing decline)

## datamodel.md

No defects found — `shared/src/types.ts` (`Room`, `Player`, `Book`, `Entry`, `TimeoutVote`) and `shared/src/strokeData.ts` (`StrokeOp`/`FillOp`/`DrawOps`) match the artifact's Entities section field-for-field. The two previously-recorded End-of-game-controls defects (`onEndGame` and `onVoteToPlayAgain` missing their `reveal`-only guard) are fixed: both now reject with `room-not-in-reveal` outside `Room.status === 'reveal'` (`server/src/socket/handlers.ts:273-276`, `:317-320`), confirmed by `handlers.test.ts:619-637` and `server.test.ts:429,438,748`.

## infrastructure.md

No defects found — the Realtime Sync handler list (`onCreateRoom`, `onJoinRoom`, `onStartGame`, `onEndGame`, `onSetMonochrome`, `onSetTurnTimer`, `onSubmitEntry`, `onCastTimeoutVote`, `onVoteToPlayAgain`, `onPlayAgain`, `onRejoin`, `onDisconnect`) matches `server/src/socket/handlers.ts` exactly. Turn Timer Sweep (`server/src/domain/timerSweep.ts`: 30s interval, 2-minute vote window, plurality-with-lenient-tiebreak resolution) and Session Store (`server/src/domain/sessionTokenStore.ts`: 5-minute TTL) both match their described behavior precisely. `fly.toml`/`Dockerfile` match the Deployment section (single app, single always-on machine, `/healthz` check). No vendored dependency carries a nested `.git`.

## ui.md

No defects found — the previously-recorded defect (PNG save control only rendered in the static show-everything grid, missing from the animated one-book-at-a-time mode) is fixed: `Reveal.svelte` now renders a "Save as PNG" button (`handleSave`) in both the animated-mode section (line 211-213) and the show-everything section (line 287-289).
