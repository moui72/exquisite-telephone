---
name: infrastructure
status: stable
last_updated: 2026-11-26
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
`onEndGame`, `onSetPaletteMode`, `onSetFillTool`,
`onSetTurnTimer`, `onSetLapsPerBook`, `onSetDisplayName`,
`onSetPromptMode`, `onSetCuratedPromptCount`,
`onSetAllowPromptWriteIn`, `onSetReadingBook`, `onSubmitEntry`, `onSubmitCover`, `onCastTimeoutVote`, `onVoteToPlayAgain`, `onPlayAgain`,
`onKickPlayer`, `onRestartGame`, `onRejoin`, `onDisconnect`), not a single large
switch. `onSubmitCover` (host or any player, for their *own* book only —
the server checks `Book.originAuthorId` matches the caller) finalizes that
player's book cover during `status === 'decorating'`: it stores the
submitted `cover` draw ops and `coverTemplate` on the book and appends the
player to `Room.coverSubmissions` (see [[datamodel]] Normalization Rules —
Cover decoration). Cover draw-op payloads are bounded at this submission
boundary by the **same drawing-payload cap** as `onSubmitEntry`
drawings — the cap protects in-memory state ahead of the store, exactly as
for entries (see [[datamodel]] Normalization Rules — `Entry.content`
maximum length). If every active player has now submitted, the same
handler closes the window early (`status = 'reveal'`); otherwise the
sweep below closes it on expiry. Drawing entries sync only once, in full, via `onSubmitEntry`
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

The **same sweep also closes the cover-decoration window** (see
[[datamodel]] Normalization Rules — Cover decoration). For each room at
`status === 'decorating'`, if `decorationWindowStartedAt + 120000` ms has
passed, the sweep transitions the room to `reveal` (clearing
`decorationWindowStartedAt`, stamping the reveal transition and its
`game_completed`/reveal log the same way `onSubmitEntry`'s completion path
does) and broadcasts. This reuses the existing interval and its
already-connected-independence property — the window must close even if
every remaining player has gone offline mid-decoration — rather than
introducing a second timer. Early close (all active players submitted)
happens synchronously in `onSubmitCover`; the sweep is only the
expiry backstop.

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
and rejected: the host's log retention is short and there is no aggregation,
so mining them would need a log drain — more infrastructure, not less.

The "revisit if the app ever runs more than one process" caveat that
stood here is **resolved, not deferred**: append-only removes the
question. Distinct writers never touch the same file, because each event
gets its own uniquely-named file, so concurrent writers are not a
correctness problem for this store. (They remain one for in-memory game
state, and the volume still pins the app to one replica — both
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
the deployment surface stays one environment variable. In deployment that
resolves inside the Railway volume mount (see Deployment), which is what makes
the events survive the process restart a deploy causes. A missing
directory is the normal first-run case, not a failure: it is created on
first write, and a read that finds nothing yields an empty aggregate.
Nothing about curation storage is ever fatal to boot — a lost curation
file must never keep the game from starting.

### Aggregation Pipe

A deterministic, agent-free CLI is the aggregate
view's only reader (the store's `createCurationStore` reserves this — no
boot-time fold). It has two invocation forms for one source module
(`server/src/curation/cli.ts`):

- **prod / on-machine:** `node server/dist/curation/cli.js` — the compiled
  entrypoint emitted by the server `tsc` build (`tsconfig.build.json`, which
  excludes only `*.test.ts`) and copied into the slim runtime image alongside
  `server/dist/index.js` (WORKDIR `/app`). This is what the scheduled workflow
  runs via `railway ssh`. The deployed container has **no `src/` and no
  `tsx`**, so the dev form below cannot run there.
- **dev / local:** `pnpm --filter server curation:aggregate`
  (`tsx src/curation/cli.ts`) — the source-run convenience for a local event
  directory; never used on the deployed machine.

It reads `CURATION_DATA_PATH`'s event directory, folds it via
the existing `aggregateEvents` (no new fold logic), and produces a
**consolidated snapshot** of the curation view (`CurationData` — see
[[datamodel]]). Three responsibilities:

- **Sanitize for display.** Candidate `phrase` text is verbatim untrusted
  player input; the pipe is the single chokepoint that neutralizes it for any
  reader (a human curator's terminal today; an agent tomorrow — see Ingestion
  Skill). Deterministic display-safety only: strip C0/C1 control chars and ESC
  (`0x1B`) (terminal/ANSI injection), neutralize bidi overrides
  (`U+202A–202E`, `U+2066–2069`) and zero-width characters (display spoofing).
  **Output only** — never the fold's exact-text dedup key (which the fold
  keeps distinct on purpose; normalizing it would silently merge phrases — see
  [[datamodel]] Persisted Entities).
- **Archive folded events (the `MAX_CURATION_EVENTS` remedy).** Write the
  snapshot durably first (temp + `fsync` + atomic `rename`), *then* `rename`
  the folded event files into a `curation-events-archive/<snapshot-ts>/`
  directory on the same volume. "Folded" = successfully read, parsed, and
  incorporated; a corrupt/skipped event is **not** folded and is left in place
  (a lost rating stays visible, never swept away). Moving folded events out of
  the live dir resets the count so the store accepts new ratings again;
  archived events still occupy the volume (a later, out-of-scope offload
  concern under the 50 MiB budget).
- **Restart to refresh the cached count.** The running server seeds its
  in-memory event count once and never re-reads the directory, so after an
  archive run its cache is stale until the process restarts. A scheduled
  GitHub Actions workflow (`.github/workflows/curation-aggregate.yml`) owns
  this: weekly (a fixed-UTC cron, ~Sunday 02:00 America/New_York with an
  accepted ±1h DST drift) plus manual `workflow_dispatch`, it runs the pipe
  via `railway ssh` and then `railway restart`s the service so the count
  re-seeds from the now-smaller directory. It runs against prod only (there
  is no beta channel today; see Deployment). No server↔pipe signaling is introduced (Principle I);
  the restart is the whole coupling.

### Ingestion Skill

A repo-local Claude Code **maintainer tool** (a `.claude/skills/` skill, like
`audit-help-text`) — **not app runtime**: it runs in Claude Code during
curation, ships no dependency into the server, and touches no game state, so
the "no LLM in the app" scope ([[constitution]]) is unchanged. As its first
step it **offers to fetch** the pipe's snapshot itself, **read-only**, from the
Railway volume (`railway ssh` running `cat` — a read of an already-produced
snapshot, never a mutating `railway` command; dev reads the local path) rather than requiring
a pre-pull, then analyzes the counts,
and **recommends** deck additions (strong-vote `CandidatePhrase` entries judged
against `shared/PROMPT_CRITERIA.md`) and removals (down-heavy bank
`PromptRating` entries) as a **report a human applies** — it never edits
`shared/src/phraseBank.ts`.

Because it is an LLM ingesting untrusted player text, its design is the
injection boundary the curation `Why:` describes. The defense is
**architectural, not a string filter**: candidate text is fed as structured
data (never instruction position), the skill treats candidate text as data
that is *never* an instruction, it holds **no deck-write and no mutating-`railway`
privilege**, and a human approves every change — so a successful injection
degrades to at worst a rejected recommendation. It keeps a **ledger** of
logged-but-not-decked candidates (disposition pending/rejected/promoted) and a
separate **offensive-quarantine** file; both are **gitignored volume
artifacts, never committed** to this public repo (see [[datamodel]] Persisted
Entities).

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
  strip saved from any non-production host still carries the production URL
  a recipient can visit.

These are styling concerns entirely inside the client exporter; the
`Book`/`Entry` data it reads is unchanged.

## Deployment (Railway)

**There is ONE channel: production, on Railway.** The app moved from
Fly.io to Railway on 2026-11-26, and the Fly beta channel was dropped at
the same time rather than rebuilt. Beta can come back later as a second
Railway environment in the same project; see End-to-End Test Gate below
for what that restores.

| | Production |
|---|---|
| Railway project | `exquisite-telephone` (`209036ff-b724-43b0-895d-460fecd64d3d`) |
| Environment | `production` |
| Service | `web` |
| Region | `us-east4-eqdc4a` (Virginia) |
| Volume | `web-volume`, mounted at `/data` |
| CI secrets | `RAILWAY_TOKEN` (project token, production env), `RAILWAY_SSH_KEY` |
| Deploying workflow | `promote.yml` (manual dispatch) |
| Deploys from branch | `release` |
| Custom domain | `ex-tel.ty-pe.com` (DNS in Namecheap on `ty-pe.com`) |

**Pushes deploy nothing.** `ci.yml` runs `checks` (lint, type-check,
test) on every push to `main` and every PR, and that is all it does.
Production deploys ONLY from the `release` branch, and `release` only
ever receives a **fast-forward of `main`**: it is never developed on
directly and never diverges. `ci.yml` does not run on `release`, since
the identical commits already passed `checks` on their push to `main`.
The service has **no GitHub autodeploy connected**, on purpose: it would
open a second prod deploy path that bypasses promotion.

**Service settings live in Railway, not in the repo.** Railway's legacy
`railway.toml` is deprecated (it stops being read on 2026-12-01) and its
replacement is a TypeScript IaC SDK, which would add a dependency for a
handful of settings (Principle I). They are set once with
`railway environment edit` and recorded here instead:

| Setting | Value | Why |
|---|---|---|
| Builder | `DOCKERFILE`, `Dockerfile` | The repo's multi-stage build |
| Replicas | **1** | See below |
| App sleeping | off | Room state lives in this one process's memory; sleeping would drop active games |
| Healthcheck | `/healthz`, 60s timeout | Railway only switches traffic to a deploy that answers it |
| Restart policy | `ON_FAILURE`, 10 retries | |
| `CURATION_DATA_PATH` | `/data/curation.json` | Inside the volume, so the Curation Store survives deploys |
| `BUILD_CHANNEL` | `prod` | Build-time input for the version string (App Versioning) |
| `APP_VERSION` | set by `promote.yml` each release | Build-time input for the version string |

`PORT` is not set: Railway injects it, and the server reads it.
`E2E_SEAM_ENABLED` is not set either, so the test-only seam is off.

**Exactly one replica, always.** Room state is in one process's memory
(Principle VI: single source of state, no shared Socket.IO adapter).
With two replicas, requests would be load-balanced between them, so a room
created on one would 404 ("room-not-found") on a join that lands on the
other. That makes a second replica a correctness bug, not an HA upgrade.
Railway volumes also attach to a single replica, which enforces the same
limit from the storage side.

**Dockerfile: no BuildKit cache mounts.** Railway rejects a
`--mount=type=cache` whose `id` lacks its `s/<service-id>-` prefix, and
adding that prefix would tie the Dockerfile to one Railway service. The
pnpm installs run uncached instead; the dependency tree is small.

### Release Promotion

Cutting production is a `workflow_dispatch` in
`.github/workflows/promote.yml` that fast-forwards `release` from `main`
**and then deploys prod in the same run**.

Re-dispatching when `release` is already current is harmless: the push is
a no-op and the deploy re-ships the same tree.

**The workflow deploys directly; it does not rely on its own push to
trigger a deploy.** A push authenticated with the default `GITHUB_TOKEN`
does not trigger further workflow runs (GitHub's recursion guard), so a
promote workflow that only pushed would report success while deploying
nothing. Promotion does both halves itself: it fast-forwards `release`,
sets `APP_VERSION` on the service, runs `railway up --ci --service web`
with `RAILWAY_TOKEN`, and then polls `railway deployment list` until the
deployment reports `SUCCESS`. The run fails if the deployment ends
`FAILED`/`CRASHED`, or isn't live within 5 minutes. `up --ci` returns
once the build finishes, before the healthcheck has passed, so its exit
code alone doesn't show that prod is up.

**Promotion is therefore the ONLY path that deploys production.** A
manual `git push origin main:release` fast-forwards the branch and
deploys nothing. That means `release` moving is not by itself evidence
that prod was deployed. The dispatch run is.

**Fast-forward only, never a merge.** The push is a plain non-force push
of `main` into `release`. If it is rejected as non-fast-forward, `release`
has diverged from `main`, and the workflow fails loudly rather than
merging, forcing a human to find out how `release` got a commit `main`
doesn't have. A merge would push a tree to production that never passed
`checks` on `main`, and that assumption is what lets `release` skip them.

Dispatch is manual (a human decides when to cut), and the run record is
the audit trail.

### End-to-End Test Gate (Cross-Browser) — suspended

A **Playwright** suite exercises the main game flow (lobby → write/draw
turns → reveal) across **Chromium, Firefox, WebKit, and the `msedge`
Chromium channel**. Playwright is a devDependency plus browser binaries:
maintainer tooling, not app runtime ([[constitution]] Project Scope).

**What it was.** On Fly, every code push to `main` deployed beta, the
suite then ran against the live `beta-ex-tel.ty-pe.com` in a per-engine
CI matrix, and the result was recorded as the `e2e/cross-browser` commit
status on the deployed sha. `promote.yml` refused to promote a commit
without a green status.

**What it is now.** With no beta channel there is nothing deployed to
test before prod, so the CI jobs (`changes`, `deploy-beta`, `e2e`,
`e2e-result`) and the promote precondition were removed. **Production
releases currently go out with no automated cross-browser check.** The
suite itself is unchanged and runs by hand: `pnpm run e2e` builds the app
and starts a local server when `E2E_BASE_URL` is unset
(`playwright.config.ts`). The test-only app seam (`E2E_SEAM_ENABLED` plus
the `E2E_TEST_SIGNAL_SECRET` header) is kept in the server for that
local use, and stays off in prod.

**Restoring it** means adding a `beta` environment to the Railway
project (its own volume, `E2E_SEAM_ENABLED=true`, the signal secret as a
variable), deploying it from `ci.yml` on code pushes, and bringing back
the e2e and commit-status jobs and the gate in `promote.yml` from the
git history before this change.

### App Versioning

The app carries its own **semantic version**, distinct from the ArDD
tooling badge in the README. The single source of truth is the root
`package.json` `version` field. It exists so a player's feedback can name
the release they hit (see [[ui]] Salon Footer).

**Injected at build time, never at runtime.** A Vite `define` bakes a
version string into the client bundle (no runtime endpoint, Principle I).
It is assembled from three build inputs declared as `ARG`s in the
Dockerfile and read by the client build: `APP_VERSION`, `BUILD_CHANNEL`,
`BUILD_SHA`. Railway passes a service variable to the Dockerfile `ARG`
of the same name, so `BUILD_CHANNEL=prod` is a standing variable and
`promote.yml` sets `APP_VERSION` just before each deploy.

- **Prod** shows a clean `vX.Y.Z`, the promoted release. No sha is
  needed; the tag is the referent.
- A build with no inputs (a plain local `docker build`) falls back to
  the root `package.json` version with channel `dev`.
- The beta form, `vX.Y.Z-beta+<short-sha>`, is still supported by the
  client build for when a beta channel returns.

**Auto-bump on promotion.** `promote.yml` takes a bump-level dispatch
input (`patch` | `minor` | `major`). On promotion it bumps `package.json`
via `npm version <level> --no-git-tag-version`, commits the bump to
`main` (`chore(release): vX.Y.Z`) and pushes it with the built-in
`GITHUB_TOKEN` (whose push does not re-trigger workflows), **then**
fast-forwards `release` from `main`, tags the release commit `vX.Y.Z`,
creates the GitHub release, and deploys prod. The bump lands on `main` as
the new source of truth and reaches `release` by the existing
fast-forward, so there's no new divergence path.

### One-time setup

Run once by hand on 2026-11-26, and recorded so they can be repeated
(for example, for a future beta environment):

```
railway init --name exquisite-telephone
railway add --service web
railway volume add --mount-path /data
railway variable set CURATION_DATA_PATH=/data/curation.json BUILD_CHANNEL=prod --service web --skip-deploys
railway environment edit --json   # builder, healthcheck, sleep off, 1 replica in us-east4 (table above)
railway domain ex-tel.ty-pe.com --service web   # then the CNAME/TXT records in Namecheap
```

**Pending (cutover, 2026-11-26):** the two CI secrets below and the DNS
swap. Update this paragraph once they're done.

Two pieces need the dashboard or a human:

- **`RAILWAY_TOKEN`**: Project Settings → Tokens, scoped to
  `production`. A CLI login session can't create project tokens.
- **`RAILWAY_SSH_KEY`**: a dedicated, passphrase-less ed25519 key whose
  public half is registered on the Railway account (`railway ssh keys
  add`). `railway ssh`, which the weekly curation aggregate uses,
  authenticates the shell with a registered SSH key, not with the API
  token.

**Data migration — done 2026-11-26.** Fly's prod volume held only an
empty snapshot (`curation-snapshot.json` and its `.summary.txt`, from the
2026-11-01 aggregate run): no rating events had ever been recorded. Both
files were copied to `/data` on Railway and the checksum verified. Beta's
volume was empty as well, so dropping it lost nothing. If ratings land
on Fly before DNS moves, top up with a no-overwrite copy of
`curation-events/` (event files are uniquely named, so the copies merge
by union) and restart, since the server seeds its event count at boot.

## Production Annotations

- **Single server process, no horizontal scaling**: All room state lives
  in one process's memory — in production expecting concurrent load
  beyond a single instance, this would need shared state (e.g. Redis
  adapter for Socket.IO) and a real session store with TTL eviction.
- **No durable persistence**: A server crash or deploy loses all
  in-progress and completed-but-unsaved games — in production, finished
  books worth preserving would be written to a real datastore before
  the room is torn down.
- **No zero-downtime deploys**: A deploy restarts the single
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
  curation is full — it fails safely, logging once). The remedy is the
  **Aggregation Pipe** (see Curation Store above): it archives folded events
  out of the live directory, which resets the count so the store accepts new
  ratings again — draining the cap without deleting evidence. The drop
  behavior and its inline `PRODUCTION ANNOTATION` comment remain the
  fallback for the window between pipe runs (and if the pipe is never run);
  the cap has never been approached in practice (one human, every few weeks).
- **Curation ingestion is recommend-only (human-in-the-loop)**: the ingestion
  skill (see Curation Store — Ingestion Skill) never writes the deck or issues
  a mutating `railway` command; it emits recommendations a human applies. This is
  the deliberate safety boundary for feeding untrusted player text to an LLM —
  a successful prompt-injection degrades to a rejected recommendation, never a
  compromised deck. In production with higher volume or an automated apply
  path, this would need a stronger provenance/authorization story before any
  recommendation could land unattended.
