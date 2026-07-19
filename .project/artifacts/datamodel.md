---
name: datamodel
status: stable
last_updated: 2026-07-18
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
reconnect-tolerance (see [[infrastructure]]) but nothing here is intended
to survive a server restart.

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
| timerExtensions | Record\<playerId, number\> | Per-player extra milliseconds granted this round via a timeout vote (see Normalization Rules); cleared whenever the round advances. |
| pendingTimeoutVote | TimeoutVote \| null | Set by the server when a round's timer expires with players still short of their deadline; `null` otherwise. See `TimeoutVote` below. |
| playAgainVotes | string[] | FK -> Player.id, deduplicated. Non-host players who've clicked "vote to play again" on the Reveal page (see [[ui]] Reveal View). Purely informational — shown to the host as a readiness count, does not gate `Room.status`. Never populated outside `status === 'reveal'`; a fresh `Room` created by "Play again" starts with an empty array like any other new room. |
| nonContinuable | boolean | Set `true` the moment a host kicks a player while `status === 'writing'` (see Normalization Rules — Moderation); `false` otherwise, including after "restart game" clears it. Never set outside `writing`; a kick during `lobby` or `reveal` has nothing to make non-continuable. |
| revealStartedAt | timestamp \| null | Epoch ms marking when `status` transitioned to `reveal`; `null` otherwise. Gives every client a shared reference point to derive the Reveal page's animated pacing (current book index, revealed-entry count) as a pure function of `now - revealStartedAt`, rather than each client running its own independent local timer — see [[ui]] Reveal View and Normalization Rules below. |
| lapsPerBook | number \| null | Host-configurable, set before `status` leaves `lobby`; `null` means the host hasn't explicitly chosen a value yet — see Normalization Rules for the live-default-until-overridden behavior. When non-`null`, one of `1 \| 2 \| 3`. Governs how many full rotations through `Room.players` each book completes before the game ends (see Normalization Rules — Laps per book). |

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
- **Minimum player count.** `Room.status` may not transition out of
  `lobby` (`start_game`) with fewer than 3 players unless the host
  explicitly overrides — no persisted override flag; it's a one-time
  acknowledgment on the `start_game` request itself, not room state.
  Recommended: 4+. Floor: 1 (a solo host can still override-start for
  testing). See [[ui]] Lobby View.
- **Turn timer (optional).** When `Room.turnTimerMinutes` is set, each
  player still short of the current round has an individual deadline of
  `Room.roundStartedAt + (Room.timerExtensions[playerId] ??
  Room.turnTimerMinutes * 60000)`. A background process (see
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
  current player count — 2 when fewer than 5 players, 1 otherwise —
  recalculating as players join or leave; the moment the host sets an
  explicit value (1–3), it locks to that number for the room's
  remaining life and no longer tracks player count. `onStartGame`
  resolves `Room.lapsPerBook` to a concrete number the same way (using
  player count at start time) if it's still `null` when the game
  starts, so `computeNextEntry`/`computeNextEntries` never have to
  handle a `null` value themselves.
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
- **No account system**: `Player` identity is purely session-based with
  no verification — in production supporting persistent profiles or
  matchmaking, this would need a real auth/account layer.
