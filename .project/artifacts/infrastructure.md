---
name: infrastructure
status: stable
last_updated: 2026-07-20
diagram_status: stale
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

One narrow exception writes to disk: the **Curation Store** below, an
append-only directory of per-event JSON files recording prompt ratings
and candidate phrases. It is not
game state and no running game reads it, so the "all game state is
in-memory" property above is unchanged.

## Realtime Sync (Socket.IO)

Socket.IO is the transport for all lobby state, turn-passing, and
drawing-stroke sync. Chosen over raw WebSockets specifically because it
provides room management and reconnection handling out of the box
(Principle V — check library idioms before building custom mechanism),
which directly serves the reconnect-tolerance requirement below.

Each `Room` (see [[datamodel]]) maps to a Socket.IO room. Server-side
event handling is decomposed by concern (Principle VIII): one named
handler per event type (`onCreateRoom`, `onJoinRoom`, `onStartGame`,
`onEndGame`, `onSetMonochrome`, `onSetTurnTimer`, `onSetLapsPerBook`,
`onSubmitEntry`, `onCastTimeoutVote`, `onVoteToPlayAgain`, `onPlayAgain`,
`onKickPlayer`, `onRestartGame`, `onRejoin`, `onDisconnect`), not a single large
switch. Drawing entries sync only once, in full, via `onSubmitEntry`
when a player finishes their turn — there is no per-stroke real-time
sync handler; stroke data never leaves the client mid-turn.

There is deliberately no `onRatePrompt` handler. A prompt rating rides
along in the `onSubmitEntry` payload as an optional field, because it is
a property of the submission — cast on the same screen, settled at the
same moment. A separate event would need its own idempotency story for a
double-tap and could arrive after the entry it describes; riding the
submission makes the rating atomic with the thing it rates.

`onEndGame` carries no `Room.status` guard (host-only is the only
check) — it's reachable both from the Reveal page and from the
moderation panel available during `lobby`/`writing` (see [[datamodel]]
Normalization Rules — End-of-game controls). `onKickPlayer` (host-only)
sets the target `Player.kicked = true` and, if `status === 'writing'`,
also sets `Room.nonContinuable = true` in the same update. `onRestartGame`
(host-only, requires `Room.nonContinuable === true`) regenerates
`books`/`entries` for the same `Room` and returns it to `writing` — see
[[datamodel]] Normalization Rules — Moderation for the full field-level
behavior of all three.

Every other handler broadcasts one shared payload to a room
(`socket.to(roomId).emit(...)`), since every recipient's view of that
payload is identical. `onPlayAgain` (see [[datamodel]] Normalization
Rules — End-of-game controls) is the one exception: each old-room
player gets their *own* new `Player` record in the new room, so a
room-wide broadcast doesn't fit. Instead the server iterates the
Socket.IO room's connected sockets, moves each
(`socket.leave(oldRoomId)` / `socket.join(newRoomId)`, updating
`socket.data`), and emits a per-socket `roomChanged` event carrying
that specific socket's own `{ room, player }` pair.

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

## Curation Store

The curated phrase bank (`CURATED_PHRASE_BANK` in `shared/`) is a
build-time constant, but deciding *what belongs in it* needs evidence
from real play. The Curation Store is where that evidence accumulates:
prompt ratings and candidate phrases (see [[datamodel]] Persisted
Entities), written when a player rates the opening phrase they drew.

**Shape.** An append-only event log: a directory of small JSON files,
**one file per rating event**, each written exactly once and never
mutated afterwards. An event carries the phrase, the rating value, its
origin (bank phrase vs player-written), and a timestamp — see
[[datamodel]] Persisted Entities. The `PromptRating` / `CandidatePhrase`
shapes a curator reads are no longer the on-disk shape; they are a
**derived aggregate view**, produced by folding the event log at read
time (see [[datamodel]]).

**Filenames are server-controlled.** A file name is composed ONLY of a
timestamp and a random suffix — no player-influenced component, not even
a sanitized slug of the phrase. Player text belongs in the file's
*contents*, where it is inert, never in its path. A slug is the tempting
shape and the wrong one: it puts attacker-influenced bytes into a
filesystem path for no benefit the timestamp does not already provide.
The write path additionally refuses any resolved target outside the
configured curation directory, so a future change to the naming scheme
cannot silently reintroduce traversal.

**Why a file and not a database.** The whole dataset is a few hundred
counters and a string list, read by one human every few weeks when
pruning the bank. SQLite would add a dependency and a query engine to
solve a problem `JSON.parse` already solves; Postgres would add a
network hop and credentials to an app that currently has neither
(Principle I — the simplest thing that satisfies the requirement).
Emitting ratings as structured log events (Principle IX) was considered
and rejected: Fly's log retention is short and there is no aggregation,
so mining them would need a log drain — more infrastructure, not less.

The "revisit if the app ever runs more than one process" caveat that
stood here is **resolved, not deferred**: append-only removes the
question. Distinct writers never touch the same file, because each event
gets its own uniquely-named file, so concurrent writers are not a
correctness problem for this store. (They remain one for in-memory game
state, and the Fly volume still pins the app to one machine — both
stated independently under Deployment.)

**Durability.** There is no atomic rewrite and no debounce, because
there is nothing to rewrite and nothing to buffer. Each event is created
once, with an exclusive create, and never read-modify-written. That
retires the whole temp-file/`fsync`/`rename` dance along with the
debounce timer and its flush-on-shutdown hook: they existed only to make
a whole-file rewrite survivable.

Crash safety degrades to the mildest possible failure — **at worst one
partial trailing file**, the event that was mid-write when the process
died. The read-time fold skips a corrupt or truncated file with a logged
warning rather than failing the whole aggregate, so a single bad trailing
file costs exactly one rating and nothing else. This is telemetry: a lost
rating is not data any player can miss.

**Location.** `CURATION_DATA_PATH` remains the single configured knob,
defaulting to a gitignored local path for dev. The event directory is
**derived from it** — the `curation-events/` directory beside it — so
the deployment surface stays one environment variable per channel and
both Fly configs keep the value they already declare. In deployment that
resolves inside a Fly volume mount (see Deployment), which is what makes
the events survive the process restart a deploy causes. A missing
directory is the normal first-run case, not a failure: it is created on
first write, and a read that finds nothing yields an empty aggregate.
Nothing about curation storage is ever fatal to boot — a lost curation
file must never keep the game from starting.

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

A Fly **volume** is mounted for the Curation Store (see above) — the
only persistent disk this app uses. `CURATION_DATA_PATH` points at a
file inside that mount (`/data/curation.json`). The volume is what
carries curation data across the process restart every deploy causes;
without it the file would be recreated empty on each release. Game state
is deliberately *not* moved onto it.

### One-time volume creation (required before the first deploy)

`fly deploy` does **not** create the volume for you. A deploy whose
`fly.toml` declares a `[mounts]` entry with no matching volume fails at
machine start, not at build time — so it looks like a healthy deploy
right up until nothing comes back up. Create it once, by hand:

```
fly status                       # read the machine's ACTUAL region
fly volumes create curation_data --size 1 --region <that region>
```

**The region must match the machine's**, not necessarily
`primary_region` in `fly.toml`. A volume in a different region is
invisible to the machine, which then fails to start with no obviously
storage-related error. Always read the running machine's region from
`fly status` rather than assuming it followed `primary_region`.

1GB is Fly's minimum volume size — far beyond what a few hundred
counters need, but there is no smaller option and no reason to pick a
larger one.

Because the volume pins the app to the one machine that mounts it, this
is also why `fly scale count 1` matters (see the note in `fly.toml`): a
second machine would neither see this volume nor share the file.

## Production Annotations

- **Single server process, no horizontal scaling**: All room state lives
  in one process's memory — in production expecting concurrent load
  beyond a single instance, this would need shared state (e.g. Redis
  adapter for Socket.IO) and a real session store with TTL eviction.
- **No durable persistence**: A server crash or deploy loses all
  in-progress and completed-but-unsaved games — in production, finished
  books worth preserving would be written to a real datastore before
  the room is torn down.
- **Curation store is single-writer and volume-bound**: The JSON file
  assumes exactly one process writing it. The volume also pins the app
  to the single machine that mounts it — already true of this app for
  in-memory-state reasons, but now enforced by storage as well. Running
  a second instance would both corrupt the file (last-write-wins over
  whole-file rewrites) and only see its own volume.
- **No zero-downtime deploys**: A Fly deploy restarts the single
  process, dropping all in-progress in-memory games — in production,
  this would need either a durable store to resume from (see above) or
  a maintenance-window/drain strategy before deploying.
