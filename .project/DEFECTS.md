# Defects

_Last verified: 2026-07-14_

## datamodel.md

- **Claim:** Normalization Rules — End-of-game controls: "Three distinct actions, all only meaningful while `Room.status === 'reveal'`" (Leave game, End game, Play again).
  **Actual:** Only `onPlayAgain` actually enforces this server-side (`server/src/socket/handlers.ts`, rejects with `room-not-in-reveal` when `oldRoom.status !== 'reveal'`). `onEndGame` has no status guard at all — it accepts the transition from any `Room.status` (pre-existing behavior, unchanged by this session's work, but the artifact's new wording now overclaims a restriction that was never actually true for this handler). `onVoteToPlayAgain` also has no status guard — a vote is accepted and pushed onto `Room.playAgainVotes` regardless of room status, contradicting the `Room.playAgainVotes` field's own documented invariant ("Never populated outside `status === 'reveal'`") a few lines above it in the same artifact.
  **Location:** `server/src/socket/handlers.ts:257-282` (`onEndGame`), `server/src/socket/handlers.ts:302-320` (`onVoteToPlayAgain`)
  **Severity:** drift (not exploitable through the normal UI, since the buttons are only rendered on the Reveal page client-side, but the artifact states a server-level invariant that isn't actually enforced)

## ui.md

- **Claim:** Reveal View — "Each book has a save control (available in both modes) that exports it as a PNG image strip."
  **Actual:** The "Save as PNG" button only appears in the static show-everything grid (the `{:else}` branch). The animated one-book-at-a-time mode (`{#if !showEverything && currentBook}` branch) renders no save control at all — a player can't export a book while it's still in the paced/animated view, only after switching to (or auto-advancing into) show-everything mode.
  **Location:** `client/src/lib/views/Reveal.svelte` (compare the animated-mode section, no `handleSave` button, against the show-everything section, which has one)
  **Severity:** drift (a stated feature explicitly promised in both modes is only implemented in one)

## constitution.md

- **Claim:** Quality Standards — "Performance Budgets: any user-observable real-time operation (stroke sync latency, turn-passing, reconnect time) has a stated performance budget, defined per feature when the operation is added."
  **Actual:** Still no artifact states a performance budget for any real-time operation — unchanged from the previous pass (2026-07-14, earlier same day). Deliberately declined as a fix in `plan-4401-2026-07-14-7cf3.md`; carried forward here rather than dropped, since declining a fix doesn't make the underlying claim true.
  **Location:** `.project/artifacts/constitution.md:120-122` (the claim itself); no corresponding budget exists anywhere in `ui.md` or `infrastructure.md`
  **Severity:** drift (pre-existing across the whole project; a known, standing decline)

## infrastructure.md

No defects found — the Realtime Sync handler list (`onCreateRoom`,
`onJoinRoom`, `onStartGame`, `onEndGame`, `onSetMonochrome`,
`onSetTurnTimer`, `onSubmitEntry`, `onCastTimeoutVote`,
`onVoteToPlayAgain`, `onPlayAgain`, `onRejoin`, `onDisconnect`) now
matches `server/src/socket/handlers.ts` exactly — the previous
`onDrawStroke` fictitious-example defect (fixed 2026-07-14, earlier
same day) holds up on re-verification. The `onPlayAgain` per-socket
`roomChanged` unicast description matches `server/src/socket/handlers.ts`'s
implementation exactly (local `io.sockets.adapter.rooms` /
`io.sockets.sockets` lookup, not the cross-process `fetchSockets()`
API). Turn Timer Sweep, Session Store, Export Pipeline, and Deployment
sections all still match their implementations, unaffected by this
session's changes.
