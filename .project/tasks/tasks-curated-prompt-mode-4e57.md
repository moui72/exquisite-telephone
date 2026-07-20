---
plan: plan-curated-prompt-mode-2026-07-19-cfab.md
generated: 2026-07-19
status: in-progress
---

# Tasks

## Phase 1: Shared types, phrase bank, and deal logic

- [x] T001 [artifacts: datamodel] Extend the `Room` type in
  `shared/src/types.ts` with four new fields, matching the flat-field
  convention already used by `monochromeOnly` / `turnTimerMinutes` /
  `lapsPerBook`: `promptMode: 'free-form' | 'curated'` (defaults
  `'free-form'`), `curatedPromptCount: 2 | 3 | 4 | 5 | null`,
  `allowPromptWriteIn: boolean` (defaults `true`), and `dealtPrompts:
  Record<string, string[]>` (empty `{}` in free-form mode). Update
  every existing room-construction site so the new fields are populated
  at their defaults. Test-first per Principle III: extend
  `shared/src/types.test.ts` with a failing assertion on the new shape
  before implementing.

- [x] T002 [parallel] Create the curated phrase bank as a static
  exported constant in `shared/` (new file, e.g.
  `shared/src/promptBank.ts`) — a frozen array of short, drawable
  phrases in the game's playful register. Size it to at least 200
  entries so a realistic room never reaches the deal-time clamp (see
  T003): even 12 players at the maximum hand size of 5 needs only 60.
  Test-first: a new `shared/src/promptBank.test.ts` asserting the bank
  is non-empty, has no duplicate entries, and meets the documented
  minimum size — written and confirmed failing before the constant
  exists.

- [x] T003 [artifacts: datamodel] Create the deal function in `shared/`
  (new file, e.g. `shared/src/promptDeal.ts`) as a pure function over
  `(bank: readonly string[], playerIds: string[], requestedCount:
  number, shuffle?: (items) => items)` returning `Record<string,
  string[]>`. It shuffles the bank once and *partitions* the result
  across players — never sampling per player — so the
  no-phrase-reaches-two-players guarantee is structural rather than a
  retry-until-distinct loop. Clamp the effective count to
  `Math.floor(bank.length / playerIds.length)` with a floor of 1, per
  [[datamodel]] Normalization Rules — Curated prompts. The shuffle is
  injectable so tests are deterministic without stubbing global
  randomness. Test-first: a new `shared/src/promptDeal.test.ts` covering
  (a) every player gets exactly the requested count, (b) no phrase
  appears in two players' hands, (c) a room large enough to exhaust the
  bank clamps rather than throwing or repeating, (d) the floor-1 case
  where players outnumber the bank.

## Phase 2: Server — host settings, deal, and submission validation

- [x] T004 [artifacts: datamodel] Add three host-only setting handlers
  to `server/src/socket/handlers.ts`, each mirroring the existing
  `onSetLapsPerBook` shape (host-only guard, `status === 'lobby'`
  guard, `roomUpdated` broadcast) and registered as separate named
  handlers per Principle VIII rather than one multi-field handler:
  `onSetPromptMode`, `onSetCuratedPromptCount`, `onSetAllowPromptWriteIn`.
  Wire each into the dispatch surface in `server/src/server.ts` alongside
  the existing setters. Test-first: extend the server handler tests with
  failing cases for each handler covering the happy path, the non-host
  rejection, and the after-lobby rejection.

- [x] T005 [artifacts: datamodel] Call the T003 deal from both
  `createBooksForRoom` call sites in `server/src/socket/handlers.ts` —
  `onStartGame` (~line 155) and the restart path (~line 435) — populating
  `Room.dealtPrompts` for non-kicked players only when
  `Room.promptMode === 'curated'`, and leaving it `{}` otherwise. Restart
  re-deals a fresh hand alongside the regenerated books. Test-first:
  failing server tests asserting the deal happens on start, re-deals on
  restart, excludes kicked players, and stays empty in free-form mode.

- [ ] T006 [artifacts: datamodel] Validate opening-turn submissions in
  `onSubmitEntry`: when the submitted entry is at `position === 0` and
  the room is in curated mode, accept the content only if it matches one
  of the *submitting player's own* `dealtPrompts` entries, or is any
  non-empty free text when `Room.allowPromptWriteIn` is `true`; reject
  otherwise with a named error code. The server derives the mode from
  room state and never trusts a client-supplied claim about it. Entries
  at `position > 0` are untouched by this check — they stay free-form
  unconditionally in both modes. Test-first: failing tests for accepting
  a dealt phrase, rejecting another player's dealt phrase, rejecting
  arbitrary text when write-in is off, accepting it when on, and leaving
  `position > 0` submissions unaffected.

## Phase 3: Client — Lobby host controls

- [ ] T007 [artifacts: ui] Add the host "prompt mode" control
  (free-form / curated) to `client/src/lib/views/Lobby.svelte`, emitting
  the T004 socket events. When curated is selected, reveal two dependent
  controls — a count selector (2 / 3 / 4 / 5) and an "allow write-in"
  toggle, default on. Per [[ui]] Lobby View these are hidden entirely in
  free-form mode, not shown disabled, since they have no meaning there.
  Match the existing host-settings styling and docent-voice copy
  register. Test-first: failing cases in `Lobby.test.ts` asserting the
  dependent controls are absent in free-form mode, present in curated
  mode, and that changing each emits the right event.

- [ ] T008 [artifacts: ui] Attach an `InfoTooltip` info affordance to
  the prompt-mode control, matching the existing three host settings.
  Copy explains that curated deals each player a private hand to choose
  from and that no two players are ever offered the same phrase. Reuse
  the explicit `id`/`for` association pattern the existing tooltips use —
  do not nest the tooltip button inside the setting's `<label>`, which
  previously broke implicit label association. Test-first: a failing
  assertion that the tooltip is reachable and has a distinct accessible
  name.

## Phase 4: Client — opening-turn selection and hint correction

- [ ] T009 [artifacts: ui] Add the opening-turn branch to
  `client/src/lib/views/WritingDrawing.svelte`. When `myTurn.position
  === 0` and the room is in curated mode, present that player's own
  `Room.dealtPrompts` hand as a selectable choice (one selection,
  committed on submit) instead of the plain text input, plus a
  write-your-own option revealing a free-text field when
  `Room.allowPromptWriteIn` is `true`. Never render another player's
  hand. Free-form mode keeps today's input unchanged. Test-first:
  failing cases in `WritingDrawing.test.ts` for the curated opening turn
  rendering the hand, the write-in option appearing only when allowed,
  and free-form mode being unchanged.

- [ ] T010 [artifacts: ui] Split the turn hint three ways in
  `client/src/lib/views/WritingDrawing.svelte`, replacing the current
  two-way `Entry.type` branch: the draw-turn hint (unchanged), the
  later-text hint for `position > 0` (the existing blind-guess copy),
  and a new opening-turn hint for `position === 0` framing the player as
  setting the phrase the rest of the circle will chase. This corrects an
  existing bug — the blind-guess copy ("you have never been told the
  original phrase, only what you see drawn above") currently renders on
  the opening turn, where no preceding entry exists and the claim is
  false. Test-first: a failing assertion that the opening turn does
  *not* render the blind-guess copy and does render the origin-turn
  copy.

## Phase 5: Full-suite verification

- [ ] T011 Run the full verification suite from the repo root — `pnpm
  lint`, `pnpm typecheck`, `pnpm test` — and confirm all three are green
  across shared, server, and client. No test requirement of its own;
  this task *is* the verification. Report the final test count and any
  new files reflected in the typecheck file count.
