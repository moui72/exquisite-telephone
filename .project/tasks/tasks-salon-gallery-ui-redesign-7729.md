---
plan: plan-salon-gallery-ui-redesign-2026-07-18-885b.md
generated: 2026-07-18
status: ready
---

# Tasks

## Phase 1: Design tokens & signature component

- [ ] T001 [artifacts: ui] Extend `client/tailwind.config.js`'s
  `theme.extend` with the six color tokens (Ink `#241B2F`, Velvet
  `#2E1A47`, Marigold `#F5A623`, Bubblegum `#FF6F91`, Butter `#FFF3D6`,
  Grass `#2FA88A`) and three font-family roles (`display`: Fraunces,
  `body`: Rubik, `mono`: Space Mono per Tailwind's `fontFamily` key), and
  load the three webfonts in `client/index.html`. Configuration only, no
  test.
- [ ] T002 [artifacts: ui] [parallel] Write a failing component test for
  a new `client/src/lib/components/GiltFrame.svelte` asserting: (a) it
  renders its default slot content, (b) it renders a `caption` prop as
  visible plaque text, (c) with `matchMedia` mocked to match
  `prefers-reduced-motion: reduce`, it omits whatever CSS class triggers
  the frame's decorative motion. Confirm the test fails (component
  doesn't exist), then implement `GiltFrame.svelte`.

## Phase 2: Lobby View

- [ ] T003 [artifacts: ui] Write failing tests in `Lobby.test.ts`
  asserting the room card renders inside `GiltFrame` (from T002) with a
  plaque caption, and that the lobby's button/label copy has been
  updated to the docent voice (host-facing controls: "start game,"
  "force monochrome," turn timer selector, the low-player-count override
  checkbox). Confirm failures, then implement in `Lobby.svelte`, writing
  final microcopy consistent with the Docent Voice rule in `ui.md`.

## Phase 3: Writing / Drawing View

- [ ] T004 [artifacts: ui] [parallel] Write failing tests in
  `WritingDrawing.test.ts` asserting the canvas/text-entry surface
  renders inside `GiltFrame` (from T002), and that its copy (submit
  control, waiting states, timeout-vote prompt and its four options) has
  been updated to the docent voice, preserving every existing
  event/prop contract. Confirm failures, then implement in
  `WritingDrawing.svelte`.
- [ ] T005 [artifacts: ui] [parallel] Restyle `DrawingCanvas.svelte`'s
  toolbar (color palette, width presets, fill tool) with the new
  theme's Tailwind classes. Purely visual — no behavior change, no test
  addition; existing `DrawingCanvas.test.ts` coverage must continue to
  pass unmodified.
- [ ] T006 [artifacts: ui] [parallel] Write a failing test in
  `TurnStatus.test.ts` asserting its copy has been updated to the
  docent voice. Confirm failure, then implement.

## Phase 4: Reveal View

- [ ] T007 [artifacts: ui] Write a failing test asserting a new
  `prefersReducedMotion` derived store (new file, e.g.
  `client/src/lib/stores/prefersReducedMotion.ts`) reflects
  `matchMedia('(prefers-reduced-motion: reduce)').matches` and updates
  on the media query's `change` event. Confirm failure, then implement.
- [ ] T008 [artifacts: ui] Write failing tests in `Reveal.test.ts`
  asserting: (a) each book renders inside `GiltFrame` (from T002) with a
  plaque caption (mock-formal exhibit title incorporating the origin
  author's name), (b) the spotlight/curtain flourish class is present
  by default and absent when `prefersReducedMotion` (from T007) is
  true, (c) the existing clock-derived auto-advance book-index/entry-
  count computation is unchanged (regression assertions against current
  behavior), (d) all Reveal-page copy (save control, end-of-game
  controls, "N of N ready") has been updated to the docent voice.
  Confirm failures, then implement in `Reveal.svelte`.

## Phase 5: Moderation Panel & terminal states

- [ ] T009 [artifacts: ui] [parallel] Write failing tests in
  `ModerationPanel.test.ts` asserting its copy (kick, end game, restart
  game, "this game can't continue" notice) has been updated to the
  docent voice. Confirm failures, then implement.
- [ ] T010 [artifacts: ui] [parallel] Write failing tests covering
  `App.svelte`'s terminal states (Empty, Ended, Error, Kicked,
  Reconnecting) asserting their copy has been updated to the docent
  voice. Confirm failures, then implement.

## Phase 6: Full-suite verification

- [ ] T011 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run
  test` across the whole workspace; confirm all green with no
  regressions to existing (non-copy, non-styling) test assertions.
