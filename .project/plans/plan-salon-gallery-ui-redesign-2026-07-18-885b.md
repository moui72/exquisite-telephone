---
status: approved
branch: salon-gallery-ui-redesign
created: 2026-07-18
features: [salon-gallery-ui-redesign]
surfaced-defects: []
---

# Plan: Salon/Gallery UI Redesign

## Goal

Reskin the client's visual identity around a "tongue-in-cheek exquisite"
salon/gallery theme — candy-bright color tokens, Fraunces/Rubik/Space
Mono type, a reusable Gilt Frame signature component, and docent-voiced
copy — across Lobby, Writing/Drawing, Reveal, the Moderation Panel, and
terminal states, replacing the current unbranded default-Tailwind look,
with no change to game logic, data model, or server behavior.

## Scope

**In scope:**
- Tailwind theme extension: the six color tokens, three font-family
  roles (Fraunces/Rubik/Space Mono), loaded via `client/index.html` or
  `app.css`.
- A new reusable `GiltFrame.svelte` component (ornate frame + plaque
  caption), used by Lobby's room card, the Writing/Drawing canvas/text
  surface, and each Reveal book.
- Visual reskin (Tailwind classes only, no layout/logic restructuring
  beyond what's needed to slot content into `GiltFrame`) of: `Lobby.svelte`,
  `WritingDrawing.svelte`, `DrawingCanvas.svelte`'s toolbar,
  `Reveal.svelte`, `ModerationPanel.svelte`, `TurnStatus.svelte`, and
  `App.svelte`'s terminal states (Ended/Kicked/Error/Reconnecting).
- Docent-voice copy rewrite for every user-facing string in the above
  components, per the voice rule now documented in `ui.md`.
- `prefers-reduced-motion` handling for Reveal's spotlight/curtain
  flourish (decorative only — the underlying server-synced auto-advance
  pacing is unaffected).

**Out of scope:**
- Any change to `Room`/`Player`/`Book`/`Entry` shape, socket handlers, or
  server behavior — this plan is presentation-layer only.
- The Reveal auto-advance pacing algorithm itself (already
  server-synchronized per `Room.revealStartedAt`) — only its decorative
  dressing changes.
- Cover-art generation algorithm (`lib/reveal/coverArt.ts`) — may get
  restyled color inputs to match the new palette, but its
  deterministic-seeding logic is untouched.
- A full component library or design-token build pipeline — six Tailwind
  theme values and one new component is proportionate to a small app
  (constitution Principle I).

## Technical Approach

Tailwind's `theme.extend` gains the six named colors and three font
families as documented in `ui.md`'s new Visual Identity section; fonts
load via `@font-face`/Google Fonts `<link>` in `client/index.html` (exact
mechanism is an implementation-time call, not gated on anything here).

`GiltFrame.svelte` is a single new component: a named slot for the framed
content, a `caption` prop for the plaque text, and a CSS-only ornate
border (no images) so it scales cleanly across viewport sizes (mobile-
friendly per constitution Principle II). It renders identically
everywhere it's used — Lobby, Writing/Drawing, Reveal — so there is
exactly one place to adjust the frame's look.

Each view is restyled in place: existing component structure, props, and
event dispatches are preserved; only Tailwind classes, wrapping markup
(to slot into `GiltFrame`), and copy strings change. No new Svelte stores,
no new socket events, no new derived state.

Reduced motion is handled with a small `prefersReducedMotion` derived
store (reading `matchMedia('(prefers-reduced-motion: reduce)')`, same
pattern other browser-preference reads in this codebase would use) that
`Reveal.svelte` consults to conditionally apply (or skip) the
spotlight/curtain CSS animation class — the auto-advance timing logic
itself (`Room.revealStartedAt`-derived) is untouched either way.

## Phase Breakdown

### Phase 1 — Design tokens & signature component
No dependencies.

- T001 [artifacts: ui] Extend `client/tailwind.config.js`'s `theme.extend`
  with the six color tokens (Ink `#241B2F`, Velvet `#2E1A47`, Marigold
  `#F5A623`, Bubblegum `#FF6F91`, Butter `#FFF3D6`, Grass `#2FA88A`) and
  three font-family roles (`display`: Fraunces, `body`: Rubik, `mono`:
  Space Mono per Tailwind's `fontFamily` key), and load the three
  webfonts in `client/index.html`. Configuration only, no test.
- T002 [artifacts: ui] [parallel] Write a failing component test for a
  new `client/src/lib/components/GiltFrame.svelte` asserting: (a) it
  renders its default slot content, (b) it renders a `caption` prop as
  visible plaque text, (c) with `matchMedia` mocked to match
  `prefers-reduced-motion: reduce`, it omits whatever CSS class triggers
  the frame's decorative motion. Confirm the test fails (component
  doesn't exist), then implement `GiltFrame.svelte`.

### Phase 2 — Lobby View
Depends on Phase 1.

- T003 [artifacts: ui] Write failing tests in `Lobby.test.ts` asserting
  the room card renders inside `GiltFrame` with a plaque caption, and
  that the lobby's button/label copy has been updated to the docent
  voice (host-facing controls: "start game," "force monochrome," turn
  timer selector, the low-player-count override checkbox). Confirm
  failures, then implement in `Lobby.svelte`, writing final microcopy
  consistent with the Docent Voice rule in `ui.md`.

### Phase 3 — Writing / Drawing View
Depends on Phase 1. Independent of Phase 2 (different files).

- T004 [artifacts: ui] [parallel] Write failing tests in
  `WritingDrawing.test.ts` asserting the canvas/text-entry surface
  renders inside `GiltFrame`, and that its copy (submit control, waiting
  states, timeout-vote prompt and its four options) has been updated to
  the docent voice, preserving every existing event/prop contract.
  Confirm failures, then implement in `WritingDrawing.svelte`.
- T005 [artifacts: ui] [parallel] Restyle `DrawingCanvas.svelte`'s
  toolbar (color palette, width presets, fill tool) with the new theme's
  Tailwind classes. Purely visual — no behavior change, no test
  addition; existing `DrawingCanvas.test.ts` coverage must continue to
  pass unmodified.
- T006 [artifacts: ui] [parallel] Write a failing test in
  `TurnStatus.test.ts` asserting its copy has been updated to the docent
  voice. Confirm failure, then implement.

### Phase 4 — Reveal View
Depends on Phase 1. Independent of Phases 2–3 (different files).

- T007 [artifacts: ui] Write a failing test asserting a new
  `prefersReducedMotion` derived store (new file, e.g.
  `client/src/lib/stores/prefersReducedMotion.ts`) reflects
  `matchMedia('(prefers-reduced-motion: reduce)').matches` and updates on
  the media query's `change` event. Confirm failure, then implement.
- T008 [artifacts: ui] Write failing tests in `Reveal.test.ts` asserting:
  (a) each book renders inside `GiltFrame` with a plaque caption
  (mock-formal exhibit title incorporating the origin author's name),
  (b) the spotlight/curtain flourish class is present by default and
  absent when `prefersReducedMotion` (from T007) is true, (c) the
  existing clock-derived auto-advance book-index/entry-count computation
  is unchanged (regression assertions against current behavior), (d) all
  Reveal-page copy (save control, end-of-game controls, "N of N ready")
  has been updated to the docent voice. Confirm failures, then implement
  in `Reveal.svelte`.

### Phase 5 — Moderation Panel & terminal states
Depends on Phase 1. Independent of Phases 2–4 (different files).

- T009 [artifacts: ui] [parallel] Write failing tests in
  `ModerationPanel.test.ts` asserting its copy (kick, end game, restart
  game, "this game can't continue" notice) has been updated to the
  docent voice. Confirm failures, then implement.
- T010 [artifacts: ui] [parallel] Write failing tests covering
  `App.svelte`'s terminal states (Empty, Ended, Error, Kicked,
  Reconnecting) asserting their copy has been updated to the docent
  voice. Confirm failures, then implement.

### Phase 6 — Full-suite verification
Depends on Phases 2–5.

- T011 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test`
  across the whole workspace; confirm all green with no regressions to
  existing (non-copy, non-styling) test assertions.

## Open Questions

- Exact microcopy for every individual label/button is intentionally
  left to each implementing task rather than pre-scripted here — each
  task states which controls need new copy, and the Docent Voice rule
  in `ui.md` (mock-formal register, stable verb-per-action) is the
  guide. Flag here only if a reviewer wants to approve copy separately
  before implementation.
- Font delivery mechanism (self-hosted font files vs. a Google Fonts
  `<link>`/`@import`) is left as an implementation-time call in T001 —
  doesn't affect any artifact decision either way.
- Exact CSS treatment of the spotlight/curtain flourish (e.g. a radial
  gradient dim + fade-in vs. a literal animated curtain-sweep) is left
  to T008's implementation, bounded by the reduced-motion rule already
  fixed in `ui.md`.
