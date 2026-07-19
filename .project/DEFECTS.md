# Defects

_Last verified: 2026-07-19_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

## constitution.md

No defects found — checked all 10 Core Principles, the 3 remaining
Quality Standards (Performance Budgets and No Vendored Dependency With a
Nested `.git` were trimmed this session via `/ardd-refine constitution
--review` and no longer make claims to check), Pre-commit Enforcement,
and CI Enforcement against actual practice. Pre-commit hook
(`.husky/pre-commit`) runs lint → typecheck → test in the claimed order;
CI (`.github/workflows/ci.yml`) runs the same three checks on push and
PR, matching the claim. Entry point (`server/src/index.ts`) is pure
wiring, no inline logic (Principle X). No duplicate/inline-retyped
`Room`/`Player` shapes found outside `shared/src/types.ts`'s single
source (Principle VII). No shared mutable state outside the room/session
stores (Principle VI). Handler dispatch is one named function per event,
not a packed switch (Principle VIII). The previously-recorded standing
drift item (no artifact states a performance budget for any real-time
operation) is now moot — the Quality Standard it tracked against was
trimmed this session as non-load-bearing (never satisfied across 5+
shipped features, declined once already) — and has been dropped from
this file rather than carried forward.

## datamodel.md

No defects found — `shared/src/types.ts` (`Room`, `Player`, `Book`,
`Entry`, `TimeoutVote`) and `shared/src/strokeData.ts`
(`StrokeOp`/`FillOp`/`DrawOps`) match the artifact's Entities section
field-for-field. Every checked normalization rule matches code:
laps-per-book completion math (`shared/src/turnAdvancement.ts:61-62`),
2-minute timeout-vote window (`server/src/domain/timerSweep.ts:13`),
kick setting `nonContinuable`/`kicked` (`handlers.ts:379,381`),
restart-game field reset (`handlers.ts:439-440`), end-game's any-status
guard (`handlers.ts:308-316`).

## infrastructure.md

- **Claim:** the Realtime Sync handler list names `onCreateRoom`,
  `onJoinRoom`, `onStartGame`, `onEndGame`, `onSetMonochrome`,
  `onSetTurnTimer`, `onSubmitEntry`, `onCastTimeoutVote`,
  `onVoteToPlayAgain`, `onPlayAgain`, `onKickPlayer`, `onRestartGame`,
  `onRejoin`, `onDisconnect` as the complete handler set.
  **Actual:** `server/src/socket/handlers.ts` also exports
  `onSetLapsPerBook` (registered in `server/src/socket/server.ts:16`,
  handler defined at `server/src/socket/handlers.ts:221`), wired to a
  `setLapsPerBook` socket event — not listed in the artifact. Likely
  missed when `configurable-laps-per-book` was implemented.
  **Location:** `.project/artifacts/infrastructure.md:38-41` (claim);
  `server/src/socket/handlers.ts:221`, `server/src/socket/server.ts:16`
  (actual)
  **Severity:** cosmetic — the handler exists and works, just isn't
  enumerated in the doc.

Everything else matches: Turn Timer Sweep (30s interval, 2-minute vote
window, plurality-with-lenient-tiebreak resolution), Session Store
(5-minute TTL), Deployment (`fly.toml`/`Dockerfile` — single app, single
always-on machine, `/healthz` check), and the Export Pipeline all match
their described behavior precisely.

## ui.md

No defects found. Two documented-but-undocumented-scope gaps flagged
instead (not drift — code exists, the artifact just hasn't caught up
yet; route via `/ardd-refine ui`, not tracked here):

- The Visual Identity section documents only Fraunces/Rubik/Space Mono.
  This session added a fourth face, `font-title` (Uncial Antiqua), used
  for two title-page moments — the splash heading (`Lobby.svelte:96`)
  and Reveal's header "The Gallery Opens" (`Reveal.svelte:190`) — each
  with a gold-gradient/drop-shadow gilded treatment. Not in the Type
  pairing table or anywhere else in Visual Identity.
- The pre-room Lobby screen ("Foyer") now wraps its create/join form in
  a `GiltFrame` captioned "The Foyer — RSVP Required" (`Lobby.svelte`).
  `ui.md`'s Lobby View section and the Gilt Frame's "everywhere an
  artifact appears" list (room card / easel / gallery wall) don't
  mention this fourth usage site.

Everything else matches: color token hex values match
`tailwind.config.js` exactly; slate-to-token mapping fully applied (zero
`slate-` classes remain in `client/src`); Moderation Panel's
kick/end-game/restart-game visibility rules match `ModerationPanel.svelte`
exactly; `TurnStatus.svelte` matches the "pass the folded paper"
description with no content leakage; the PNG save control (previously
recorded as missing from animated-mode) is confirmed present in both
Reveal modes.
