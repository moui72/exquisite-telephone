---
name: datamodel
status: stable
last_updated: 2026-07-14
diagram_status: unrendered
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

### Player

| Field | Type | Notes |
|-------|------|-------|
| id | string | Ephemeral session identity — no account, no persistent user record |
| roomId | string | FK -> Room.id |
| name | string | Display name chosen at join time |
| connected | boolean | Drives reconnect-tolerance UI state |
| sessionToken | string | Opaque token used to resume the same Player.id after a dropped connection. TTL and rejoin-after-end behavior are defined in [[infrastructure]]'s Session Store section. |

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
