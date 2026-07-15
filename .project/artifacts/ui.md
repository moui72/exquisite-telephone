---
name: ui
status: stable
last_updated: 2026-07-14
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
'lobby'` and the live `players` list from server state. The host also
sees a "force monochrome" toggle (default off) that sets
`Room.monochromeOnly`, hiding the color palette for everyone's drawing
tool for the whole game (see Writing / Drawing View below) — not
visible or editable once the game has started.

The host sees player-count guidance ("recommend 4+ players, minimum
3") next to the player list. Below 3 players, an "I know this won't
really work but I want to test something" checkbox appears and must be
checked before "start game" is enabled (see [[datamodel]] Normalization
Rules); at 3 or more it's not shown and "start game" behaves as today.

The host also sees a per-turn timer selector (off / 15m / 30m / 1hr /
4hr / 12hr — off by default) that sets `Room.turnTimerMinutes`. Off
means the room waits indefinitely for the current round (see Writing /
Drawing View); a duration means the room can advance a stalled round
via the timeout-vote flow described there.

## Writing / Drawing View

The core gameplay loop. Each player sees either a text-entry prompt
(write a phrase) or a canvas (draw the previous phrase), depending on
`Entry.type` for their current turn, driven entirely by server-broadcast
room state (Principle VI — no client-side authoritative state). The
canvas uses pointer events for mobile-friendly touch drawing (Principle
II / touch cleanup quality standard), with listeners registered and torn
down across Svelte's component lifecycle. Pointer coordinates are
scaled from the canvas's CSS-rendered size to its bitmap resolution
before being recorded, so drawn lines track the pointer accurately
regardless of how the canvas is laid out (e.g. stretched to fill a flex
container).

The drawing canvas has a small toolbar: an 8-color preset palette
(hidden entirely when `Room.monochromeOnly` is `true`, in which case
all strokes use the default ink color), 3 line-width presets (thin /
medium / thick), and a fill tool. Selecting the fill tool and tapping
an enclosed region flood-fills it with the current color, seeded from
the tapped point (see [[datamodel]] Entry — a `fill` draw op, replayed
in sequence alongside `stroke` ops). The active color/width selection
applies to new strokes only; it does not retroactively change strokes
already drawn.

A simple turn-status indicator shows who's still working, without
revealing content — mirrors the "pass the folded paper" mechanic. Turn
progression is round-gated (see [[datamodel]] Normalization Rules): a
player who finishes their entry before the rest of the room finishes
the current round sees a "waiting for the round to finish" state
rather than being moved on to another book.

When `Room.turnTimerMinutes` is set, each still-working player sees a
countdown to their individual deadline (`Room.roundStartedAt` +
`Room.turnTimerMinutes`, plus any `Room.timerExtensions` for that
player). When `Room.pendingTimeoutVote` is present, players who have
already submitted this round see a vote prompt naming the stalled
player(s) and the four options (full turn / half turn / 15 minutes /
force empty now); in the edge case where no one has submitted yet this
round, every player (including the stalled ones) sees the vote prompt
instead.

## Reveal View

At `Room.status == 'reveal'`, the default mode is an animated,
one-book-at-a-time viewer rather than showing everything statically at
once: the current book opens on a "cover" (the origin author's name
plus a randomly-but-deterministically generated colorful abstract
design, seeded from the book's `originAuthorId` so it's stable across
re-renders rather than reshuffling every time), shown for 2.5 seconds,
then auto-advances every 4 seconds revealing up to 2 entries at a time
(original phrase -> drawing -> guess -> drawing -> ...) until that
book is fully shown, then moves to the next book's cover. Manual
previous/next controls and a "show everything" skip button are always
available, so the pacing is a default, not a forced slideshow. Once
every book has been shown (by auto-advance, skip, or manual
navigation), the view settles into a static full-grid mode — every
book's complete chain visible at once, matching the pre-redesign
layout. Each book has a save control (available in both modes) that
exports it as a PNG image strip (see [[infrastructure]] Export
Pipeline).

Also on the Reveal page, host and non-host players see different
end-of-game controls (see [[datamodel]] Normalization Rules — End-of-
game controls):
- **Non-host**: "Leave game" (returns to the host/join page) and "Vote
  to play again" (sets this player in `Room.playAgainVotes`; shown to
  the host as a live readiness count, e.g. "3 of 4 ready" — purely
  informational, doesn't unlock or gate the host's controls).
- **Host**: "End game" (transitions `Room.status` to `ended` — see the
  **Ended** state below) and "Play again" (starts a brand-new room,
  auto-joining every current player; available regardless of how many
  have voted).

## States

- **Empty**: Lobby with only the host present — waiting-for-players
  state, distinct from mid-game states.
- **Ended**: `Room.status == 'ended'` — shown to every player still on
  the page when the host clicks "End game" (or, distinctly, if a
  player tries to rejoin a room that already ended — see
  [[infrastructure]] Session Store). Displays "This game has ended"
  and a "Return to home" control (client-local reset, same mechanism
  as "Leave game" above).
- **Error**: Room code not found, room already started (late join
  rejected — the server refuses to seat a new player once `Room.status`
  has left `lobby`), or connection lost with reconnect in progress
  (distinct from a hard error — reconnect shows a "reconnecting..." state
  per [[infrastructure]] Session Store, not a failure state, until it
  times out).

## Styling

Tailwind CSS — utility-first, fast to build with for a small app, no
need for a full component library's opinionated styling overhead.

## Production Annotations

- **Exact-match flood fill**: the fill tool's scanline algorithm fills
  contiguous pixels of the exact seed color only — anti-aliased stroke
  edges (a semi-transparent blend, not the exact stroke color) can be
  left as a thin unfilled sliver at region boundaries. In production, a
  tolerance-threshold flood fill (fill pixels within a color-distance
  epsilon, not just exact matches) would close this gap.
