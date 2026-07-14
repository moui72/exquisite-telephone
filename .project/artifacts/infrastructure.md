---
name: infrastructure
status: stable
last_updated: 2026-07-14
diagram_status: unrendered
diagram_type: graph TD
render_section: Infrastructure
render_hint: |
  Major runtime components as nodes (UI, server/API layer, database, sync
  engine, external APIs). Draw data flow between them as directed edges with
  short labels. Include one node per adapter if an adapters artifact exists.
  Keep it high-level: components and flows, not implementation detail.
---

# Infrastructure

## Overview

A single Node/TypeScript server process hosts both the Socket.IO realtime
layer and serves the Svelte client build: the server serves the client's
built static `dist/` output directly (no separate static-hosting
service), so the whole app runs as one process behind one port. There is
no database — game state lives in server memory (see [[datamodel]]), and
a short-lived session store supports reconnect-tolerance. This matches
Principle I ([[constitution]]) — no premature scaling infrastructure
before it's needed.

## Realtime Sync (Socket.IO)

Socket.IO is the transport for all lobby state, turn-passing, and
drawing-stroke sync. Chosen over raw WebSockets specifically because it
provides room management and reconnection handling out of the box
(Principle V — check library idioms before building custom mechanism),
which directly serves the reconnect-tolerance requirement below.

Each `Room` (see [[datamodel]]) maps to a Socket.IO room. Server-side
event handling is decomposed by concern (Principle VIII): one named
handler per event type (e.g. `onJoinRoom`, `onSubmitEntry`,
`onDrawStroke`, `onDisconnect`), not a single large switch.

## Session Store (Reconnect Tolerance)

A short-lived, in-memory session store maps `Player.sessionToken` ->
`Player.id` + `Room.id`, so a dropped connection (phone lock, wifi blip)
can rejoin the same room and resume the same seat rather than being
treated as a new player. This store is not a durable database — it
lives alongside room state and is lost on restart, consistent with
Principle I.

The token TTL is a few minutes (short enough to not hold up a game
waiting on someone who isn't coming back, long enough to cover a phone
lock or wifi blip). If a still-valid token attempts to rejoin a room
that has already ended, the server rejects the rejoin with a clear
"this game has ended" response rather than silently no-oping — the
client shows that state explicitly instead of failing ambiguously.

## Client / Server Boundary

The Svelte client holds no authoritative state — it renders whatever the
server's room/game state broadcasts and sends user actions (join, submit
entry, draw stroke) as Socket.IO events. This keeps a single source of
truth on the server (Principle VI) and avoids client/server state drift
during reconnects.

## Turn Timer Sweep

When a room's host enables a per-turn timer (`Room.turnTimerMinutes`,
see [[datamodel]]), rounds must still be able to advance even when no
player is actively connected to trigger a check (e.g. everyone
remaining is offline overnight — the whole point of the feature). A
single server-wide `setInterval` (period: 30s) sweeps all in-progress
rooms with a timer set: for each, if every still-short player's
deadline has passed and no `pendingTimeoutVote` is already open, it
opens one and broadcasts the updated room state. The same sweep also
resolves any already-open vote whose `voteDeadline` has passed with
fewer than all eligible votes cast (per [[datamodel]] Normalization
Rules: plurality of votes cast, or `force-empty` if none). No
persistent timer/queue infrastructure (e.g. Redis-backed job scheduler)
is introduced — a single in-process interval is sufficient at this
app's scale (Principle I), consistent with everything else here living
in one process's memory.

## Export Pipeline (PNG)

At game end, a player can save a `Book` they like as a PNG image strip
(drawings and text captions stacked vertically). This is rendered
client-side from the same `Book`/`Entry` data already present in the
client's view of the room: drawing entries are stroke data (see
[[datamodel]]) replayed onto an off-screen canvas, composited with
rendered text captions, then flattened to a single PNG — avoiding a
server-side rendering dependency. HTML/SVG/PDF export formats are
explicitly deferred past v1; PNG only for now.

## Deployment (Fly.io)

The app deploys as a single Fly.io app running one process/container —
matching Principle I (no premature scaling): one Dockerfile, one
`fly.toml`. The Docker build is multi-stage: install and build
`shared`/`server`/`client` via pnpm workspaces, then a slim runtime
image running only the compiled server (which serves the client's
static build, per the Overview above). The server reads its listen port
from the `PORT` environment variable (already supported by
`server/src/config.ts`); Fly injects `PORT` into the container at
runtime.

## Production Annotations

- **Single server process, no horizontal scaling**: All room state lives
  in one process's memory — in production expecting concurrent load
  beyond a single instance, this would need shared state (e.g. Redis
  adapter for Socket.IO) and a real session store with TTL eviction.
- **No durable persistence**: A server crash or deploy loses all
  in-progress and completed-but-unsaved games — in production, finished
  books worth preserving would be written to a real datastore before
  the room is torn down.
- **No zero-downtime deploys**: A Fly deploy restarts the single
  process, dropping all in-progress in-memory games — in production,
  this would need either a durable store to resume from (see above) or
  a maintenance-window/drain strategy before deploying.
