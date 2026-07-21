---
status: approved
branch: book-cover-decoration
created: 2026-07-21
features: [book-cover-decoration, pregenerated-book-cover-templa]
surfaced-defects: []
---

# Plan — book cover decoration (+ pregenerated templates)

## Goal

Let each player decorate the cover of their own book — opportunistically
while waiting and in a gated 2-minute end-of-game window — and show that
cover as the book's Reveal card face, with a picker of pregenerated
background templates as starting points.

## Scope

Two backlogged features, sequenced by dependency (templates ride on the
cover canvas):

- `book-cover-decoration` — per-book cover draw ops, a new `decorating`
  room phase between `writing` and `reveal`, the 2-minute gated window,
  opportunistic decoration during `writing` with a client-side 30s grace,
  and the Reveal card face using the drawn cover (falling back to
  `generateCoverArt`).
- `pregenerated-book-cover-templa` — a fixed set of nine named background
  templates rendered beneath the cover ink, chosen from a picker.

**In scope.**
- Shared state: `Book.cover` (draw ops) and `Book.coverTemplate`; the new
  `Room.status` value `decorating`; `Room.decorationWindowStartedAt` and
  `Room.coverSubmissions` ([[datamodel]]).
- Server: `onSubmitCover` (own-book-only, drawing-payload-capped); the
  `writing → decorating` transition replacing the direct `writing →
  reveal` in `onSubmitEntry`'s completion path; the sweep's
  `decorating → reveal` expiry close and the synchronous all-submitted
  early close ([[infrastructure]]).
- Client: the cover-decoration canvas (reusing `DrawingCanvas`), the
  `decorating` window view with the shared countdown and submit-early, the
  waiting-state decoration entry point and 30s grace, and the Reveal card
  face cover-with-fallback ([[ui]]).
- Templates: the nine-id constant in `shared/`, the picker, and
  low-opacity background rendering on both the decoration canvas and the
  Reveal card.

**Not in scope.**
- Any server-tracked grace: the 30s grace is client-side only and never
  extends the turn-timer deadline or the `force-empty` flow (confirmed
  decision — [[datamodel]] Normalization Rules — Cover decoration).
- A host override for the decoration window: it is short and
  self-resolving (all-submitted or expiry).
- Per-stroke cover sync: covers finalize once via `onSubmitCover`, exactly
  like entry drawings — no per-stroke transport.
- Regenerating the `datamodel`/`infrastructure`/`ui` diagrams after this
  work — a follow-up `/ardd-diagram` pass, not a task here (all three were
  marked `diagram_status: stale`).

## Technical Approach

The design is settled in the artifacts; the shapes below reference them
rather than repeating them.

**A new phase hosted by existing machinery.** `onSubmitEntry` already
transitions to `reveal` when `computeNextEntries(room).length === 0`; that
branch instead sets `status = 'decorating'` and stamps
`decorationWindowStartedAt`. The existing 30s turn-timer sweep
([[infrastructure]] Turn Timer Sweep) gains one more responsibility —
closing the `decorating` window on expiry (`+120000` ms) by transitioning
to `reveal` — so no second timer is introduced (Principle I). Early close
(all active players in `coverSubmissions`) happens synchronously in
`onSubmitCover`. This is the same connected-independent pattern the sweep
already provides for timeout votes: the window must close even if everyone
has gone offline mid-decoration.

**Covers are draw ops, reusing the drawing stack.** `Book.cover` is the
same `stroke`/`fill` draw-op shape as an `Entry` drawing, so the canvas is
`DrawingCanvas` and the submission is bounded by the same drawing-payload
cap at the submission boundary ([[datamodel]] Normalization Rules —
`Entry.content` maximum length). `coverTemplate` is one of nine ids from a
`shared/` constant (like the phrase bank), rendered as a low-opacity
background beneath the ink on both the decoration canvas and the Reveal
card.

**Reveal fallback.** The self-guided Reveal card face uses `Book.cover`
when present and falls back to the existing `generateCoverArt` abstract
design when `null` — the confirmed reversal of the just-merged
"keep `generateCoverArt` as the card face" decision (undecorated books are
unchanged from today).

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file. Phases are ordered; later phases depend on
earlier ones as noted.

### Phase 1 — Shared state and types (`book-cover-decoration`)

Foundation the server and client both compile against.

- Add `Book.cover` and `Book.coverTemplate`, the `Room.status` value
  `decorating`, and `Room.decorationWindowStartedAt` / `Room.coverSubmissions`
  to the shared types.
- Add the nine-id cover-template constant to `shared/` (used by Phase 5's
  picker and background rendering; the id set lands here so both server
  validation and client share one source).

### Phase 2 — Server: the decorating phase (`book-cover-decoration`)

Depends on Phase 1.

- Redirect `onSubmitEntry`'s completion branch from `writing → reveal` to
  `writing → decorating`, stamping `decorationWindowStartedAt` and clearing
  the reveal-only records appropriately.
- Add `onSubmitCover` (own-book-only via `Book.originAuthorId`, drawing
  payload capped): store `cover`/`coverTemplate`, append to
  `coverSubmissions`, and synchronously early-close to `reveal` when all
  active players have submitted.
- Extend the sweep to close the `decorating` window on expiry
  (`decorationWindowStartedAt + 120000`), transitioning to `reveal` and
  emitting the same completion/reveal log the direct path did.

### Phase 3 — Client: decoration canvas and window (`book-cover-decoration`)

Depends on Phase 1 (types) and Phase 2 (server events).

- A cover-decoration canvas reusing `DrawingCanvas`, pre-stamped
  "<username>'s book", honoring `Room.monochromeOnly`, editing a
  client-local draft cover.
- The `decorating` full-view screen: shared 2-minute countdown derived
  from `Room.decorationWindowStartedAt`, "Present your cover" submit-early
  (then waiting-for-others), and a submitted-count readout from
  `Room.coverSubmissions`.
- The waiting-state (round-gated) decoration entry point during `writing`,
  and the client-side 30s grace countdown before the turn view takes over.

### Phase 4 — Reveal card face uses the cover (`book-cover-decoration`)

Depends on Phase 1 and Phase 3 (rendering of cover + template).

- The Reveal card grid renders `Book.cover` (over `coverTemplate`) as the
  card face, falling back to `generateCoverArt` when `cover` is `null`.

### Phase 5 — Pregenerated templates (`pregenerated-book-cover-templa`)

Depends on Phase 3 (the decoration canvas) and Phase 1 (the id constant).

- A template picker above the decoration canvas offering the nine named
  backgrounds plus "blank"; the chosen `coverTemplate` renders as a
  low-opacity background beneath the ink, switchable without touching the
  ink.
- The same low-opacity template rendering on the Reveal card face (so a
  templated cover reads the same in Reveal as on the easel).

## Complexity Tracking

| Deviation | Why justified | Simpler alternative rejected |
|---|---|---|
| A new `Room.status` value (`decorating`) — a fourth room phase | The 2-minute cover window must **gate** the `writing → reveal` transition for all clients; a room-wide phase is the only place that gate lives (Principle VI — single source of state). | A client-only "decorate now" overlay with no server phase can't gate reveal or survive everyone going offline; the window would not close deterministically. |
| The sweep gains a second responsibility (closing the window) | Reuses the existing 30s interval and its connected-independence rather than adding a second timer/scheduler (Principle I). | A dedicated per-room `setTimeout` for the window reintroduces exactly the timer-management the sweep already centralizes. |

## Open Questions

- **Cover serialization shape.** `Book.cover` is described as the same
  draw-op shape as an `Entry` drawing; whether it is stored structured
  (`DrawOp[]`) or as the serialized `string` form `Entry.content` uses is
  an implementation choice to settle in Phase 1, kept consistent with the
  entry drawing path either way.
- **Template background rendering fidelity.** The nine templates are named
  but their concrete visual definitions (SVG/pattern) are produced during
  Phase 5 — the plan fixes the ids and the low-opacity-beneath-ink rule,
  not the exact artwork.

## Production Annotation Summary

- No new production shortcut. Cover draw ops and the `decorating`-phase
  fields are in-memory game state, lost on restart like all other room
  state — already covered by the existing **In-memory-only state**
  production annotation in [[datamodel]]; this feature adds nothing beyond
  it.
