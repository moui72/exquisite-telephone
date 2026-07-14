---
name: ui
status: stable
last_updated: 2026-07-13
diagram_status: unrendered
diagram_type: graph TD
render_section: UI
render_hint: |
  Each component as a node, with parent -> child edges based on the component
  nesting described here. Annotate leaf nodes that receive computed data with
  a short edge label. Omit state management detail — structure only.
---

# UI

## Overview

A Svelte single-page app, mobile-friendly by requirement (Principle II —
[[constitution]]), covering the full session shape: create/join a room by
code, write a phrase, draw a phrase, wait for your turn, and reveal each
book's chain at the end. No accounts — a player's identity is just a
display name entered at join time.

## Lobby View

Host creates a room (gets a shareable room code); other players join by
entering the code and a display name. Shows connected players and a
"start game" control visible only to the host. Reflects `Room.status ==
'lobby'` and the live `players` list from server state.

## Writing / Drawing View

The core gameplay loop. Each player sees either a text-entry prompt
(write a phrase) or a canvas (draw the previous phrase), depending on
`Entry.type` for their current turn, driven entirely by server-broadcast
room state (Principle VI — no client-side authoritative state). The
canvas uses pointer events for mobile-friendly touch drawing (Principle
II / touch cleanup quality standard), with listeners registered and torn
down across Svelte's component lifecycle.

A simple turn-status indicator shows who's still working, without
revealing content — mirrors the "pass the folded paper" mechanic.

## Reveal View

At `Room.status == 'reveal'`, each `Book`'s full chain (original phrase ->
drawing -> guess -> drawing -> ...) is displayed in order, so the group
can see how it drifted. Each book has a save control that exports it as
a PNG image strip (see [[infrastructure]] Export Pipeline).

## States

- **Empty**: Lobby with only the host present — waiting-for-players
  state, distinct from mid-game states.
- **Error**: Room code not found, room already started (late join
  rejected — the server refuses to seat a new player once `Room.status`
  has left `lobby`), or connection lost with reconnect in progress
  (distinct from a hard error — reconnect shows a "reconnecting..." state
  per [[infrastructure]] Session Store, not a failure state, until it
  times out).

## Styling

Tailwind CSS — utility-first, fast to build with for a small app, no
need for a full component library's opinionated styling overhead.
