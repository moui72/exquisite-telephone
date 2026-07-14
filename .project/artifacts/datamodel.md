---
name: datamodel
status: stable
last_updated: 2026-07-13
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
| status | enum | `lobby` \| `writing` \| `reveal` \| `ended` — a room-wide phase only; there is no room-wide `drawing` phase, since players progress through their own book asynchronously and are individually writing or drawing at any given moment (see `Entry.type` below) |
| books | Book[] | One per player's original prompt |
| createdAt | timestamp | |

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
| content | string | Text phrase, or serialized drawing. Drawings are stored as vector stroke data (an ordered array of strokes, each a list of points) rather than raster — smaller over the wire, replayable, and rasterized to PNG only at export time (see [[infrastructure]] Export Pipeline). |

## Normalization Rules

- `Room.id` is generated as a short, unambiguous code (avoiding
  visually-similar characters) rather than a UUID, since it's read aloud
  or typed by players.
- `Entry.position` is strictly sequential per `Book` starting at 0; no
  gaps, since it directly drives turn order and reveal order.
- `Player.id` persists only for the lifetime of a room; it is not reused
  across rooms or sessions.

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
