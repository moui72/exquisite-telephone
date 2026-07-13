# Exquisite Telephone — Project Status

_Updated: 2026-07-13. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

## Open Questions

_(none)_

## Diagrams

- datamodel.md — unrendered ⚠️ (never generated — run `/ardd-diagram datamodel`)
- infrastructure.md — unrendered ⚠️ (never generated — run `/ardd-diagram infrastructure`)
- ui.md — unrendered ⚠️ (never generated — run `/ardd-diagram ui`)

## Code-vs-Artifact Defects

Never formally checked — run `/ardd-defects` for a full pass. The
v1 implementation run already surfaced one known mismatch worth logging:
`Room.status` (datamodel.md) lists `drawing` as a room-wide phase, but the
server only ever transitions `writing` → `reveal`/`ended` — each
player's current entry type (text vs. drawing) is computed per-book/
per-player instead, since players work on different books
asynchronously. The client handles both statuses identically, so this
isn't a functional bug, just an artifact/code naming mismatch.

## Feature Backlog

1 backlogged · 0 planned · 1 tasked · 0 implemented — see
`.project/features/`. Target the backlogged one with
`/ardd-plan asynchronous-play-turn-timer`.

- `fly-io-deployment` (tasked) — Dockerfile + fly.toml so the
  Node/Socket.IO server (serving the built Svelte client) can be built
  and run as a Fly app. Plan: `plan-fly-io-deployment-2026-07-13-20ad.md`.
  Tasks: `tasks-fly-io-deployment-e2db.md` (in-progress, 6/7 — blocked
  on T007, see In Flight below).
- `asynchronous-play-turn-timer` (backlogged) — host-configurable
  per-turn timer (15m/30m/1hr/4hr/12hr); round advances once everyone
  submits or all remaining timers expire. Lets groups play across time
  zones/schedules instead of requiring a fully synchronous session.

Two more gaps surfaced during implementation are candidates for
`/ardd-backlog`: a host-facing "end game" control (server support exists
via `onEndGame`, no UI wired to it yet), and observability logging for
the start-game/end-game transitions (currently unlogged; Principle IX
covers room creation/join/leave/reconnect/turn-advance/completion only).

## In Flight

_(none — the fly-io-deployment worktree branch merged to `main` and was
reaped; the tasks file remains `in-progress` on `main` itself, blocked
on T007, not on any unmerged branch)_

## Blocked: fly-io-deployment T007

`tasks-fly-io-deployment-e2db.md` is `in-progress`, 6/7 complete. T001–T006
are done and merged to `main` (server now serves the client's static
build with a `/healthz` route, multi-stage `Dockerfile`, `.dockerignore`,
`fly.toml`) — verified independently on `main`: 83/83 tests pass (12
shared + 36 server + 35 client), lint/typecheck clean, and the Docker
image was rebuilt and run locally here too (`GET /` → 200 serving
`index.html`, `/healthz` → `ok`, unknown paths → 404).

**T007 needs you directly**: the `fly`/`flyctl` CLI isn't available in
this environment. To finish: install the Fly CLI, run `fly auth login`,
then `fly launch` (a new app — `fly.toml` currently has a placeholder
`app = "exquisite-telephone"` name you may need to change if taken) or
`fly deploy` against an existing app, then verify the deployed URL
end-to-end (create/join a room from two browsers, test reconnect across
a network blip). Once confirmed, the tasks file needs T007 checked and
flipped to `completed`, and the `fly-io-deployment` feature flipped to
`implemented` — ask for this once the deploy is confirmed, or run
`/ardd-implement --reconcile tasks-fly-io-deployment-e2db.md` after
doing it yourself.

One design note from the implementer worth a glance: `fly.toml` sets
`auto_stop_machines = "off"` / `min_machines_running = 1` (always-on)
rather than scale-to-zero, since in-memory room state would be lost if
the machine suspended mid-game — reasonable given [[infrastructure]],
but a cost/tradeoff decision not explicitly specified in the artifact.

## v1 Implementation Status

`tasks-main-a0d8.md` — **completed**, 19/19 tasks, merged to `main`
(commit range `f24f557..ff86fbe`, fast-forwarded). Verified on `main`:
76/76 tests passing (12 shared + 29 server + 35 client), lint clean,
typecheck clean (0 errors across 205 files), production build succeeds.
A full Node/TypeScript + Socket.IO server and Svelte + Tailwind client
now implement the complete v1 game loop: room create/join, lobby,
round-robin write/draw turn loop, reconnect-tolerant sessions, reveal
view, and client-side PNG export.

Package manager converted from npm to pnpm (`pnpm-workspace.yaml`,
`workspace:*` internal deps, CI and pre-commit hook updated) — verified
lint/typecheck/76 tests/build all pass under pnpm.

## Recommended Next Step

Install the Fly CLI and complete T007 yourself (see Blocked section
above) to finish `fly-io-deployment`. Separately: `/ardd-defects` to
formally log the `Room.status` drawing-phase mismatch, then
`/ardd-backlog` for the end-game-control and start/end-game-logging
gaps. `/ardd-diagram` on datamodel, infrastructure, and ui would also
give this stable v1 design a visual reference.
