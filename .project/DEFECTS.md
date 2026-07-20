# Defects

_Last verified: 2026-07-20_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

## infrastructure.md

- **Claim:** The Socket.IO handler list enumerates one named handler per
  event type — `onCreateRoom`, `onJoinRoom`, `onStartGame`, `onEndGame`,
  `onSetMonochrome`, `onSetTurnTimer`, `onSetLapsPerBook`,
  `onSubmitEntry`, `onCastTimeoutVote`, `onVoteToPlayAgain`,
  `onPlayAgain`, `onKickPlayer`, `onRestartGame`, `onRejoin`,
  `onDisconnect` — presented as the complete set.
  **Actual:** `server.ts` wires three further handlers the list omits:
  `onSetPromptMode`, `onSetCuratedPromptCount`, and
  `onSetAllowPromptWriteIn`. All three arrived with
  `curated-prompt-mode`; the artifact's list was corrected in the same
  era to *remove* `onRatePrompt` but was not extended to add these.
  **Location:** `.project/artifacts/infrastructure.md` (Realtime Sync
  handler list) vs `server/src/socket/server.ts`
  **Severity:** drift — the list reads as exhaustive, so an agent
  consulting it to find the prompt-mode handlers concludes they do not
  exist.

## ui.md

- **Claim:** "The same lightweight info-affordance pattern ... is reused
  for **every host-configurable setting** in the Lobby View above — the
  force-monochrome toggle, the turn timer selector, the laps-per-book
  control, and the prompt-mode control."
  **Actual:** Four `InfoTooltip` instances exist against **seven** host
  controls in the Lobby. The curated prompt count selector, the
  allow-write-in toggle, and the small-game acknowledgement checkbox
  have none. The sentence is internally inconsistent as well — it
  asserts "every" and then enumerates four.
  **Location:** `.project/artifacts/ui.md:131-137` vs
  `client/src/lib/views/Lobby.svelte` (tooltips at 226, 242, 263, 284;
  uncovered controls at 307, 325, 339)
  **Severity:** drift — resolvable from either side: add the missing
  tooltips, or narrow the claim to what is actually covered. The code
  side is logged as F003 in
  `.project/feedback/feedback-help-text-audit-e243.md`.

## Checked clean

Recorded so a later run can see what was covered, not merely what
failed:

- `datamodel.md` `Room` fields match `shared/src/types.ts` exactly, in
  both directions.
- `datamodel.md`'s `Entry.content` max-length rule deliberately states
  *two limits exist* without naming the numbers, deferring to the
  constants — so `MAX_TEXT_ENTRY_BYTES` / `MAX_DRAWING_ENTRY_BYTES`
  cannot drift from it by construction. Correct single-source design.
- `infrastructure.md`'s rewritten Curation Store section matches the
  append-only implementation (per-event files, written once, folded on
  demand); no debounce, `flush()`, or `gracefulShutdown` survives in
  code.
- Principle VII (named types over inline duplication): no parallel
  `Room`/`Player`/`Entry` definitions outside `shared/`.
- Principle X (entry point wires only): `server/src/index.ts` is 27
  lines with zero top-level definitions.
- Principle IX (observability): the new curation modules emit structured
  log events on their failure paths.
- The Salon Footer is described in `ui.md` — the previously carried
  code-ahead-of-docs gap is closed.

## Not defects — routed elsewhere

- **`RulesOverview` says a player may write "anything they like"**,
  false in curated mode. This is *not* artifact drift: `ui.md`'s Rules
  Overview Panel section describes the same base loop, so code and
  artifact agree — both simply predate curated mode. Logged as F001 in
  `feedback-help-text-audit-e243.md`, where the design question of what
  the panel should cover belongs.
