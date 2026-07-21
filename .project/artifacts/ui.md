---
name: ui
status: stable
last_updated: 2026-07-20
diagram_status: stale
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

Before any room exists, players land on the Foyer: a centered hero
(the app's gilded title treatment — see Visual Identity — plus a
one-line docent-voice tagline) above a create/join form, itself wrapped
in a Gilt Frame captioned "The Foyer — RSVP Required" — the same
signature component used everywhere else an artifact appears, so the
very first screen already reads as part of the salon rather than a
bare utility form. The Salon Footer (see below) is already present
here, so its "?" button is a new player's first chance to understand
the game before committing to a room.

Once a room exists, it's framed as an RSVP/guest-list card (see Visual
Identity below) — the room code and player list read like names
checked in at the door of a salon. Host creates a room (gets a
shareable room code); other players join by entering the code and a
display name. Shows connected players and a "start game" control
visible only to the host. Reflects
`Room.status == 'lobby'` and the live `players` list from server
state. The host also
sees a "force monochrome" toggle (default off) that sets
`Room.monochromeOnly`, hiding the color palette for everyone's drawing
tool for the whole game (see Writing / Drawing View below) — not
visible or editable once the game has started. An info affordance next
to the toggle explains what it does before the host picks a value (see
Rules Overview Panel below for the info-affordance convention shared by
all four host settings here).

The host sees player-count guidance ("recommend 4+ players, minimum
3") next to the player list. Below 3 *active* (non-kicked) players, an
"I know this won't really work but I want to test something" checkbox
appears and must be checked before "start game" is enabled (see
[[datamodel]] Normalization Rules); at 3 or more active players it's not
shown and "start game" behaves as today. A lobby kick lowers the active
count, so kicking below 3 reveals the checkbox. (Wording aligned to the
already-landed code and [[datamodel]] behavior, not new drift.)

The host also sees a per-turn timer selector (off / 15m / 30m / 1hr /
4hr / 12hr — off by default) that sets `Room.turnTimerMinutes`. Off
means the room waits indefinitely for the current round (see Writing /
Drawing View); a duration means the room can advance a stalled round
via the timeout-vote flow described there. An info affordance next to
the selector explains the timeout-vote consequence of picking a
duration.

The host also sees a "laps per book" control (1 / 2 / 3) that sets
`Room.lapsPerBook`. Until the host explicitly picks a value, it shows a
live-derived default that recalculates as *active* (non-kicked) players
join or leave — a lobby kick moves the count too (2 under 5 active
players, 1 otherwise — see [[datamodel]] Normalization Rules — Laps per
book); the moment the host touches the control, it locks to
their choice and stops tracking player count for the rest of the
room's life. An info affordance next to the control explains what a
"lap" means in terms of how many times the book passes around the
circle before Reveal.

The host also sees a "prompt mode" control (free-form / curated — free-form
by default) that sets `Room.promptMode`. Free-form is the original
behavior: every player types their own opening phrase. Choosing curated
reveals two dependent controls — a count selector (2 / 3 / 4 / 5) setting
`Room.curatedPromptCount`, and an "allow write-in" toggle (on by default)
setting `Room.allowPromptWriteIn` — which are hidden entirely in
free-form mode rather than shown disabled, since they have no meaning
there. An info affordance next to the mode control explains that curated
deals each player a private hand of phrases to choose from, and that no
two players are ever offered the same phrase.

## Salon Footer

A slim bar fixed along the bottom of the viewport on **every** view —
the Foyer, Lobby, Writing/Drawing, Reveal, and the terminal states —
rendered once at the app root rather than per-view, so it never
disappears or shifts between screens. Framed as the velvet skirting of
the gallery wall, trimmed with a double gilt rail (a bright hairline
over a dimmer one) that echoes the Gilt Frame's outer + inset strokes
without carrying a heavy border.

It carries three things:

- **Identity, left**: the house wordmark ("Exquisite Telephone") before
  a room exists, replaced by the current salon's number ("Salon No.
  <room code>") once the player is seated — so the room code a player
  needs to read aloud is permanently on screen instead of only on the
  Lobby.
- **The docent's "?" button**: opens the Rules Overview Panel (see
  below) from anywhere, at any point in the game.
- **The host's gavel**: opens the Moderation Panel (see below).
  Rendered only for the host; absent entirely from every other
  player's footer rather than shown disabled.

Both buttons open their panel as an app-level overlay. This is the
single entry point for each — neither panel is reachable from inside a
view any more. That consolidation is deliberate: it makes rules and
moderation available during Writing/Drawing and Reveal, where
previously they were reachable only from the Lobby, and it removes the
duplicated per-view controls rather than leaving them alongside the
footer.

## Rules Overview Panel

A dismissible panel explaining the core game loop in docent voice: a
player writes a phrase, the next player draws it having never seen the
original text, the next player writes a new phrase from only the
drawing, and so on around the circle — Reveal then shows the whole
chain, phrase to drawing to phrase, so everyone sees how far it
drifted. Opened as an overlay from the Salon Footer's "?" button (see
above) — so it is reachable from every view, including mid-turn and
during Reveal, not just before the game starts. Not shown
automatically; a player who already knows the game is never
interrupted by it.

The same lightweight info-affordance pattern (a small `(?)` control
that reveals a short explanation on tap/click, docent voice, no
separate modal) is reused for every host-configurable setting in the
Lobby View above — the force-monochrome toggle, the turn timer
selector, the laps-per-book control, the prompt-mode control, the
phrases-per-player selector, the write-in toggle, and the small-game
acknowledgement — so a host understands a setting's consequence before
choosing a value, not just its label.

"Every" is meant literally and is enforced, not merely asserted: a test
derives the set of host settings from the rendered Lobby and fails if any
one of them lacks an affordance, so a newly added setting cannot ship
uncovered. One affordance per setting; a single tooltip covering a
cluster of related settings was considered for the curated controls and
rejected, since the explanation would then sit several controls away from
the setting it describes.

## Moderation Panel

A host-only modal overlay, opened from the Salon Footer's gavel button
(see above) and available during `lobby`, `writing`, and `reveal` (see
[[datamodel]] Normalization Rules — Moderation). It is never shown to
non-host players, and guards this twice over: the footer omits the
gavel entirely for non-hosts, and the panel itself renders nothing for
a non-host even if opened. Its controls:

- **Per-player "kick"** control next to each entry in the player list.
  Kicking sets `Player.kicked` and, if the room is `writing`, also sets
  `Room.nonContinuable` — the panel then surfaces a "this game can't
  continue" notice alongside the "restart game" control below. The
  room-wide broadcast also carries `Room.nonContinuable` to every other
  player; non-host players see the notice in the page body described
  under Writing / Drawing View, which is suppressed specifically for
  the host (originally so the host wouldn't see the same notice twice
  in one client, when this panel was rendered inline and always
  visible — 2026-07-18, feedback F001
  `.project/feedback/feedback-main-8da5.md`). Now that the panel is a
  modal the host must open, the host needs a frozen-room signal
  reachable *without* opening it: **the footer's gavel itself carries
  the indication** while `Room.nonContinuable` is `true`, so a host who
  kicks a player mid-game sees the room is frozen without reopening the
  panel. The indication is not colour alone (Baseline Accessibility,
  [[constitution]]) and its accessible label says the room can't
  continue, not merely that moderation exists. The body-notice
  suppression for the host stays as-is — the fix is the gavel signal,
  not showing the host the same notice the panel already carries. A kicked
  player is removed entirely from the visible roster shown to the host
  and other players (reversed 2026-07-17, feedback F001
  `.project/feedback/feedback-main-e2ff.md`, from the original
  struck-through-but-visible treatment) — the underlying `Player` record
  is untouched server-side (see [[datamodel]]), so their
  already-authored entries still resolve to their name in Reveal; only
  the roster *display* drops them. The kicked player's own client
  immediately shows a distinct "you were removed from this game" state
  (see States below) instead of continuing to render its normal view.
- **"End game"** — the same host-only control already described on the
  Reveal page (see Reveal View below), now also reachable from
  `lobby`/`writing` via this panel, since a host moderating offensive
  content can't wait for the game to reach Reveal.
- **"Restart game"** — visible only once `Room.nonContinuable` is
  `true`. Restarts the *same* room from a fresh turn 0 (new `books`,
  `entries` cleared, back to `writing`), excluding any kicked players;
  distinct from Reveal's "Play again", which creates a brand-new room.

## Writing / Drawing View

Framed as the player's own easel (see Visual Identity below) — the
canvas and text-entry prompt both sit inside the Gilt Frame component,
same as the room card and every Reveal book, so the "you are making a
piece for the salon" framing is consistent turn to turn. The core
gameplay loop. Each player sees either a text-entry prompt
(write a phrase) or a canvas (draw the previous phrase), depending on
`Entry.type` for their current turn, driven entirely by server-broadcast
room state (Principle VI — no client-side authoritative state).

The **opening turn** (`Entry.position === 0` — the player starting their
own book) is a distinct case from every later text turn, and the view
branches on it. In free-form mode it is today's plain text input. When
`Room.promptMode === 'curated'`, it instead presents that player's own
dealt hand (`Room.dealtPrompts` for their `Player.id`) as selectable
options — one choice, committed on submit — plus, when
`Room.allowPromptWriteIn` is `true`, an always-present write-your-own
option that reveals a free-text field. A player never sees another
player's hand in the interface, and the phrases are presented as a
choice rather than a suggestion list, so picking one is the normal path
rather than a fallback.

A short docent-voice hint above the prompt/canvas states the turn's
actual job, distinct per turn kind — three kinds, not two. The draw
turn's hint makes clear the player should draw exactly what the phrase
says, no more and no less. The **later** text turn's hint (`position >
0`) makes clear the player is writing blind from only the drawing before
them, never told the original phrase. The **opening** text turn
(`position === 0`) gets its own copy: there is no preceding drawing and
nothing to guess, so the blind-guess wording is simply false there and
must not be shown — the origin-turn hint instead frames the player as
setting the phrase the rest of the circle will chase. (Before this
feature, the blind-guess hint rendered on the opening turn too, which
described a situation the player was not in.) The
canvas uses pointer events for mobile-friendly touch drawing (Principle
II / touch cleanup quality standard), with listeners registered and torn
down across Svelte's component lifecycle. Pointer coordinates are
scaled from the canvas's CSS-rendered size to its bitmap resolution
before being recorded, so drawn lines track the pointer accurately
regardless of how the canvas is laid out (e.g. stretched to fill a flex
container).

The drawing canvas has a small toolbar: a preset color palette (hidden
entirely when `Room.monochromeOnly` is `true`, in which case all
strokes use the default ink color), 3 line-width presets (thin / medium
/ thick), and a fill tool. The palette includes white alongside its
other presets, since the canvas background is white — selecting white
and stroking or filling over a mistake (including undoing an unwanted
fill) paints it back to blank rather than requiring a separate
eraser/undo mechanism. Selecting the fill tool and tapping an enclosed
region flood-fills it with the current color, seeded from the tapped
point (see [[datamodel]] Entry — a `fill` draw op, replayed in sequence
alongside `stroke` ops). The active color/width selection applies to
new strokes only; it does not retroactively change strokes already
drawn.

When the phrase being drawn is a book's **opening** phrase
(`Entry.position === 1` — see [[datamodel]] Normalization Rules — Prompt
rating), the canvas carries a small thumbs-up / thumbs-down control:
"was this fun to draw?". It is optional and unobtrusive — submitting
without touching it is the normal path, and the control never blocks or
gates submission. The rating rides along with the entry submission
rather than being its own round trip. Once cast it shows as selected and
can be changed until submit, after which it is settled for that book.

The control is deliberately uniform: both thumbs are offered regardless
of whether the phrase came from the curated bank or was written by
another player, because branching the control by phrase origin would
leak which mode produced a phrase the player is not otherwise told
about. Where the rating *goes* differs by origin, but that is server-side
and invisible here (see [[datamodel]]). No rating is ever attributed to
the rater in any view, and the player whose phrase was rated is never
shown the result — this is curation telemetry, not a scoreboard, and
surfacing it would turn a party game into a judged one.

Every later drawing turn (`position > 1`) shows no rating control at
all: it is drawing a mid-chain guess, which is not a prompt and has
nothing to curate.

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

Opens on its own title-page moment — "The Gallery Opens" in the app's
gilded title treatment (see Visual Identity below) plus a one-line
docent-voice tagline ("Every book, unveiled.") — before the book grid
itself. Framed as a gallery opening (see Visual Identity below) — each book is
presented inside the Gilt Frame component with an engraved plaque
caption underneath (mock-formal exhibit title, e.g. "Exhibit No. 3 —
Untitled, Mixed Media, Anonymous"), unveiled one at a time under a
spotlight moment before the view settles into the full gallery-wall
grid described below. `prefers-reduced-motion` suppresses the
decorative spotlight/curtain flourish around each unveil, but never the
auto-advance pacing itself — that pacing is gameplay-load-bearing (see
Reveal pacing below), not decorative, so it keeps running identically
regardless of the user's motion preference; only the ornamental
transition dressing is skipped. At `Room.status == 'reveal'`, the
default mode is an animated,
one-book-at-a-time viewer rather than showing everything statically at
once: the current book opens on a "cover" (the origin author's name
plus a randomly-but-deterministically generated colorful abstract
design, seeded from the book's `originAuthorId` so it's stable across
re-renders rather than reshuffling every time), shown for 2.5 seconds,
then auto-advances every 4 seconds revealing up to 2 entries at a time
(original phrase -> drawing -> guess -> drawing -> ...) until that
book is fully shown, then moves to the next book's cover. This
auto-advance pacing is derived identically on every client from
`Room.revealStartedAt` (see [[datamodel]] Normalization Rules — Reveal
pacing) — each client computes its current book index and revealed-entry
count as a pure function of `now - Room.revealStartedAt` against these
same fixed cadence constants, rather than running its own independent
local timer, so every player sees the same book at the same time
(reversed 2026-07-17, feedback F001 `.project/feedback/
feedback-main-4258.md`, from the original per-client-local-timer design,
which let clients visibly diverge — e.g. the host reaching the end while
others were still mid-sequence — as clock drift accumulated). Manual
previous/next controls and a "show everything" skip button are always
available and jump the *local* view ahead of or behind the
clock-derived position, so the pacing is a default, not a forced
slideshow. Once every book has been shown (by auto-advance, skip, or
manual navigation), the view settles into a static full-grid mode —
every book's complete chain visible at once, matching the
pre-redesign layout. Each book has a save control (available in both
modes) that exports it as a PNG image strip (see [[infrastructure]]
Export Pipeline).

Also on the Reveal page, host and non-host players see different
end-of-game controls (see [[datamodel]] Normalization Rules — End-of-
game controls):
- **Non-host**: "Leave game" (returns to the host/join page) and "Vote
  to play again" (sets this player in `Room.playAgainVotes`; shown to
  the host as a live readiness count, e.g. "3 of 4 ready" — purely
  informational, doesn't unlock or gate the host's controls).
- **Host**: "End game" (transitions `Room.status` to `ended` — see the
  **Ended** state below; the same control also exposed via the
  Moderation Panel during `lobby`/`writing`) and "Play again" (starts a
  brand-new room, auto-joining every current player; available
  regardless of how many have voted).

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
  times out). Every server error code reaching Lobby's error state is
  translated to docent-voice copy via a code-to-copy mapping — never
  rendered as the raw code string — with a generic fallback line for
  any unmapped code, so an unrecognized code degrades gracefully
  instead of leaking server-internal text (fixed 2026-07-18, feedback
  F002 `.project/feedback/feedback-main-8da5.md`).
- **Kicked**: shown only to the player who was just kicked, the instant
  their own client observes `Player.kicked === true` on itself via a
  `roomUpdated` broadcast, regardless of `Room.status` at the time.
  Displays "You were removed from this game by the host" and a "Return
  to home" control (same client-local reset as "Leave game"/"Ended"
  above). Distinct from **Ended** — the room itself may still be
  ongoing for everyone else; only the kicked player sees this state.
  Added 2026-07-17 (feedback F001, `.project/feedback/
  feedback-main-e2ff.md`) — previously the kicked player's own client
  had no reaction to its own `kicked` flag at all and kept rendering its
  normal view.

## Visual Identity

A "tongue-in-cheek exquisite" salon/gallery theme: the real-world
"Exquisite Corpse" game's Surrealist-salon origins, played straight-faced
but rendered in candy-bright color instead of museum beige. Tailwind CSS
remains the styling mechanism (utility-first, fast to build with for a
small app, no need for a full component library's opinionated styling
overhead), extended with this theme's tokens rather than left at
Tailwind's defaults.

**Color tokens:**

| Name | Hex | Role |
|---|---|---|
| Ink | `#241B2F` | body text |
| Velvet | `#2E1A47` | dark surfaces (header bands, spotlight backdrop) |
| Marigold | `#F5A623` | gold/foil accent — frame borders, plaque rules |
| Bubblegum | `#FF6F91` | primary call-to-action |
| Butter | `#FFF3D6` | warm light card surface (not gray) |
| Grass | `#2FA88A` | affirmative/success states |

**Type pairing:** Fraunces (display serif, set at its soft/wonky optical
axis, used sparingly for titles and plaque captions) paired with Rubik
(body/UI — rounded, friendly, legible at small sizes) and Space Mono
(utility — room codes, timers, plaque numbers; reads like a stamped
ticket).

**Gilded title treatment:** the app's two title-page moments — the
Foyer's splash heading ("Exquisite Telephone") and the Reveal View's
opening header ("The Gallery Opens") — use a fourth face, Uncial
Antiqua (an uncial script modeled on real illuminated-manuscript
lettering), set in a gold gradient clipped to the text with a soft ink
drop-shadow for an embossed, gilt-leaf feel. Reserved for exactly these
two moments — never applied to body copy, plaque captions, or any
other heading — so the effect stays a deliberate, occasional flourish
rather than diluting into the everyday type system.

**Signature element — the Gilt Frame:** a reusable component, an ornate
CSS-drawn gold frame with a small engraved plaque underneath bearing a
mock-formal caption. It is the one visual element reused everywhere an
artifact appears in the game — the room card (Lobby View), the
canvas/text-entry surface (Writing / Drawing View, "the easel"), and
each book (Reveal View, "the gallery wall") — plus the Foyer's
create/join form itself, so the game's very first screen already
carries the same signature before any artifact exists yet.

**Applies globally, not just to GiltFrame:** the color tokens and type
pairing above are the theme for every view's chrome — page backgrounds,
headings, body text, labels, borders, and controls — not solely the
`GiltFrame` component. Any screen or element still using Tailwind's
default slate-gray/white palette is a gap to close, not an accepted
exception (see F001 in `.project/feedback/feedback-main-5fdc.md`).

**Slate-to-token mapping** (the concrete rule for replacing leftover
default-Tailwind styling with theme tokens):

| Current | Replace with |
|---|---|
| `text-slate-900` / `text-slate-800` | `text-ink` |
| `text-slate-700` | `text-ink/90` |
| `text-slate-600` | `text-ink/75` |
| `text-slate-500` | `text-ink/60` |
| `text-slate-400` | `text-ink/45` |
| `border-slate-200` (decorative dividers/card borders) | `border-marigold/30` |
| `bg-slate-800` (primary buttons) | `bg-bubblegum` |
| `bg-slate-100` (placeholder/cover boxes) | `bg-butter` |
| plain unstyled/gray secondary buttons (`border` with no color) | `border-marigold/60 bg-butter text-ink` |

Functional status colors (error/red, timeout-warning/amber,
success/grass) are excluded from this mapping — they encode meaning,
not leftover default styling.

**Docent Voice — copy register:** all UI copy (labels, button text,
errors, empty states) is written in a mock-formal salon/gallery
register — overly formal to the point of silliness — rather than plain
utilitarian phrasing. An action keeps the same verb through its whole
flow (e.g. a "Present your contribution" control produces a confirmation
that echoes "presented," not a different word), matching the existing
action-naming consistency already implied by the flows described above.
Applies across Lobby View, Writing / Drawing View, Reveal View, and the
States below (Empty, Ended, Error, Kicked all speak in this voice, not a
neutral system tone).

## Production Annotations

- **Exact-match flood fill**: the fill tool's scanline algorithm fills
  contiguous pixels of the exact seed color only — anti-aliased stroke
  edges (a semi-transparent blend, not the exact stroke color) can be
  left as a thin unfilled sliver at region boundaries. In production, a
  tolerance-threshold flood fill (fill pixels within a color-distance
  epsilon, not just exact matches) would close this gap.
