---
status: planned
created: 2026-07-18
plan: plan-1449-2026-07-18-2ce0.md
---

# Feedback

## UX

- [x] F001 The `salon-gallery-ui-redesign` implementation only actually
  reskinned the `GiltFrame` component itself (`bg-butter`,
  `border-marigold`, `text-ink`/`font-mono` plaque caption) — everywhere
  else in the app is still stock default Tailwind slate-gray/white with
  no theme applied. Confirmed by grep: zero uses of `font-display` or
  `font-body` anywhere in `client/src` (Fraunces/Rubik are loaded as
  webfonts in `index.html` but never applied via a class), zero uses of
  `bg-butter`/`bg-velvet`/`bg-ink`/`text-ink`/`bg-marigold` outside
  `GiltFrame.svelte` itself. Page headings (Lobby's "Exquisite
  Telephone", Reveal's "Reveal") use `text-slate-800` with the default
  font, not `font-display`. Body text, labels, and most borders/
  backgrounds across `Lobby.svelte`, `WritingDrawing.svelte`, and
  `Reveal.svelte` remain `text-slate-500/600/700/900` and default gray
  borders (`border-slate-200`, unstyled `border`). Only a couple of
  buttons (submit in `WritingDrawing`, "play again"/"vote to play
  again" in `Reveal`) got `bg-bubblegum`/`bg-grass` — everything else
  (tabs, form fields, player list rows, timer/vote-prompt panels,
  save/end-game/leave buttons, `ModerationPanel.svelte`,
  `TurnStatus.svelte`, `App.svelte` terminal states) kept its
  pre-redesign slate styling. Net effect: the app reads as one
  well-styled framed island in an otherwise unstyled page, not the full
  reskin the plan intended. The theme tokens and Docent Voice copy exist
  and are correct where applied — they just weren't applied broadly
  enough. [artifacts: ui]
