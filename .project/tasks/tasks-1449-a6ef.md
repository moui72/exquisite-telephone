---
plan: plan-1449-2026-07-18-2ce0.md
generated: 2026-07-18
status: in-progress
---

# Tasks

## Phase 1: ui.md clarification

- [x] T001 [artifacts: ui] In `ui.md`'s Visual Identity section, add:
  (a) an explicit statement that the color tokens and type pairing
  apply to every view's chrome globally — page backgrounds, headings,
  body text, borders, and controls — not solely to the `GiltFrame`
  component; (b) the slate-to-token mapping table (text-slate-900/800
  -> text-ink; text-slate-700 -> text-ink/90; text-slate-600 ->
  text-ink/75; text-slate-500 -> text-ink/60; text-slate-400 ->
  text-ink/45; border-slate-200 -> border-marigold/30; bg-slate-800
  primary buttons -> bg-bubblegum; bg-slate-100 -> bg-butter; plain
  gray secondary buttons -> border-marigold/60 bg-butter text-ink), so
  a future pass has a concrete, referenceable rule instead of ad hoc
  per-file judgment. Addresses feedback F001 in
  `.project/feedback/feedback-main-5fdc.md`.

## Phase 2: Global base layer

- [x] T002 [artifacts: ui] Write a failing test asserting
  `client/src/app.css` contains a `@layer base` rule setting `body`'s
  background to the `butter` token, text color to `ink`, and font to
  the `body` family, plus a rule applying `font-display` to `h1`/`h2`.
  Confirm the test fails (the rule doesn't exist yet), then add it to
  `app.css`.

## Phase 3: Per-view reskin

- [x] T003 [artifacts: ui] [parallel] In `Lobby.svelte`, replace every
  `text-slate-*`/`bg-slate-800`/plain-gray-border class with its mapped
  token per T001's table (the "start game" button becomes
  `bg-bubblegum`; the page heading gets `font-display`). Add a
  source-scan test to `Lobby.test.ts` asserting the file's source
  contains no `slate-` substring; confirm it fails first, then apply
  the fix until it passes.
- [x] T004 [artifacts: ui] [parallel] Same treatment for
  `WritingDrawing.svelte` (source-scan test added to
  `WritingDrawing.test.ts`) — note the existing `nonContinuable`/
  timeout-vote alert boxes (red/amber) are functional status colors
  and stay as-is; only the neutral slate text/labels/borders around
  them are in scope.
- [x] T005 [artifacts: ui] [parallel] Same treatment for
  `Reveal.svelte` (source-scan test added to `Reveal.test.ts`),
  including the `bg-slate-100` cover-art placeholder box ->
  `bg-butter`, and the page heading -> `font-display`.
- [ ] T006 [artifacts: ui] [parallel] Same treatment for
  `ModerationPanel.svelte` (source-scan test added to
  `ModerationPanel.test.ts`).
- [ ] T007 [artifacts: ui] [parallel] Same treatment for
  `App.svelte`'s terminal-state `<main>` blocks (Reconnecting,
  game-ended, Kicked, Ended) — currently all `text-slate-600` — plus a
  source-scan test added to `App.test.ts`.
- [ ] T008 [artifacts: ui] [parallel] Check `TurnStatus.svelte` and
  `DrawingCanvas.svelte`'s toolbar for any remaining slate/plain-gray
  classes (both were mostly handled by the prior plan; `TurnStatus.svelte`
  showed zero slate matches in a pre-plan grep, so this may be a no-op
  confirmation rather than a real fix). Add the same source-scan test
  to each file's test suite (scoping `DrawingCanvas`'s scan to the
  toolbar template region only, never the canvas element's own
  `bg-white`) to lock in the guarantee either way.

## Phase 4: Full-suite verification

- [ ] T009 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run
  test` across the whole workspace; confirm all green with no
  regressions.
