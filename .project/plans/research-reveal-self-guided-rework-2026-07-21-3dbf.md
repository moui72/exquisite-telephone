---
topic: self-guided Reveal / end-of-game redesign (feedback F001-F003)
date: 2026-07-21
status: complete
---

# Research: Self-guided Reveal redesign

## Question

Vet feedback `feedback-reveal-self-guided-rework-422e.md` (F001–F003)
before `/ardd-plan`: (Q1) does removing the timed reveal orphan
`Room.revealStartedAt`; (Q2) what shared state and Socket.IO events
support participant-visible "read by" / "being read by" badges; (Q3)
what does F003's "every book read" trigger actually mean; (Q4) which
state stays client-local vs shared.

## Findings

### Q1 — `Room.revealStartedAt` is fully orphaned; drop it

Every use in the repo serves the synchronized auto-advance pacing and
nothing else:

- Declared: `shared/src/types.ts` `Room.revealStartedAt` (with a
  doc-comment that exists only to explain pacing).
- Written: `server/src/socket/handlers.ts` `onSubmitEntry` (stamped
  `Date.now()` on the `status = 'reveal'` transition) and
  `server/src/domain/roomStore.ts` (initialized `null` in `createRoom`
  and `replayRoom`).
- Read: exactly one consumer — `client/src/lib/views/Reveal.svelte`
  (`computeRevealPosition` over `now - revealStartedAt`, plus the
  `mountFallbackStart` fallback).
- Everything else is documentation/tests of the above: README.md
  mermaid diagram row, `datamodel.md` field row + "Reveal pacing
  (synchronized clock)" Normalization Rule, `ui.md` Reveal View, and
  test files in shared/server/client.

No timer sweep, logging, analytics, or moderation path reads it (the
`game_completed` log line does not use it — it logs at the same
transition but from its own `Date.now()` context). With auto-advance
gone the field is dead. Keeping it "in case" would violate constitution
Principle I; the transition moment remains observable via the existing
`game_completed` log event. **Recommendation: remove the field, its
two initializers, the stamp in `onSubmitEntry`, both artifact entries,
and the README diagram row.**

### Q2 — Shared state shape and events

Existing shape precedents: `Room.playAgainVotes: string[]` (deduped
Player-id set, reveal-only, informational), `Room.dealtPrompts:
Record<string, string[]>` (Record keyed by Player.id),
`Room.timerExtensions: Record<string, number>`. Handler conventions:
one exported `onX` per event, `{ roomId, playerId, ... }` input,
guard → mutate → `logger.log` → `socket.to(roomId).emit('roomUpdated',
{ room })` → `ack({ room })`; per-socket unicast is the documented
one-off exception (`onPlayAgain`, infrastructure.md).

**Proposed `Room` fields** (both reveal-only, like `playAgainVotes`;
reset naturally because "Play again" mints a fresh Room):

```ts
/** FK -> Book.id -> deduped Player.id[] who have completed a read
 *  (opened then closed that book's modal). Empty {} outside reveal. */
bookReads: Record<string, string[]>;

/** FK -> Player.id -> Book.id currently open in that player's modal.
 *  A player reads at most one book at a time; absent key = no modal
 *  open. Cleared for a player on disconnect. */
currentlyReading: Record<string, string>;
```

`bookReads` keyed by Book.id (not Player.id) because both consumers —
the card badges and the F003 warning — aggregate per book. Per-player
views ("Alice hasn't read X") are still derivable from the same
structure, so one shape serves both F003 interpretations. Nothing goes
on `Player` — this mirrors `playAgainVotes` living on `Room`.

**Proposed event: one, not two.** A single client→server event
`setReadingBook` with handler `onSetReadingBook`, payload
`{ roomId, playerId, bookId: string | null }`:

- non-null `bookId`: modal opened → set `currentlyReading[playerId]`.
- `null` (or switching books): the previously-open book gets
  `playerId` appended (deduped) to `bookReads[prevBookId]`, and
  `currentlyReading[playerId]` is deleted/updated.
- Guards: `room-not-found`, `status !== 'reveal'`, unknown `bookId`.
- Broadcast `roomUpdated`, log e.g. `{ event: 'book_read_state',
  outcome: 'success', roomId, playerId, bookId }`.

This follows the deliberate no-`onRatePrompt` reasoning
(infrastructure.md): open and close are two halves of one state
transition, and a single last-write-wins event needs no pairing or
idempotency story that separate `openBook`/`closeBook` events would
(a close arriving without its open, double-opens, etc.). Naming
follows the `onSetX` family (`onSetTurnTimer`, `onSetPromptMode`).
"Reveal all" for a book counts as opening it; closing after reveal-all
counts as a completed read.

**Failure modes checked against real code:**

- *Disconnect mid-read*: `onDisconnect` (handlers.ts) currently only
  flips `Player.connected`. It must also `delete
  currentlyReading[playerId]`, or the "being read by" badge leaks
  forever. A disconnect-close should NOT count as a completed read
  (the player didn't choose to close; they'll reopen on reconnect).
- *Reconnect*: `onRejoin` restores the same `Player.id` into the same
  `Room`, and both new fields live on `Room`, so completed-read state
  survives reconnect for free via the session store. The rejoining
  client remounts with no modal open, which matches the cleared
  `currentlyReading` — consistent.
- *Restart game / Play again*: `onRestartGame` regenerates books (new
  Book.ids) — but it only runs from `writing` (`nonContinuable`), so
  reveal-state staleness can't occur; `onPlayAgain` creates a brand-new
  Room, so both fields start empty. No cleanup code needed beyond
  `createRoom`/`replayRoom` initializers.
- *Kicked player*: a kicked player's stale entries are harmless
  (badges just name them); no special handling needed.

**Semantics of "read":** F002 pins completed read = opened *and
closed*. That means opening to page 1 and immediately closing counts
as "read". The alternative — client reports `completed: true` only if
the last page was reached — is client-trusted anyway (paging is
client-local, Q4) and adds payload surface for marginal honesty in a
cooperative party game. Recommend keeping F002's opened-and-closed
definition and noting the wrinkle in ui.md copy ("read" ≈ "looked
at"), not enforcing page position server-side.

**Proportionality of the live "being read by" signal** (constitution
Principle I): the cost is one event round-trip per modal open/close on
an in-memory single-process server that already broadcasts full `Room`
snapshots on every state change — negligible traffic in a ≤~10-player
room. The completed-read half is required regardless (F003 depends on
it), so the live signal's marginal cost is one Record field and the
disconnect cleanup line. Verdict: proportionate; keep it. It is,
however, the cleanly separable piece if the user ever wants to shrink
scope — the plan should not entangle it with completed-read tracking.

### Q3 — F003 trigger: recommend per-book ("every book read by at least one player")

Position: **per-book**. Rationale:

- The guard's purpose is social — no one's creation should go
  entirely unseen. One reader satisfies that. Per-player-complete
  (N players × N books) makes the warning fire almost always in
  larger rooms, training hosts to click through it — a warning that
  always fires protects nothing.
- Precedent: `playAgainVotes` is deliberately informational, never
  gating ("purely informational, doesn't unlock or gate the host's
  controls" — datamodel.md End-of-game controls). A frequently-firing
  per-player gate would cut against that grain; a rare per-book
  warning fits it.
- The state (Q2's `bookReads`) supports both, so this choice is
  copy + trigger only and cheap to revisit.

Warning copy each implies:

- **Per-book (recommended):** "Nobody has opened these books yet:
  Alice's book, Bob's book. Start a new game anyway?" — plus the
  being-read variant when all books have a completed read but some
  modal is open: "Carol is still reading Alice's book. Start anyway?"
- **Per-player-complete (rejected):** "Some guests haven't seen
  everything — Alice hasn't read Bob's or Carol's books; Dave hasn't
  read Alice's book. Start anyway?" (long, nag-prone, and the
  host can't act on it beyond waiting).

Both are warnings with a force-anyway path, matching the existing
small-game override pattern (ui.md Lobby). Note "closing the lobby"
in F003 concretely means the reveal-page host actions — "Play again"
(`onPlayAgain`) and "End game" (`onEndGame`) — the confirm belongs
client-side before emitting, derived from `Room.bookReads` /
`currentlyReading`; no new server state or guard (server stays
force-through, consistent with `onEndGame` carrying no status guard).
This is ultimately the user's call — surface it at the plan's approval
checkpoint.

### Q4 — Client-local vs shared

Client-local (per-viewer, never synced): current page position per
book, kept-place on close/reopen, page-turn animation state, the
"reveal all" full-strip toggle, per-book "back to start" reset, and
the viewed/dirty card *dimming for yourself* (derivable from local
interaction; own entries in shared `bookReads` also work). Shared
(server-authoritative on `Room`): `bookReads` and `currentlyReading`
only — exactly what other participants' badges and the F003 warning
consume. PNG export stays a pure client function
(`client/src/lib/export/pngExport.ts` via `exportBookToPng`), merely
relocated to the modal's last page.

### Remaining audit lenses

- *Simplicity*: net simpler client — `computeRevealPosition`, the
  250ms recompute interval, cadence constants, cover-art spotlight
  sequencing, and the manual-override tri-state in `Reveal.svelte`
  all go away; a card grid + modal replaces them. Cover art
  (`generateCoverArt`) survives naturally as card face art.
- *Standardness*: card grid + modal + keyboard paging is a far more
  recognizable pattern than a synchronized slideshow; the proposed
  event/handler shapes copy existing conventions verbatim.
- *Robustness*: removes the whole clock-drift/mount-time class of
  bugs the synchronized clock existed to fix — self-guided viewing
  makes cross-client divergence a feature, not a bug, dissolving the
  problem feedback-main-4258 F001 solved rather than re-solving it.
- *DRYness*: read state has one source (`Room`); badges, card
  dimming, and the F003 warning are all derivations. No duplication
  introduced.
- *Semantics*: `bookReads` / `currentlyReading` name what they hold;
  the one soft spot is "read" meaning "opened and closed" (see Q2) —
  a copy problem, not a state problem.

### Committed decisions this proposal reverses

1. **Synchronized-clock reveal pacing** — datamodel.md Normalization
   Rule "Reveal pacing (synchronized clock)" and the
   `revealStartedAt` field row; itself a 2026-07-17 reversal
   (feedback F001, `feedback-main-4258.md`) of per-client local
   timers. The new design supersedes both: no shared pacing at all.
2. **One-book-at-a-time auto-advancing Reveal View** — ui.md Reveal
   View (cover-for-2.5s / 2-entries-per-4s cadence, spotlight unveil,
   settle-into-grid, and the `prefers-reduced-motion` carve-out that
   calls the pacing "gameplay-load-bearing" — that clause dies with
   the pacing).
3. **F001's own original "UI-only, no new Room state" note** —
   already reversed within the feedback file by F002 (new synced
   state is required).
4. Consequential (edits, not reversals): infrastructure.md Realtime
   Sync handler list gains `onSetReadingBook`; README.md mermaid
   diagram drops `revealStartedAt`; the PNG save control relocates
   into the per-book modal (mechanism unchanged).

## Recommendation

**/ardd-plan.** This is filed, scoped feedback whose design questions
are now settled: Q1 (drop `revealStartedAt` everywhere), Q2 (two
`Room` Records + one `setReadingBook` event + disconnect cleanup),
Q4 (only read state is shared) are concrete enough to draft artifact
changes and tasks from. The one genuine user decision — Q3's per-book
vs per-player trigger — has a recommendation (per-book) and belongs at
the plan's approval checkpoint, not blocking the plan itself.

## Rejected Alternatives

- **Keep `revealStartedAt` as inert metadata** ("when the reveal
  began"): no consumer exists or is proposed; Principle I says drop.
- **Paired `openBook`/`closeBook` events**: two events needing an
  idempotency/pairing story where one last-write-wins `setReadingBook`
  needs none — same reasoning as the deliberate no-`onRatePrompt`
  decision (infrastructure.md).
- **Read state on `Player` instead of `Room` Records**: would scatter
  per-book aggregation across the roster; `playAgainVotes` /
  `dealtPrompts` precedent puts session-scoped collections on `Room`.
- **Server-verified "reached last page" before counting a read**:
  paging is client-local, so it's client-trusted either way; adds
  payload and trust surface for no real integrity gain in a
  cooperative game.
- **Dropping the live "being read by" signal for simplicity**: its
  marginal cost over required completed-read tracking is one field
  and one cleanup line; the social presence is the point of F002.
- **Per-player-complete F003 trigger**: fires near-constantly in
  larger rooms, producing an ignorable warning; conflicts with the
  informational (non-gating) end-of-game-controls precedent.

## Open Questions

- **F003 trigger choice** (per-book recommended above) — user's call
  at the plan checkpoint; state shape supports either.
- Should a book the player *authored the origin prompt for* count
  toward "unread" warnings, or is reading your own book's reveal
  assumed? (Minor copy/trigger nuance; suggest no special-casing.)
- Does "reveal all" without ever paging count as a completed read on
  close? (Suggested yes above; confirm in ui.md wording.)
