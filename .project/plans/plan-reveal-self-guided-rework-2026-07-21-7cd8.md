---
status: approved
branch: reveal-self-guided-rework
created: 2026-07-21
features: []
surfaced-defects: []
---

# Plan — self-guided Reveal / end-of-game redesign

## Goal

Replace the timed auto-advancing Reveal with a self-guided card-grid +
per-book modal experience, add participant-visible read / being-read
state, and warn the host before closing the lobby with unread books.

## Scope

Implements feedback `feedback-reveal-self-guided-rework-422e.md` F001–F003,
designed against `research-reveal-self-guided-rework-2026-07-21-3dbf.md`
(read it for the full rationale; this plan references rather than repeats
it).

**In scope.**
- Two reveal-only `Room` fields — `bookReads: Record<BookId, PlayerId[]>`
  (completed reads) and `currentlyReading: Record<PlayerId, BookId>` — a
  single `setReadingBook` Socket.IO event, and `onDisconnect` cleanup
  ([[datamodel]], [[infrastructure]], server).
- Removal of `Room.revealStartedAt` and the synchronized-clock reveal
  pacing end-to-end (field, both initializers, the `onSubmitEntry` stamp,
  the sole client consumer, both artifact entries, the README diagram
  row) — the research confirmed it is fully orphaned once auto-advance
  goes.
- The self-guided Reveal View: card grid, per-book modal with manual
  animated paging (click + keyboard), the previous-item-above-new-reveal
  page structure, save-to-PNG on the last page, per-book kept-place /
  back-to-start / reveal-all, viewed/dirty card dimming, and the
  read-by / being-read-by badges ([[ui]], client).
- A client-side host warning on the reveal page's "Play again" / "End
  game" controls when books are unread, force-through allowed
  ([[ui]], client).

**Not in scope.** Any server-side gate on closing the lobby — F003 is a
client confirm derived from the synced state; the server stays
force-through (consistent with `onEndGame` carrying no status guard). The
PNG export *mechanism* (`exportBookToPng`) is unchanged, only relocated.
Cover art (`generateCoverArt`) is kept as card-face art. Regenerating the
`datamodel` diagram after the field removal is a follow-up `/ardd-diagram`
pass, not a task here.

## Technical Approach

The design is settled by the research; the shapes below are its
conclusions, not new decisions.

**Shared state, one event.** `bookReads` is keyed by `Book.id` (both the
card badges and the F003 warning aggregate per book; per-player views stay
derivable). `currentlyReading` is keyed by `Player.id` (one open book per
reader). Both live on `Room` like `playAgainVotes`, so "Play again"'s
fresh `Room` resets them for free. A single last-write-wins
`setReadingBook { roomId, playerId, bookId: string | null }` event (handler
`onSetReadingBook`, `onSetX` family, `roomUpdated` broadcast) covers both
open (non-null → set `currentlyReading`) and close (null → append the
player to `bookReads[prevBook]` deduped, clear `currentlyReading`) — one
event, no open/close pairing or idempotency story, per the deliberate
no-`onRatePrompt` reasoning. `onDisconnect` must `delete
currentlyReading[playerId]` (else the "being read by" badge leaks) and must
NOT credit a completed read (the player didn't choose to close).

**"Read" = opened and closed** (F002's definition). Paging is client-local
and thus client-trusted regardless, so the server does not verify a
last-page-reached; `ui.md` copy should read "read" as "looked at". "Reveal
all" then closing counts as a completed read.

**Client-local vs shared** (research Q4). Only `bookReads` /
`currentlyReading` are shared. Page position, kept-place, animation state,
the reveal-all toggle, back-to-start, and own-card dimming are per-viewer
and never synced. The whole `computeRevealPosition` / recompute-interval /
cadence-constants / manual-override machinery in `Reveal.svelte` is
deleted, not adapted.

**F003 is per-book (recommended; Open Question below).** The warning fires
when some book has no completed read by anyone, or all books are read but
one modal is still open. It is a client confirm before emitting
`onPlayAgain` / `onEndGame`, force-through allowed — the small-game
override pattern. The state supports per-player-complete too, so the
choice is copy + trigger only and cheap to revisit.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file.

### Phase 1 — Shared read-state foundation (no dependency)

Additive; does not touch `revealStartedAt` yet, so the current Reveal keeps
working until Phase 2 replaces it.

- Add `bookReads` and `currentlyReading` to `Room` in `shared/src/types.ts`
  (reveal-only, documented), initialized empty in `createRoom`/`replayRoom`
  (`roomStore.ts`). `[F002]` `[artifacts: datamodel]`
- Add `onSetReadingBook` (`{ roomId, playerId, bookId: string | null }`) in
  `server/src/socket/handlers.ts` + wire it in `server/src/socket/server.ts`:
  guards (`room-not-found`, `status !== 'reveal'`, unknown `bookId`),
  last-write-wins mutate, structured `logger.log`, `roomUpdated` broadcast.
  `[F002]` `[artifacts: infrastructure]`
- Extend `onDisconnect` to delete the departing player's
  `currentlyReading` entry (no completed-read credit). `[F002]`
- Revise `datamodel.md` (new field rows, keyed-by rationale) and
  `infrastructure.md` (Realtime Sync handler list gains `onSetReadingBook`,
  with the single-event reasoning). `[F002]` `[artifacts: datamodel, infrastructure]`
- Tests: `onSetReadingBook` open→sets currentlyReading; close→appends
  deduped to bookReads + clears currentlyReading; guards reject non-reveal
  / unknown book; disconnect clears currentlyReading without crediting a
  read.

### Phase 2 — Self-guided Reveal View (depends on Phase 1)

- Rebuild `client/src/lib/views/Reveal.svelte` as a card grid (cover art as
  card face) → per-book modal: manual paging (click + keyboard) with
  page-turn animations; page 1 the prompt in isolation, each later page the
  previous item above the new reveal; save-to-PNG (`exportBookToPng`) on the
  last page; per-book kept-place, back-to-start, and reveal-all (full PNG
  strip); viewed/dirty card dimming. Emit `setReadingBook` on modal
  open/close; render read-by / being-read-by badges from `Room.bookReads` /
  `currentlyReading`. `[F001]` `[F002]` `[artifacts: ui]`
- Remove `Room.revealStartedAt` end-to-end: the field
  (`shared/src/types.ts`), both initializers (`roomStore.ts`), the
  `onSubmitEntry` stamp (`handlers.ts`), and the now-deleted client
  consumer (`computeRevealPosition` etc.). `[F001]` `[artifacts: datamodel]`
- Revise `ui.md` Reveal View to the self-guided design and drop the
  `prefers-reduced-motion` "gameplay-load-bearing pacing" carve-out; remove
  the `revealStartedAt` row + "Reveal pacing (synchronized clock)" rule from
  `datamodel.md`. `[F001]` `[artifacts: ui, datamodel]`
- Tests: badges reflect `bookReads`/`currentlyReading`; paging/kept-place
  behave; opening then closing a modal emits the right `setReadingBook`
  calls; no reference to `revealStartedAt` remains (typecheck + grep).

### Phase 3 — Host unread-books warning (depends on Phase 2)

- On the reveal page's "Play again" / "End game" host controls, add a
  client-side confirm derived from `Room.bookReads` / `currentlyReading`:
  warn (naming the unread books, or the still-open one) when the per-book
  condition is unmet, with force-through. No server change. `[F003]`
  `[artifacts: ui]`
- Revise `ui.md` with the warning behavior and copy (per the chosen F003
  trigger). `[F003]` `[artifacts: ui]`
- Tests: the confirm fires when a book has no completed read / a modal is
  open, and force-through still emits `onPlayAgain` / `onEndGame`.

## Complexity Tracking

Required by Principle I (complexity must be justified).

| Deviation | Why justified | Simpler alternative rejected because |
|---|---|---|
| A live "being read by" signal (a synced Record + disconnect cleanup) on top of the required completed-read tracking | Social presence is the point of F002; marginal cost over the already-required `bookReads` is one Record field and one cleanup line, on a server that already broadcasts full `Room` snapshots per change | Dropping the live signal shrinks scope but removes the feature the user asked for; it is the cleanly separable piece if scope ever needs cutting, so the plan keeps it un-entangled from completed-read tracking |

Net the redesign is *simpler* client-side: it deletes `computeRevealPosition`,
the recompute interval, cadence constants, spotlight sequencing, and the
manual-override tri-state.

## Open Questions

1. **F003 trigger — per-book vs per-player-complete.** This plan is drafted
   for **per-book** ("every book read by at least one player"), the
   research recommendation: per-player-complete fires near-constantly in
   larger rooms and trains hosts to click through it, cutting against the
   informational (non-gating) end-of-game-controls precedent. The state
   shape supports either, so this is copy + trigger only. Decide at
   approval; choosing per-player instead is a Revise, not a redesign.
2. Should a book a player authored the origin prompt for count toward
   their "unread" warning, or is reading your own book assumed? (Minor
   copy nuance; research suggests no special-casing.)
3. Does "reveal all" without paging count as a completed read on close?
   (Research suggests yes; confirm in `ui.md` wording.)

## Production Annotation Summary

Required by the constitution's Development Workflow section. No production
shortcut is introduced. The client-trusted "read" definition (server does
not verify last-page-reached) is a deliberate design choice for a
cooperative party game, not a shortcut to annotate — recorded here so it
isn't later mistaken for one.
