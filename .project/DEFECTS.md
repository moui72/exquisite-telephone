# Defects

_Last verified: 2026-07-20_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

Both defects from the previous run (`infrastructure.md`'s incomplete
handler list, `ui.md`'s tooltip-coverage overclaim) were fixed by
`tasks-help-text-accuracy-9755.md` and are gone from this snapshot —
re-verified against the code this run, not assumed.

**A theme worth naming before the individual entries:** four of the seven
findings below are the same underlying gap. `Player.kicked` is honored
where a kicked player is a *source* of work (book origins, prompt
dealing) but ignored wherever they are a *recipient* of it (turn
rotation, timeout-vote membership, roster rendering). Fixing these
one-by-one from the entries below will produce four unrelated-looking
patches; they are one design seam.

## datamodel.md

- **Claim:** `Player.kicked` — a kicked player is excluded "from
  `eligibleVoterIds`/`stalledPlayerIds` on any *subsequent* timeout
  vote."
  **Actual:** `sweepRoom` filters on turn-due-ness alone; `grep kicked
  server/src/domain/timerSweep.ts` returns nothing. A kicked player is
  still collected as a stalled player and, past a round, as an eligible
  voter.
  **Location:** `.project/artifacts/datamodel.md` (Player table) vs
  `server/src/domain/timerSweep.ts:168,177`
  **Severity:** drift — partially masked in practice, since a `writing`-phase
  kick also sets `nonContinuable`; but the sweep is not gated on that
  flag, so a vote can still open and force-empty entries in a frozen
  room.

- **Claim:** *Restart game* "resets the same `Room` in place … kicked
  players are simply excluded from the regenerated `books`" — stated as
  the remedy that makes a `nonContinuable` room continuable again.
  **Actual:** `createBooksForRoom` excludes kicked players as book
  *origins* only. Author rotation and the completion check run over the
  unfiltered roster, so a restarted room still assigns turns to the
  kicked player and stalls on them exactly as before. Verified directly:
  `authorIndex = (originIndex + position) % room.players.length`.
  **Location:** `.project/artifacts/datamodel.md` (Moderation) vs
  `server/src/domain/roomStore.ts:193-201`,
  `shared/src/turnAdvancement.ts:62,70`
  **Severity:** broken-contract — restart's stated purpose does not hold
  once the kicked player's client is gone. No test covers either
  behavior, so an intended-but-undocumented reliance on the kicked client
  still submitting cannot be fully ruled out from the code alone.

## infrastructure.md

- **Claim:** The Curation Store is described as unbounded append-only,
  and the Production Annotations section lists exactly three shortcuts:
  single process, no durable persistence, no zero-downtime deploys.
  **Actual:** The store enforces `MAX_CURATION_EVENTS = 65_536` and
  **silently drops every rating past it** — it logs `curation_store_full`
  once per process and returns. A curator therefore holds the *first*
  65,536 ratings, never the most recent. The code labels this itself with
  an inline `PRODUCTION ANNOTATION` comment; `grep` finds the cap in no
  artifact at all. `constitution.md` makes the placement a rule, not a
  preference: shortcuts live under `## Production Annotations` so
  `/ardd-plan` and `/ardd-audit` can find them in one place.
  **Location:** `server/src/domain/curationStore.ts:71,225-252` vs
  `.project/artifacts/infrastructure.md` (Production Annotations);
  rule at `.project/artifacts/constitution.md:157-163`
  **Severity:** drift — a built, deliberate shortcut that is documented
  in the code and invisible to every tool that reads artifacts.

## ui.md

- **Claim:** "A kicked player is removed entirely from the visible roster
  shown to the host **and other players**."
  **Actual:** Only `ModerationPanel` filters on `!p.kicked`. `Lobby` and
  `TurnStatus` iterate `room.players` unfiltered, and the server
  deliberately keeps kicked players in `Room.players` — so every non-host
  view still lists them, with `TurnStatus` showing them as "at their
  easel…".
  **Location:** `.project/artifacts/ui.md` (Moderation Panel) vs
  `client/src/lib/views/Lobby.svelte:210`,
  `client/src/lib/components/TurnStatus.svelte:16`
  (filter present only at `ModerationPanel.svelte:24`)
  **Severity:** drift — broken-contract for the "and other players" half,
  which no view honors.

- **Claim:** The turn deadline is `roundStartedAt` + `turnTimerMinutes`,
  **plus** any `timerExtensions` for that player.
  **Actual:** Both client and server use `??`, not `+` — an extension
  *replaces* the base duration. A 30-minute timer plus a granted "15
  minutes" yields a deadline 15 minutes after round start, i.e. **earlier
  than the original**.
  **Location:** `.project/artifacts/ui.md` (Writing/Drawing View) vs
  `client/src/lib/views/WritingDrawing.svelte:73-77`,
  `server/src/domain/timerSweep.ts:141`
  **Severity:** drift — note this is documentation-side only in the sense
  that client and server agree with each other; `datamodel.md` states the
  replacing formula and matches the code, so `ui.md` is also inconsistent
  with `datamodel.md`. Which behavior is *correct* is a product decision
  the code cannot settle: a "grant more time" control that can shorten a
  deadline is worth a look on its own merits.

- **Claim:** A player who finishes early "sees a 'waiting for the round to
  finish' state."
  **Actual:** The condition tests `b.entries.length <
  players.length`, but a book completes at `players.length * laps`. Once
  a book passes its first lap the condition goes false and the player
  gets the generic "Awaiting your next commission…" instead. Since
  `defaultLapsPerBook` is 2 below 5 players, this misfires for the entire
  second lap of a **default 3–4 player game**.
  **Location:** `.project/artifacts/ui.md` (Writing/Drawing View) vs
  `client/src/lib/views/WritingDrawing.svelte:44-50`,
  `shared/src/turnAdvancement.ts:61-63`
  **Severity:** drift — the documented state exists but is unreachable in
  the most common game shape.

- **Claim:** The Ended state "displays 'This game has ended' and a
  'Return to home' control … (or, distinctly, if a player tries to rejoin
  a room that already ended)."
  **Actual:** The rejoin-a-dead-room branch renders a bare paragraph with
  no control — a dead end the player cannot leave. The
  `room.status === 'ended'` and kicked branches both do have the control.
  **Location:** `.project/artifacts/ui.md` (States — Ended) vs
  `client/src/App.svelte:38-41` (cf. `:42-52`, `:59-69`)
  **Severity:** drift.

## Checked clean

Recorded so a later run can see what was covered, not merely what failed:

- **`constitution.md` — all ten declared principles verified against
  practice, no violations.** Single-source state (`session.ts:50-55`),
  named shared types, 18 discrete `onX` handlers rather than a monolithic
  switch, structured observability logging on the named operations, a
  27-line entry point, colocated tests on every non-trivial module, and
  pre-commit/CI running the identical lint/typecheck/test gate.
- `datamodel.md` is otherwise accurate throughout: entity shapes,
  optionality, enum values, the clamp formula, both entry-content caps,
  round-gating, laps defaulting, curated position-0 validation,
  position-1 rating with server-side origin, `revealStartedAt` stamping,
  `onEndGame` having no status guard, and the room-code alphabet all
  match the code exactly.
- `infrastructure.md`'s handler list now matches `server/src/socket/
  server.ts` exactly — 18 handlers, none missing, none extra, and no
  `onRatePrompt`.
- The Curation Store's *mechanics* match the artifact precisely:
  server-controlled filenames, traversal guard, exclusive `'wx'` create
  with no temp/rename/debounce, corrupt-file skip with a logged warning,
  events directory derived beside `CURATION_DATA_PATH`.
- The deployment section matches the current files, including this
  session's rework: `ci.yml` triggers on `main` and PRs only with no
  `deploy-prod` job; `promote.yml` is dispatch-only, fast-forwards via a
  plain non-force push, then deploys prod itself.
- Config lockstep is genuinely enforced, not merely asserted: both Fly
  configs are generated, the per-channel values table is `app` alone, a
  test asserts exactly one key, and `check:fly` runs inside `checks`.
- `ui.md`'s tooltip-coverage claim is now true and **enforced** — all
  seven host settings carry their own `InfoTooltip`, and the test derives
  the control list from the rendered DOM rather than a hardcoded count.
- Reveal pacing, the three-way turn hint, curated-hand sourcing, rating
  gating, the Salon Footer's frozen-room badge (glyph, not colour alone),
  and the Gilt Frame's documented placements all verified.

## Not verifiable from the repo

- `infrastructure.md`'s volume table — IDs, sizes, regions, and the "both
  volumes exist and machine regions match" assertion — requires Fly API
  access. Neither confirmed nor contradicted this run.

## Not defects — routed elsewhere

- **Overflow players get empty hands when players outnumber the phrase
  bank** (`shared/src/promptDeal.ts:34-52`). The artifact's clamp text
  doesn't mention the case, but nothing documented is contradicted — a
  documentation gap, not drift.
- `infrastructure.md`'s Client/Server Boundary section lists "draw
  stroke" among the events the client sends; fourteen lines earlier the
  same artifact states explicitly that stroke data never leaves the
  client mid-turn, and no such event exists. Loose illustrative phrasing
  against an authoritative statement — cosmetic, not filed.
</content>
</invoke>
