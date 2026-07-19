---
status: approved
branch: in-game-rules-and-guidance
created: 2026-07-19
features: [in-game-rules-and-guidance]
surfaced-defects: []
---

# Plan: in-game rules and guidance

## Goal

Give players and hosts in-context explanations of how the game works —
a dedicated rules overview, explanatory turn-interface text, and
tooltips for every host setting — where today there is none at all.

## Scope

In scope:
- A Rules Overview Panel explaining the core game loop, reachable from
  both the Foyer and the Lobby (`ui.md`).
- Short docent-voice hints on the Writing / Drawing View clarifying
  each turn type's actual job.
- An info affordance next to each host-configurable Lobby setting
  (force monochrome, turn timer, laps per book) explaining its
  consequence before the host picks a value.

Out of scope:
- Any other "guiding text elsewhere" the original backlog description
  gestured at but didn't name — the artifact deliberately left this
  open rather than inventing scope; further spots become a
  `/ardd-feedback` item once someone notices a real gap during use.
- Any change to game logic, `Room`/`Player` fields, or server behavior
  — this is a pure client-side content/UI addition. No `datamodel.md`
  or `infrastructure.md` changes were needed.

## Technical Approach

All new copy lives in the client only, matching the existing pattern
of static docent-voice content already present throughout `ui.md`
(e.g. `Lobby.svelte`'s `ERROR_COPY` map). The Rules Overview Panel is a
new Svelte component, opened via a link/button from both `Lobby.svelte`
(covers both the pre-room Foyer state and the in-room state, since both
render from the same component per `ui.md`'s Lobby View) — no new
route or server round-trip, just local component visibility state. The
info-affordance pattern (a small `(?)` control revealing short text on
tap/click) is a single small reusable component, applied to the three
existing host settings already rendered in `Lobby.svelte`'s host
branch. The Writing/Drawing turn hints are static strings keyed off
the existing `myTurn.type` conditional already present in
`WritingDrawing.svelte` — no new state.

## Phase Breakdown

### Phase 1: Rules Overview Panel
- T001 [artifacts: ui] Create a
  new `RulesOverview.svelte` component rendering the core-loop
  explanation in docent voice (write blind → draw from the writing →
  write blind from the drawing → repeat → Reveal shows the whole
  chain), dismissible, not shown automatically. Test-first: a
  component test asserting it renders the explanation and a dismiss
  control that hides it.
- T002 [artifacts: ui] Add a "How
  this salon works" link/button to `Lobby.svelte` that opens
  `RulesOverview`, visible in both the pre-room (Foyer) and in-room
  states. Test-first: a test asserting the link is present and toggles
  the panel's visibility in both states.

### Phase 2: Writing/Drawing turn hints
- T003 [artifacts: ui] [parallel]
  Add a short docent-voice hint above the prompt/canvas in
  `WritingDrawing.svelte`, distinct text for the write turn ("blind
  from the drawing, never the original phrase") versus the draw turn
  ("draw exactly what the phrase says"), keyed off the existing
  `myTurn.type` conditional. Test-first: a test asserting the correct
  hint text renders for each turn type.

### Phase 3: Host-setting info affordances
- T004 [artifacts: ui] [parallel]
  Create a small reusable `InfoTooltip.svelte` (or equivalent) taking a
  label and explanation string, rendering a `(?)` control that reveals
  the explanation on tap/click. Test-first: a test asserting the
  explanation is hidden by default and shown on interaction.
- T005 [artifacts: ui] Apply
  `InfoTooltip` next to all three host settings in `Lobby.svelte`
  (force monochrome, turn timer, laps per book) with docent-voice
  explanations of each setting's consequence. Depends on T004.
  Test-first: a test per setting asserting its tooltip explanation is
  present.

### Phase 4: Full-suite verification
- T006 Run the full test suite, typecheck, and lint across the
  monorepo. Confirm all green, no regressions in existing
  `Lobby.test.ts` / `WritingDrawing.test.ts` coverage.

## Open Questions

- None — the artifact deliberately scopes to the three concrete asks
  and leaves further guiding-text spots to a future `/ardd-feedback`
  round once real gaps are noticed in use, rather than guessing at
  them now.

## Production Annotation Summary

- None — no production shortcut involved; this is a complete,
  non-provisional implementation of the described scope.
