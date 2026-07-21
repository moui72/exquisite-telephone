# Defects

_Last verified: 2026-07-21_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

The seven defects from the 2026-07-20 snapshot were all fixed (plans
`plan-25a0`, `plan-4663`, `plan-aed6`) and re-verified gone this run, so
they have dropped out. One new broken-contract was found.

## datamodel.md

- **Claim:** Normalization Rules — Laps per book: "A book completes after
  `Room.players.length * <resolved lapsPerBook>` entries rather than a
  single rotation," and `defaultLapsPerBook` is 2 for fewer than 5 active
  players. Multi-lap play is the documented default for small games.
  **Actual:** `onSubmitEntry` has an earlier, laps-unaware
  `book-complete` guard — `if (book.entries.length >= room.players.length)
  { ack({ error: 'book-complete' }); return; }` — that runs *before* the
  laps-aware `computeNextEntry` is consulted. For any `lapsPerBook >= 2`,
  the first submission of lap 2 (`book.entries.length === players.length`)
  is rejected `book-complete`, so a book can never advance past a single
  rotation through the submission path. Because `onStartGame` resolves
  `lapsPerBook` to `defaultLapsPerBook(active)` = **2** for the common
  <5-player game, the **default** configuration is affected: a default
  3-player game is blocked at the start of lap 2.
  **Actual (correct half, for contrast):** `computeNextEntry`
  (`shared/src/turnAdvancement.ts`) completes correctly at
  `position >= activeCount * laps` — the guard in `onSubmitEntry` shadows
  it.
  **Location:** `server/src/socket/handlers.ts` — `onSubmitEntry`, the
  `book.entries.length >= room.players.length` guard (~L640, ahead of the
  `computeNextEntry(room, book)` call ~L645). Contrast
  `shared/src/turnAdvancement.ts` — `computeNextEntry`
  (`position >= activeCount * laps`).
  **Severity:** broken-contract — the documented multi-lap behavior is
  unreachable via submission, and the affected case is the default. The
  guard also uses raw `players.length` rather than the active-count basis
  the rest of the turn engine now uses, so it is doubly out of step.
  **Why it shipped undetected:** no test drives a multi-lap game to
  completion through `onSubmitEntry`. `server.test.ts`'s full-game flows
  explicitly pin `lapsPerBook = 1` ("submission/completion/reconnect
  flows, not laps-per-book behavior"), and the `book-complete` unit test
  in `handlers.test.ts` uses a 1-player room. The laps logic in
  `computeNextEntry` is unit-tested in isolation, so the redundant guard
  went unexercised for `laps > 1`.

## Checked clean

Re-verified consistent this run (recorded so a later run sees coverage,
not just failures):

- **All seven prior defects are fixed and re-verified:** the kicked-player
  seam (rotation, vote membership, roster rendering) now reads through
  `activePlayers`; timer extensions are additive
  (`roundStartedAt + base + (ext ?? 0)`); `onStartGame`'s minimum-player
  gate and lap default resolve from the active count; the Lobby's live
  displays count active players; the game-ended-error screen has a return
  control; and the curation cap is annotated in `infrastructure.md`.
- **`infrastructure.md` — fully clean.** All 18 Socket.IO handlers match
  `server/src/socket/server.ts`; session store, timer sweep, and curation
  store mechanics match; `MAX_CURATION_EVENTS = 65_536` matches the
  Production Annotation; env vars (`PORT`, `CURATION_DATA_PATH`) match
  `config.ts`; and the reworked deployment topology (ci.yml on `main`+PRs
  with no `deploy-prod`; promote.yml dispatch-only, fast-forward +
  self-deploy with `FLY_API_TOKEN_PROD`, no PAT; v5 actions; generated Fly
  configs) matches the current files.
- **`ui.md` — clean.** Seven host-setting tooltips (one each), rules-panel
  scope, curated-controls-hidden-in-free-form, and the Lobby active-count
  displays all verified; every field the UI branches on exists in
  `shared/src/types.ts`.
- **`constitution.md` — clean.** Named types (sole `shared/src/types.ts`),
  entry-wires-only (`index.ts`), decomposed dispatch (~19 `onX`
  handlers), observability logging, pre-commit + CI gates, production
  annotations, and behavioral test coverage all hold.
- **`datamodel.md`** is otherwise fully consistent: all entity
  shapes/optionality/enums, the deal clamp, curated position-0/rating
  logic, kick/`nonContinuable`/restart, reveal/play-again, and the three
  persisted curation entities match the code. Only the `book-complete`
  guard above diverges.

## Not defects — routed elsewhere

- **Reveal play-again readiness count uses the raw roster.**
  `Reveal.svelte` renders `playAgainVotes.length` of `players.length`, not
  the active count — a player kicked during `reveal` would inflate the
  denominator. This is *not* `ui.md` drift: the End-of-game section does
  not specify active-only for this count, so no documented contract is
  violated. It is only inconsistent with the active-count discipline
  applied everywhere else, and is a candidate `/ardd-feedback` item if
  that consistency is wanted, not a code-vs-artifact defect.
- **`DrawingCanvas.svelte` palette comment says "8-color" but the array
  holds 9** (includes white). A code-internal comment nit; `ui.md` states
  no count, so it is not artifact drift.
</content>
