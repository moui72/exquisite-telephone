---
status: open
created: 2026-07-24
plan: null
---

# Feedback

Captured out-of-band via the `inbox` function during a play session on
2026-07-24, drained here in one pass. A seventh item from the same capture —
the cover-decoration background not being clipped to the canvas — was filed
separately as `feedback-cover-decoration-background-ca-4113.md` earlier in the
same drain, and so is not repeated here.

## Bugs

- [ ] F001 Changing the drawing color mid-session doesn't take effect until
  the stroke is finished: after selecting a new color and drawing, the
  in-progress line renders in the *previous* color and only switches to the
  selected one on stroke end. `ui.md` Writing / Drawing View states "The
  active color/width selection applies to new strokes only", so a new stroke
  should be the new color from the first point.
  [artifacts: ui] — `client/src/lib/components/DrawingCanvas.svelte`

- [ ] F002 The fill tool produces speckled, incomplete fills. Filling the
  whole canvas black leaves white spots; filling those white spots then
  leaves black spots, and the residue never fully resolves. This undercuts
  the fill-white-to-erase path `ui.md` relies on in place of a separate
  eraser ("selecting white and stroking or filling over a mistake … paints it
  back to blank").
  *Claude's hypothesis, unverified:* an antialiasing / color-tolerance issue
  in the flood fill — edge pixels that are blends of the two colors match
  neither seed color.
  [artifacts: ui] — flood-fill implementation behind the `fill` draw op

- [ ] F003 Round gating isn't holding: sometimes a book gets passed and lets
  one player start their next turn while another player is still waiting on
  their own book, so rounds start staggered rather than together. `ui.md`
  Writing / Drawing View specifies the opposite — "a player who finishes
  their entry before the rest of the room finishes the current round sees a
  'waiting for the round to finish' state rather than being moved on to
  another book" — and [[datamodel]] Normalization Rules calls progression
  round-gated. Reported by the user as a preference; it is in fact a
  divergence from the recorded design.
  Note this interacts with the 30-second grace countdown work in
  `plan-dismissable-grace-and-drift-2026-07-24-0ec7.md` — a correctly gated
  round changes when that countdown can fire.
  [artifacts: ui, datamodel]

## UX

- [ ] F004 During reveal, the "read by" attribution notes are hard to read
  against the background behind them. Either pull them inside the book's card
  so they sit on the card surface, or badge them so they carry their own
  background.
  [artifacts: ui] — `client/src/lib/views/Reveal.svelte`

- [ ] F005 A non-host player who clicks "Vote for an Encore" gets no
  indication the vote registered — the button doesn't change state and
  nothing else confirms it. `ui.md` End-of-game controls specifies the
  readiness count is shown *to the host*, but says nothing about what the
  voter sees, so the artifact needs the post-vote affordance added as well.
  Suggested: the button becomes "Withdraw encore vote", which also makes the
  vote retractable.
  [artifacts: ui] — `client/src/lib/views/Reveal.svelte`

- [ ] F006 Drawing-toolbar tool selection should be an explicit pen/bucket
  radio rather than a single fill toggle, so the active tool is always
  visible instead of inferred from a toggle's on/off state. `ui.md` describes
  the toolbar as having "a fill tool" alongside the palette and line widths,
  without pinning the control shape.
  [artifacts: ui] — `client/src/lib/components/DrawingCanvas.svelte` toolbar
