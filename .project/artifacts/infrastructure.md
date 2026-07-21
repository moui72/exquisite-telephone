---
name: infrastructure
status: stable
last_updated: 2026-07-21
diagram_status: current
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
`onSetPromptMode`, `onSetCuratedPromptCount`,
`onSetAllowPromptWriteIn`, `onSetReadingBook`, `onSubmitEntry`, `onCastTimeoutVote`, `onVoteToPlayAgain`, `onPlayAgain`,
`onKickPlayer`, `onRestartGame`, `onRejoin`, `onDisconnect`), not a single large
switch. Drawing entries sync only once, in full, via `onSubmitEntry`
when a player finishes their turn — there is no per-stroke real-time
sync handler; stroke data never leaves the client mid-turn.

`onSetReadingBook` is deliberately a *single* last-write-wins event
(`{ roomId, playerId, bookId: string | null }`) rather than paired
open/close events — the same reasoning as the no-`onRatePrompt` decision
below: one event has no ordering hazard and no double-tap idempotency
story to reconcile, whereas separate open and close events could arrive
out of order or be duplicated. Open sets `currentlyReading`; close (or a
switch) credits the reader's prior book to `bookReads` (see [[datamodel]]
Normalization Rules — Reveal read-state).

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

**Strip styling — dividers and branding.** The composited strip is not a
bare stack of panels; it carries three presentational elements, all drawn
client-side in the same compositing pass (no new data, no server work):

- **Per-panel dividers.** Each turn's panel is visually separated from the
  next by a clear border/divider, so an individual turn is distinguishable
  in the strip rather than the panels reading as one continuous column.
  Dividers use the theme's frame accent (Marigold — see [[ui]] Visual
  Identity) so the seam reads as intentional gallery framing, not a raw
  gap.
- **A branded border decoration** framing the whole strip — the same
  gilt-frame visual language as the in-app Gilt Frame ([[ui]]), rendered
  in the export as a static composited border rather than the live CSS
  component.
- **A footer** below the last panel bearing the "Exquisite Telephone"
  wordmark and the canonical URL `ex-tel.ty-pe.com`, so a shared export
  is self-identifying and doubles as organic promotion for the game. The
  URL is the production custom domain (see Deployment below); it is a
  static string in the exporter, not derived from the running host, so a
  strip saved from beta still carries the production URL a recipient can
  visit.

These are styling concerns entirely inside the client exporter; the
`Book`/`Entry` data it reads is unchanged.

## Deployment (Fly.io)

**There are TWO Fly apps, not one.** Read this section before touching
anything deployment-shaped: a change applied to only one channel is the
single most repeated mistake in this repo's history.

| | Production | Beta |
|---|---|---|
| Fly app | `exquisite-telephone` | `exquisite-telephone-beta` |
| Config | `fly.toml` | `fly.staging.toml` |
| CI token secret | `FLY_API_TOKEN_PROD` | `FLY_API_TOKEN_BETA` |
| Deploying workflow | `promote.yml` (manual dispatch) | `ci.yml` job `deploy-beta` (automatic) |
| Concurrency group | `promote-release` | `deploy-beta` |
| Deploys from branch | `release` | `main` |
| Trigger | a human dispatches | any push to `main` |
| Volume | `vol_r681m3no1nq5ex14` | `vol_vp2l1gyjj3lw9me4` |
| Custom domain | `ex-tel.ty-pe.com` | `beta-ex-tel.ty-pe.com` |

Each channel has its own app, its own config, its own API token, and its
own volume. Nothing is shared between them but the Dockerfile and the
source tree.

**Channel semantics.** Every push to `main` auto-deploys **beta** — so
anything merged is live on beta within minutes, including any config
mistake. Production deploys ONLY from the `release` branch, and `release`
only ever receives a **fast-forward of `main`** — it is never developed
on directly and never diverges. `.github/workflows/ci.yml` does not run
on `release` at all: it triggers on pushes to `main` and on pull
requests. Re-running checks there would only test the same tree twice,
since the identical commits already passed them on their push to `main`.
(An earlier design ran CI on `release` and skipped the `checks` job with
a `github.ref` guard; once `release` left the push triggers, that guard
could never fire and was removed.) Promoting `release` is a dispatchable
workflow that fast-forwards **and** deploys — not a remembered command,
and not a push that some other job reacts to — see Release Promotion
below.

Note the asymmetry this creates, and keep it: beta deploys are automatic
and prod deploys are an explicit human act. The two channels differ in
their *config* by exactly one key, but differ in their *trigger* by
design.

### Config Lockstep — generated, not hand-maintained

The two Fly configs are meant to differ in exactly one key (`app`), and
for a period they silently didn't: `fly.staging.toml` lost its
`[mounts]` block and `CURATION_DATA_PATH`, discarding beta's curation
data on every deploy. The header comment asserting the files mirror each
other was documentation, not enforcement, and documentation cannot fail
a build.

**Both configs are generated from a single source.** One template plus a
small per-channel values table produces `fly.toml` and
`fly.staging.toml`; the generated files stay checked in (so `flyctl
deploy --config` keeps working unchanged, and a reader sees the real
config in the repo). CI regenerates both and fails if the committed
files differ from the regenerated output — the check *is* the diff, so a
hand-edit of a generated file is caught rather than blessed.

Generation was chosen over a lint that merely compares the two files.
A comparison lint detects drift after someone writes it; generation
makes drift structurally unexpressible — there is no place to type a
value into one channel and not the other. The cost is one build step and
the discipline of editing the template rather than the output, which the
CI check enforces on any lapse.

**The per-channel values table is the allowlist.** A key belongs there
only when the two channels genuinely must differ. Today that is `app`
alone; the volume IDs differ in reality but are not named in either
config, so they don't appear. Adding a key to that table is the explicit
act of declaring a channel difference — the point is that it can't
happen by accident.

The check lives in CI's `checks` job, which never runs on `release`
(above). That is correct rather than a gap: `release` only ever receives
a fast-forward of `main`, so the identical tree already passed the check
on `main`.

### Release Promotion

Cutting production is a `workflow_dispatch` in
`.github/workflows/promote.yml` that fast-forwards `release` from `main`
**and then deploys prod in the same run**. It replaces both the manual
`git push origin main:release` a human had to remember and the
push-triggered deploy job that used to react to it.

Re-dispatching when `release` is already current is harmless: the push is
a no-op and the deploy re-ships the same tree.

**The workflow deploys directly; it does not rely on its own push to
trigger a deploy.** A push authenticated with the default `GITHUB_TOKEN`
does not trigger further workflow runs — GitHub's recursion guard — so a
promote workflow that only pushed and expected a separate push-triggered
job to fire would report success while deploying nothing. Rather than
reach for a personal access token to defeat that guard, promotion does
both halves itself: fast-forward `release`, then run `flyctl deploy
--config fly.toml` with `FLY_API_TOKEN_PROD`.

This keeps the repo free of any hand-created PAT — no expiry to track, no
token tied to one person's account, no credential outside the two Fly
tokens the deploy already needs.

**Promotion is therefore the ONLY path that deploys production.**
`ci.yml` has no push-triggered `deploy-prod` job; a manual `git push
origin main:release` fast-forwards the branch and deploys nothing. That
is deliberate — one prod deploy path rather than two that must be kept in
sync — but it does mean `release` moving is not by itself evidence that
prod was deployed. The dispatch run is.

**Fast-forward only, never a merge.** The push is a plain
non-force-`push` of `main` into `release`; if it is rejected as
non-fast-forward, that means `release` has diverged from `main`, which
is precisely the invariant the whole dual-channel scheme rests on. The
workflow fails loudly there rather than merging, forcing a human to
investigate how `release` acquired a commit `main` doesn't have. A
workflow that "helpfully" merged would repair the symptom and destroy
the signal — and would push a tree to production that never passed
`checks` on `main`, which is the exact assumption letting `release` skip
them.

Dispatch is manual (a human decides when to cut), and the run record is
the audit trail the manual push never produced.

**Principle I is still satisfied.** The earlier "single Fly.io app"
phrasing in this section was simply wrong, not a scaling claim that has
since lapsed: each app runs exactly **one machine, one process**, which
is what Principle I (no premature scaling) actually asks for. Two
channels of one machine each is not horizontal scaling — it is a staging
environment.

The Docker build is multi-stage: install and build
`shared`/`server`/`client` via pnpm workspaces, then a slim runtime
image running only the compiled server (which serves the client's
static build, per the Overview above). The server reads its listen port
from the `PORT` environment variable (already supported by
`server/src/config.ts`); Fly injects `PORT` into the container at
runtime.

A Fly **volume** is mounted for the Curation Store (see above) — the
only persistent disk this app uses, and **one per channel**, never
shared. `CURATION_DATA_PATH` (`/data/curation.json`) resolves inside
that mount. The volume is what carries curation data across the process
restart every deploy causes; without it, curation data would be
recreated empty on each release — which is exactly what beta did
silently until `fly.staging.toml` gained its `[mounts]` block and
`CURATION_DATA_PATH`. Game state is deliberately *not* moved onto it.

Because the volume pins each app to the one machine that mounts it,
`fly scale count 1` matters (see the note in `fly.toml`): a second
machine would neither see that volume nor share its files. This is
independent of, and additional to, the in-memory-room-state reason for
running one machine.

### One-time MANUAL CLI steps — per app, not per repo

These are **manual**, run by a human with `flyctl`, and are *not*
performed by CI or by `fly deploy`. They are listed explicitly because
they are precisely what gets forgotten when a second channel is added:
CI deploys look healthy, and the omission surfaces later as a machine
that will not start, or as data that silently goes nowhere.

Run **once per app** — `exquisite-telephone` AND
`exquisite-telephone-beta`:

```
fly status -a <app>                       # read the machine's ACTUAL region
fly volumes create curation_data --app <app> --region <that region> --size 1
fly scale count 1 -a <app>                # after the first deploy
```

**The volume region must match the RUNNING MACHINE's region**, read from
`fly status`, and not necessarily `primary_region` in the config. A
volume in a different region is invisible to the machine, which then
fails to start with **no obviously storage-related error** — the deploy
reports success right up until nothing comes back up.

1GB is Fly's minimum volume size — far beyond what a few hundred rating
events need, but there is no smaller option and no reason to pick a
larger one.

**Current state: both volumes already exist and are verified.** No
`fly volumes create` is outstanding for either channel.

| App | Volume ID | Size | Region | Machine region |
|---|---|---|---|---|
| `exquisite-telephone` | `vol_r681m3no1nq5ex14` | 1GB | `iad` | `iad` — matches |
| `exquisite-telephone-beta` | `vol_vp2l1gyjj3lw9me4` | 1GB | `iad` | `iad` — matches |

**No repo-level manual step exists.** Promotion deliberately introduces
none: it authenticates its push with the built-in `GITHUB_TOKEN` and its
deploy with `FLY_API_TOKEN_PROD`, both of which already exist. The
deployment topology's only manual steps remain the per-app `flyctl` ones
above, and all of them are done.

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
- **Curation event cap (`MAX_CURATION_EVENTS = 65_536`)**: The curation
  store accepts at most `MAX_CURATION_EVENTS` rating events; once the cap
  is reached, every subsequent rating is **dropped, not rotated** — old
  evidence is never evicted, so a curator holds the *first* N ratings
  rather than the most recent. This is a deliberate accepted shortcut:
  curation data is read by one human every few weeks, so losing the tail
  after 65,536 ratings is tolerable and the write path stays simple (a
  game turn that triggers a full store still succeeds and never learns
  curation is full — it fails safely, logging once). The intended remedy
  is the backlogged `curation-data-aggregation-pipe`, which would drain
  and truncate the log on a schedule. The behavior and its inline
  `PRODUCTION ANNOTATION` comment already exist at
  `server/src/domain/curationStore.ts:225`; this records it where the
  constitution requires a production annotation to live.
