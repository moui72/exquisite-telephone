---
plan: plan-in-game-rules-and-guidance-2026-07-19-5540.md
generated: 2026-07-19
status: in-progress
---

# Tasks

## Phase 1: Rules Overview Panel
- [ ] T001 [artifacts: ui] Create
  `client/src/lib/components/RulesOverview.svelte`: a dismissible panel
  rendering the core game loop in docent voice — a player writes a
  phrase, the next player draws it having never seen the original
  text, the next player writes a new phrase from only the drawing, and
  so on around the circle; Reveal then shows the whole chain so
  everyone sees how far it drifted. Takes an `onClose` callback prop,
  not shown automatically (parent controls visibility). Write a
  failing test first in `RulesOverview.test.ts` asserting the
  explanation text renders and a dismiss control calls `onClose`;
  confirm it fails, then implement.
- [ ] T002 [artifacts: ui] In `client/src/lib/views/Lobby.svelte`, add
  a "How this salon works" link/button (visible in both the pre-room
  Foyer branch and the in-room branch — both already render from this
  same component) that toggles local visibility state and renders
  `RulesOverview` when open. Write a failing test first in
  `Lobby.test.ts` asserting the link is present before a room exists
  and after joining/creating one, and that clicking it shows the panel
  (and the panel's dismiss control hides it again); confirm it fails,
  then implement.

## Phase 2: Writing/Drawing turn hints
- [ ] T003 [artifacts: ui] [parallel] In
  `client/src/lib/views/WritingDrawing.svelte`, add a short
  docent-voice hint rendered above the prompt/canvas, keyed off the
  existing `myTurn.type` conditional: for a write turn, text making
  clear the player is writing blind from only the drawing before them
  (never told the original phrase); for a draw turn, text making clear
  they should draw exactly what the phrase says, no more and no less.
  Write a failing test first in `WritingDrawing.test.ts` asserting the
  correct hint text renders for each turn type; confirm it fails, then
  implement.

## Phase 3: Host-setting info affordances
- [ ] T004 [artifacts: ui] [parallel] Create
  `client/src/lib/components/InfoTooltip.svelte`: takes `label` and
  `explanation` string props, renders a small `(?)` control that
  reveals the explanation on click/tap (toggle, not hover-only, for
  mobile-friendliness per constitution Principle II). Write a failing
  test first in `InfoTooltip.test.ts` asserting the explanation is
  absent by default and appears after a click; confirm it fails, then
  implement.
- [ ] T005 [artifacts: ui] In `client/src/lib/views/Lobby.svelte`'s
  host-only branch, add an `InfoTooltip` next to each of the three
  host settings: force monochrome (explaining it hides the color
  palette for everyone's drawing tool for the whole game), the turn
  timer selector (explaining a duration lets the room advance a
  stalled round via a timeout vote), and laps per book (explaining
  what a "lap" means — how many times each book passes around the
  circle before Reveal). Write a failing test first in `Lobby.test.ts`
  asserting each setting's `InfoTooltip` explanation text is reachable;
  confirm it fails, then implement. Depends on T004.

## Phase 4: Full-suite verification
- [ ] T006 Run the full test suite, typecheck, and lint across the
  monorepo (shared/server/client workspaces). Confirm everything is
  green, including all existing `Lobby.test.ts` and
  `WritingDrawing.test.ts` coverage — no regressions from T002/T003/T005.
