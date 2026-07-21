---
name: datamodel
status: stable
last_updated: 2026-07-20
diagram_status: current
diagram_type: erDiagram
render_section: Datamodel
render_hint: |
  One block per entity with its fields and types. Derive relationships from
  FK references (e.g. patient_id FK -> patients). Omit index and
  normalization detail — the diagram represents structure, not implementation.
---

# Data Model

## Overview

The canonical data model is entirely in-memory on the server for the
duration of a game (per [[constitution]] Principle I — no premature
scaling, and Principle VI — single source of state). There is no
long-term database; the source of truth for a running game is the
server's authoritative room store. A short-lived session store backs
reconnect-tolerance (see [[infrastructure]]) but nothing about a *game*
is intended to survive a server restart.

The one exception is **curation data** — prompt ratings and candidate
phrases (see Persisted Entities below). These are not game state: no
running game reads them, and losing them degrades nothing a player can
see. They exist so the curated phrase bank can be pruned and grown from
real play instead of by hand (see [[infrastructure]] Curation Store).
They are deliberately the only shapes here that outlive a process.

## Entities

### Room

| Field | Type | Notes |
|-------|------|-------|
| id | string | Short human-shareable room code (e.g. 4-6 chars), not a UUID |
| hostPlayerId | string | FK -> Player.id |
| players | Player[] | |
| status | enum | `lobby` \| `writing` \| `reveal` \| `ended` — a room-wide phase only; there is no room-wide `drawing` phase, since a player is individually writing or drawing at any given moment depending on `Entry.type` (see below). Turn *progression*, however, is round-gated (see Normalization Rules) — not asynchronous. |
| books | Book[] | One per player's original prompt |
| createdAt | timestamp | |
| monochromeOnly | boolean | Host-configurable, set before `status` leaves `lobby`; defaults `false`. When `true`, the drawing tool's color palette is hidden and all strokes render in the default ink color — see [[ui]] Writing/Drawing View. |
| turnTimerMinutes | number \| null | Host-configurable, set before `status` leaves `lobby`; defaults `null` (no timer — the room waits indefinitely for the current round, per Normalization Rules). One of `15 \| 30 \| 60 \| 240 \| 720` when set. |
| roundStartedAt | timestamp \| null | Epoch ms marking when the current round began; `null` while `status === 'lobby'`. Reset whenever the room-wide current round advances (see Normalization Rules). Only meaningful when `turnTimerMinutes` is set. |
| timerExtensions | Record\<playerId, number\> | Per-player extra milliseconds granted this round via a timeout vote (see Normalization Rules); **added to** the base turn duration rather than replacing it, so a granted extension lengthens the turn. Cleared whenever the round advances. |
| pendingTimeoutVote | TimeoutVote \| null | Set by the server when a round's timer expires with players still short of their deadline; `null` otherwise. See `TimeoutVote` below. |
| playAgainVotes | string[] | FK -> Player.id, deduplicated. Non-host players who've clicked "vote to play again" on the Reveal page (see [[ui]] Reveal View). Purely informational — shown to the host as a readiness count, does not gate `Room.status`. Never populated outside `status === 'reveal'`; a fresh `Room` created by "Play again" starts with an empty array like any other new room. |
| nonContinuable | boolean | Set `true` the moment a host kicks a player while `status === 'writing'` (see Normalization Rules — Moderation); `false` otherwise, including after "restart game" clears it. Never set outside `writing`; a kick during `lobby` or `reveal` has nothing to make non-continuable. |
| revealStartedAt | timestamp \| null | Epoch ms marking when `status` transitioned to `reveal`; `null` otherwise. Gives every client a shared reference point to derive the Reveal page's animated pacing (current book index, revealed-entry count) as a pure function of `now - revealStartedAt`, rather than each client running its own independent local timer — see [[ui]] Reveal View and Normalization Rules below. |
| promptMode | enum | `free-form` \| `curated` — Host-configurable, set before `status` leaves `lobby`; defaults `free-form` (players type their own opening phrase, the original behavior). When `curated`, each player instead picks their opening phrase from a dealt hand (see Normalization Rules — Curated prompts). |
| curatedPromptCount | number \| null | Host-configurable, set before `status` leaves `lobby`; how many phrases each player is dealt. One of `2 \| 3 \| 4 \| 5` when set; `null` while `promptMode === 'free-form'`. Clamped at deal time (see Normalization Rules — Curated prompts). |
| allowPromptWriteIn | boolean | Host-configurable, set before `status` leaves `lobby`; defaults `true`. When `true`, a write-your-own option is always offered alongside the dealt phrases, so curated mode restricts nobody who has their own idea. Only meaningful when `promptMode === 'curated'`. |
| dealtPrompts | Record\<playerId, string[]\> | The phrases dealt to each non-kicked player at game start, from a single shuffle-then-partition of the fixed phrase bank — which is what guarantees no phrase reaches two players in the same game. Empty `{}` while `promptMode === 'free-form'`. Re-dealt on *Restart game*; see Normalization Rules — Curated prompts. |
| lapsPerBook | number \| null | Host-configurable, set before `status` leaves `lobby`; `null` means the host hasn't explicitly chosen a value yet — see Normalization Rules for the live-default-until-overridden behavior. When non-`null`, one of `1 \| 2 \| 3`. Governs how many full rotations through `Room.players` each book completes before the game ends (see Normalization Rules — Laps per book). |
| bookReads | Record\<bookId, playerId[]\> | Reveal-only. FK `Book.id` -> deduped FK `Player.id[]` who have *completed a read* of that book — opened its per-book modal and then closed it (see [[ui]] Reveal View and Normalization Rules — Reveal read-state). Keyed by `Book.id` because both consumers — the per-card "read by" badges and the host's unread-books warning — aggregate per book; per-player views stay derivable. Empty `{}` outside `status === 'reveal'`; a fresh `Room` from "Play again" starts empty like any other new room. |
| currentlyReading | Record\<playerId, bookId\> | Reveal-only. FK `Player.id` -> FK `Book.id` currently open in that player's modal; an absent key means that player has no modal open. Keyed by `Player.id` — a reader has exactly one book open at a time. Drives the live "being read by" badge. Cleared for a player on disconnect (so the badge doesn't leak) *without* crediting a completed read. Empty `{}` outside `status === 'reveal'`. |

### Player

| Field | Type | Notes |
|-------|------|-------|
| id | string | Ephemeral session identity — no account, no persistent user record |
| roomId | string | FK -> Room.id |
| name | string | Display name chosen at join time |
| connected | boolean | Drives reconnect-tolerance UI state |
| sessionToken | string | Opaque token used to resume the same Player.id after a dropped connection. TTL and rejoin-after-end behavior are defined in [[infrastructure]]'s Session Store section. |
| kicked | boolean | Host-set via moderation "kick player" (see Normalization Rules); defaults `false`. A kicked player stays in `Room.players` (matches the existing non-cleanup pattern for disconnected/departed players); excluded from the regenerated `books` on the next "restart game," and from `eligibleVoterIds`/`stalledPlayerIds` on any *subsequent* timeout vote (a vote already open at kick time is unaffected — it resolves or expires as already computed). |

### Book

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| roomId | string | FK -> Room.id |
| originAuthorId | string | FK -> Player.id — whoever started this book's chain |
| entries | Entry[] | Ordered chain: text, drawing, text, drawing, ... |

### Entry

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| bookId | string | FK -> Book.id |
| authorId | string | FK -> Player.id |
| position | integer | Order within the book's chain, 0-indexed |
| type | enum | `text` \| `drawing` |
| content | string | Text phrase, or serialized drawing. Drawings are stored as an ordered array of draw ops rather than raster — smaller over the wire, replayable, and rasterized to PNG only at export time (see [[infrastructure]] Export Pipeline). Each op is one of: `{ type: 'stroke', points: Point[], color: string, width: number }` (a single freehand stroke, carrying its own color and line width) or `{ type: 'fill', point: Point, color: string }` (a flood-fill seeded at `point`, replayed by re-running the fill algorithm against the canvas as rendered up to that point in the op sequence — see [[ui]] Writing/Drawing View). Ops replay strictly in array order. |
| emptyByTimeout | boolean | `true` if this entry was auto-submitted empty because the author's per-turn timer expired and a timeout vote (or the no-eligible-voter fallback) resolved to "force empty" — see Normalization Rules. Omitted/`false` for normally-submitted entries. |

### TimeoutVote

Only present as `Room.pendingTimeoutVote` while a round-expiry vote is open (see Normalization Rules).

| Field | Type | Notes |
|-------|------|-------|
| stalledPlayerIds | string[] | FK -> Player.id — every player who hadn't submitted their current-round entry when the timer expired; the vote's outcome applies uniformly to all of them |
| eligibleVoterIds | string[] | FK -> Player.id — players who had already submitted this round, or, if none had, every player in the room (see Normalization Rules) |
| votes | Record\<playerId, 'full' \| 'half' \| '15m' \| 'force-empty'\> | Cast so far; a player may vote once per pending vote |
| voteDeadline | timestamp | Epoch ms; the vote resolves when every eligible voter has cast a vote, or this deadline passes, whichever is first |

## Persisted Entities

The only data in this app that survives a server restart. Stored outside
the room store entirely (see [[infrastructure]] Curation Store) — they
are keyed by phrase text, not by `Room`/`Player`, and carry no link back
to who rated what.

**The persisted record is an event; the entities below are the derived
view.** What is written to disk is one immutable `RatingEvent` per
rating cast — appended, never mutated. `PromptRating` and
`CandidatePhrase` are no longer the on-disk shape: they are the
**aggregate view** produced by folding the event log at read time. They
remain the shapes a curator reads and the shapes in the type system;
they simply stop being what a writer touches.

### RatingEvent

The persisted record. One file per event ([[infrastructure]] Curation
Store), written exactly once and never modified.

| Field | Type | Notes |
|-------|------|-------|
| phrase | string | Verbatim rated text — a bank phrase or a player-written one. Never normalized or lowercased. |
| value | enum | `up` \| `down` |
| origin | enum | `bank` \| `player-written` — which of the two aggregates below this event folds into. Recorded at write time from server-side room state, never from a client claim. |
| ratedAt | timestamp | Epoch ms the rating was cast. |

**No attribution, unchanged.** A `RatingEvent` carries no `Player.id`,
no `Room.id`, and no rater or author link — the same property the
aggregate view has always had, now enforced at the record level where
the data actually lands.

Player-written **thumbs-down** remains recorded nowhere: it is discarded
at write time rather than written and filtered during the fold, so it
never reaches disk at all (see the note under `CandidatePhrase`).

### PromptRating

Derived, not stored. One entry per curated-bank phrase that has ever
been rated, produced by folding every `origin: 'bank'` event for that
phrase. Absent until a phrase receives its first rating.

| Field | Type | Notes |
|-------|------|-------|
| phrase | string | Verbatim text from `CURATED_PHRASE_BANK`; the record key. A phrase edited or removed from the bank simply orphans its record — harmless, and the curator reads bank and ratings together anyway. |
| up | integer | Count of thumbs-up, across all games ever played |
| down | integer | Count of thumbs-down |

### CandidatePhrase

Derived, not stored. One entry per distinct player-written opening
phrase that has received at least one thumbs-up, produced by folding
every `origin: 'player-written'`, `value: 'up'` event and upserting by
exact text. This is the mining path for new bank entries.

| Field | Type | Notes |
|-------|------|-------|
| phrase | string | Verbatim player-written text; the record key. Never normalized or lowercased — the curator wants to see exactly what was typed. |
| votes | integer | How many times this exact text has been thumbs-upped, across all games. Repeat occurrences increment the folded count rather than producing a duplicate entry. |
| firstLoggedAt | timestamp | Epoch ms of the first thumbs-up — the EARLIEST `ratedAt` among that phrase's events, which the fold must preserve rather than overwrite as later events are applied. |

There is no negative counterpart. A thumbs-down on a player-written
phrase is not recorded anywhere: it has no destination (the phrase isn't
in the bank, so there's no tally to decrement) and recording "someone
disliked this player's writing" serves no purpose the curator needs.

## Normalization Rules

- `Room.id` is generated as a short, unambiguous code (avoiding
  visually-similar characters) rather than a UUID, since it's read aloud
  or typed by players.
- `Entry.position` is strictly sequential per `Book` starting at 0; no
  gaps, since it directly drives turn order and reveal order.
- `Player.id` persists only for the lifetime of a room; it is not reused
  across rooms or sessions.
- **Turns are round-gated, not asynchronous.** A room has a derived
  *current round* = `min(entries.length)` across all of `Room.books` —
  not a persisted field, purely computed from existing state (Principle
  VI). A book's next entry is only assignable/acceptable when that
  book's `entries.length` equals the current round; a player who
  finishes their entry while other books in the room haven't reached
  the same round waits, rather than being assigned a different book.
  Reversed 2026-07-14 (feedback F001,
  `.project/feedback/feedback-main-4af4.md`) from the original
  asynchronous-per-book design.
- **`Entry.content` has a maximum length, enforced at the submission
  boundary.** `content` was previously bounded only by a non-empty
  check, which left both in-memory game state and the durable Curation
  Store growable without limit by a client. The cap is enforced in the
  entry-submission handler — **ahead of both the room store and the
  curation store** — so a single check protects in-memory state as well
  as anything that reaches disk; bounding it inside the store would
  leave the room store just as exposed. There are **two limits, not
  one**: text phrases and serialized drawing payloads differ by orders
  of magnitude, and a single cap would either truncate real drawings or
  fail to bound text meaningfully. Both are derived from measured
  realistic payloads with margin above them, not chosen as round
  numbers, and are recorded alongside their measurements at the
  constants themselves. Oversize submissions are **rejected with a
  clear failure response, never silently truncated** — a player must
  never be told their turn succeeded while part of their drawing was
  discarded. This bound is independent of, and does not replace, the
  bound on curation event accumulation (see [[infrastructure]]): a
  bounded phrase submitted many times is still unbounded disk.
- **Minimum player count.** `Room.status` may not transition out of
  `lobby` (`start_game`) with fewer than 3 *active* (non-kicked) players
  unless the host explicitly overrides — the floor is measured against
  the active roster (`activePlayers(room)`), so a kicked lobby player
  does not count toward the minimum. No persisted override flag; it's a
  one-time acknowledgment on the `start_game` request itself, not room
  state. Recommended: 4+. Floor: 1 (a solo host can still override-start
  for testing). See [[ui]] Lobby View. (The active-count wording resolves
  the "live player count" ambiguity flagged in feedback and matches the
  `onStartGame` code, which reads `activePlayers(room).length`.)
- **Turn timer (optional).** When `Room.turnTimerMinutes` is set, each
  player still short of the current round has an individual deadline of
  `Room.roundStartedAt + Room.turnTimerMinutes * 60000 +
  (Room.timerExtensions[playerId] ?? 0)` — the extension is **additive**,
  lengthening the base turn rather than replacing it (a 30-minute timer
  plus a 15-minute grant yields a 45-minute deadline). This corrects the
  artifact to match a deliberate code change (see [[ui]]); the earlier
  replacing form documented here was the drift, not the code. A
  background process (see
  [[infrastructure]]) periodically checks in-progress rooms with a
  timer set: when every remaining player's deadline has passed and no
  `pendingTimeoutVote` is open, it opens one (`Room.pendingTimeoutVote`)
  scoped to every player still short of the round. Eligible voters are
  every player who *has* submitted this round — or, if none have,
  every player in the room (everyone votes on their own leniency in
  that edge case). The vote resolves (by plurality of votes cast) once
  every eligible voter has voted or `voteDeadline` (a fixed 2-minute
  window from when the vote opened) passes, whichever is first; zero
  votes cast by the deadline resolves to `force-empty`, guaranteeing
  the round can never deadlock. `full`/`half`/`15m` extend
  `Room.timerExtensions` for the still-stalled players only (not a
  round-wide reset); `force-empty` auto-submits an empty `Entry`
  (`emptyByTimeout: true`) for each still-stalled player/book pair,
  which — combined with round-gating above — lets the round advance
  normally. `Room.timerExtensions` and `Room.pendingTimeoutVote` reset
  to empty/`null` whenever the current round advances.
- **Laps per book.** A book completes after `Room.players.length *
  <resolved lapsPerBook>` entries rather than a single rotation through
  the room — i.e. `computeNextEntry`'s completion check
  (`position >= room.players.length`) and `computeNextEntries`'
  room-wide completion check both multiply the player count by the
  resolved laps value. Author rotation
  (`(originIndex + position) % players.length`) and entry-type
  alternation (`position % 2` → text/drawing) are unchanged and
  continue correctly across multiple laps with no special-casing —
  `position` simply keeps counting up past one full rotation. While
  `Room.lapsPerBook` is `null` (the host hasn't explicitly chosen a
  value), the Lobby derives and displays a *live* default from the
  current *active* (non-kicked) player count — 2 when fewer than 5
  active players, 1 otherwise — recalculating as players join, leave, or
  are kicked; the moment the host sets an explicit value (1–3), it locks
  to that number for the room's remaining life and no longer tracks
  player count. `onStartGame` resolves `Room.lapsPerBook` to a concrete
  number the same way (using the active count at start time via
  `activePlayers(room).length`) if it's still `null` when the game
  starts, so `computeNextEntry`/`computeNextEntries` never have to
  handle a `null` value themselves. (The active-count wording resolves
  the "live player count" ambiguity flagged in feedback and matches the
  `onStartGame` code.)
- **Curated prompts.** Applies to **`Entry.position === 0` only** — a
  book's opening phrase. Every later text entry is a blind guess written
  from only the drawing before it, so there is nothing to curate there;
  those turns stay free-form in both modes, unconditionally. When
  `Room.promptMode === 'curated'`, `onStartGame` shuffles the fixed
  phrase bank (a static constant in `shared/`, not stored per-room —
  Principle VI) and *partitions* it across the non-kicked players,
  dealing each `Room.curatedPromptCount` phrases into
  `Room.dealtPrompts`. Partitioning a single shuffle, rather than
  sampling independently per player, is what makes the
  no-phrase-reaches-two-players guarantee structural instead of a
  retry-until-distinct loop. A player's opening submission is accepted
  only if it matches one of their own dealt phrases, or — when
  `Room.allowPromptWriteIn` is `true` — is any free text they typed;
  the server never trusts the client's claim about which mode is
  active. **Bank exhaustion**: with no maximum player count anywhere in
  the design, `curatedPromptCount * playerCount` can exceed the bank, so
  the count is clamped at deal time to `floor(bankSize / playerCount)`
  with a floor of 1. A large room quietly gets fewer choices rather than
  the deal throwing or silently repeating a phrase — the distinctness
  guarantee outranks the host's requested count. The bank is sized so
  realistic rooms never reach the clamp.
  Curated settings follow the same lifecycle as `monochromeOnly` /
  `turnTimerMinutes` / `lapsPerBook`: *Play again* mints a brand-new
  `Room` whose settings start at their defaults for the host to
  reconfigure (no carry-over), while *Restart game* resets the same room
  in place and re-deals `dealtPrompts` alongside the regenerated `books`.
- **Prompt rating.** Applies to **`Entry.position === 1` only** — the
  single drawing turn whose source is a book's opening phrase. That
  drawer is the one player who had to work with the phrase, which makes
  them the only useful judge of it; every later drawing turn renders a
  mid-chain guess, which is a description of a drawing rather than a
  prompt and is never rated. Rating is optional — a turn submits
  normally whether or not a rating was cast — and at most one rating per
  book per game, recorded when the drawer submits their entry.

  Where a rating lands depends on the opening phrase's origin, which the
  server determines authoritatively (never from a client claim): if the
  position-0 `Entry.content` matches a `CURATED_PHRASE_BANK` entry
  verbatim, the rating increments that `PromptRating`'s `up` or `down`;
  otherwise the phrase was player-written (free-form mode, or a curated
  write-in) and a thumbs-up upserts a `CandidatePhrase` — incrementing
  `votes` if that exact text already exists, else creating it with
  `votes: 1`. A thumbs-down on a player-written phrase is discarded.

  A phrase that is *both* player-written and coincidentally identical to
  a bank entry is treated as a bank phrase; the two are indistinguishable
  by text and the bank tally is the more useful destination.

  Ratings are never attributed. Nothing links a `PromptRating` or
  `CandidatePhrase` back to the rater or the phrase's author — the
  curator needs the phrase and the count, not who said what.

- **Reveal pacing (synchronized clock).** `Room.revealStartedAt` is
  stamped the instant `status` transitions to `reveal` (the same
  transition already logged as `game_completed` in `onSubmitEntry`).
  Every client derives its Reveal-page animation position — which
  book's cover/entries are showing — as a pure function of `now -
  Room.revealStartedAt` against the same fixed cadence constants (cover
  delay, per-tick duration, entries per tick; see [[ui]] Reveal View),
  rather than incrementing local counters on that client's own
  `setTimeout`/`setInterval` ticks. This guarantees every player sees
  the same book at the same time regardless of when their own browser
  mounted the page or how much clock drift accumulates locally —
  reversed 2026-07-17 (feedback F001, `.project/feedback/
  feedback-main-4258.md`) from the original per-client-local-timer
  design, which let clients visibly diverge over a multi-book reveal
  sequence. Manual prev/next/skip controls (see [[ui]]) still work by
  jumping the *local* view ahead of or behind the clock-derived
  position; the clock only drives the default auto-advance pacing.
- **Reveal read-state (completed reads, last-write-wins).** A player
  *completes a read* of a book by opening its per-book modal and then
  closing it — "read" means "looked at" (opened-and-closed), not
  last-page-verified; paging is client-local and untrusted, so the server
  never checks a last page was reached. Both open and close ride a single
  last-write-wins `set_reading_book` event (`onSetReadingBook`,
  [[infrastructure]]) rather than paired open/close events: a non-null
  `bookId` sets `currentlyReading[playerId]` (modal opened, or switched);
  a `null` `bookId` clears it (modal closed). On *either* a close or a
  switch to a different book, the reader's *prior* open book is credited
  as a completed read — `playerId` is appended, deduped, to
  `bookReads[prevBookId]` — so a re-read never double-counts. A disconnect
  clears `currentlyReading[playerId]` but does NOT credit a read (it is
  not a chosen close; the reader resumes on reconnect). "Reveal all" then
  closing counts as a completed read like any other close. Both records
  are populated only while `status === 'reveal'` and reset empty on a
  fresh "Play again" room.
- **End-of-game controls (Reveal page).** Three distinct actions:
  - *Leave game* (non-host, `status === 'reveal'` only): client-local
    only — clears the leaving player's stored session token and
    resets their local session state. No server event;
    `Player.connected` and the room roster are left as-is (matches
    the existing pattern of not eagerly cleaning up
    disconnected/departed players).
  - *End game* (host-only, **any `Room.status`**): the `Room.status =
    'ended'` transition (`onEndGame`). Reachable both from the Reveal
    page's UI and from the moderation panel available during
    `lobby`/`writing` (see Moderation below) — the same handler, no
    status guard, since a host ending a game for offensive content
    can't wait for `reveal`. Revised from the original reveal-only
    guard when moderation controls were added: that guard existed only
    to make the artifact's wording match the code, and moderation
    requires an any-time end, so the wording moved instead of the
    code staying restricted.
  - *Play again* (host-only, `status === 'reveal'` only): creates a
    **brand-new** `Room` (fresh
    `id`, `status: 'lobby'`, empty `playAgainVotes`) and auto-joins
    every player in the old room's `players` array — regardless of
    `connected` state — as a new `Player` (new `id`, new
    `sessionToken`) in the new room; the old room's host remains host
    of the new room. Every currently-connected old-room socket is
    moved server-side (`socket.leave`/`socket.join`) and pushed its own
    new `{ room, player }` pair directly (not a room-wide broadcast,
    since each player's `Player` record differs) so their client
    routes to the new room's Lobby without re-entering a code. The old
    room is left in the store untouched (same non-cleanup pattern as
    `ended` rooms).
- **Moderation (kick / restart).** Host-only controls, visible during
  `lobby`/`writing`/`reveal` (see [[ui]] Lobby View / Writing-Drawing
  View), distinct from the Reveal-only "Play again" above:
  - *Kick player*: sets the target `Player.kicked = true`; their
    already-submitted entries stay in their books untouched, and the
    `Player` record itself is never deleted (so `authorId` lookups for
    already-authored entries keep resolving to a real name — see
    [[ui]] for how this differs from what the *roster display* shows).
    If the room is `writing` when the kick happens, `Room.nonContinuable`
    is also set `true` in the same operation — round-gating means a book
    still waiting on the kicked player's now-abandoned turn can never
    reach the next round on its own. Rather than teaching the
    round-robin engine to skip a kicked player's now-orphaned turn
    in-place (nontrivial: it would shift author-index math for every
    book, mid-round), `onSubmitEntry` simply rejects every further
    submission (`room-non-continuable`) while `Room.nonContinuable` is
    `true` — the round is frozen until the host restarts or ends.
    Kicking during `lobby` or `reveal` does not set `nonContinuable`
    (there's no in-progress round to strand): a `lobby` kick just
    shrinks the roster before `onStartGame`'s book generation, and a
    `reveal` kick is purely cosmetic (the game is already over). The
    kicked player's own client, on receiving the `roomUpdated` broadcast
    that carries its own `kicked: true`, immediately transitions to a
    distinct terminal state ("you were removed from this game by the
    host") rather than continuing to render its normal writing/drawing/
    reveal view — see [[ui]] States. Reversed 2026-07-17 (feedback F001,
    `.project/feedback/feedback-main-e2ff.md`): the kicked player's own
    client previously had no reaction at all to its own `kicked` flag and
    kept playing normally, which was never the intended behavior.
  - *Restart game*: only meaningful once `Room.nonContinuable` is
    `true`. Resets the **same** `Room` in place — `books` regenerated
    fresh (one per non-kicked player, per the existing
    `createBooksForRoom` shape used by `onStartGame`), `entries`
    empty, `status` back to `writing`, `roundStartedAt` reset to now,
    `timerExtensions`/`pendingTimeoutVote` cleared, `nonContinuable`
    reset to `false`. Unlike *Play again*, this does not create a new
    `Room.id` or new `Player` records — kicked players are simply
    excluded from the regenerated `books`, and everyone else keeps
    their existing `Player.id`/`sessionToken`.

## Indexes

Given the in-memory, single-process, small-room-count design (Principle
I), no formal indexing strategy is needed — rooms are looked up by
`Room.id` in a single in-memory map. Revisit only if room count or
lookup pattern changes materially.

## Production Annotations

- **In-memory-only state**: All game/room data lives in server process
  memory and is lost on restart or crash — in production, this would be
  backed by a durable or at-least replicated store (e.g. Redis) so a
  deploy doesn't kill in-progress games.
- **Unscoped dealt prompts**: `Room.dealtPrompts` ships in the room-wide
  broadcast, so every client can read every other player's candidate
  phrases. Inert for gameplay — an unchosen phrase never surfaces
  anywhere, and knowing another player's hand reveals nothing about what
  they picked — but it does leak information the "pass the folded paper"
  ethos would rather keep private. In production, the broadcast would
  scope each client to its own entry (the per-client push already used
  by *Play again* is the existing precedent for that shape).
- **Player-written content retained past the session**: A
  `CandidatePhrase` stores player-authored text durably, outliving the
  room that produced it — the first thing in this app to do so. Scoped
  by design (opening phrases only, thumbs-up only, no author link), and
  the file is reviewed by a human before anything enters the bank, which
  is also the filter for content nobody wants in the deck. In production
  with strangers rather than small private groups, this would need an
  explicit retention/consent story rather than an annotation.
- **No account system**: `Player` identity is purely session-based with
  no verification — in production supporting persistent profiles or
  matchmaking, this would need a real auth/account layer.
