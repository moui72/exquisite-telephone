# Exquisite Telephone — Project Status

_Updated: 2026-07-14. Keep this current as artifacts are refined and open questions are resolved._

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

1 backlogged · 0 planned · 0 tasked · 0 implemented — see
`.project/features/`. Target with `/ardd-plan fly-io-deployment`.

- `fly-io-deployment` (backlogged) — Dockerfile + fly.toml so the
  Node/Socket.IO server (serving the built Svelte client) can be built
  and run as a Fly app; chosen for v1 hosting since Fly supports
  long-lived WebSocket connections and persistent processes.

Two more gaps surfaced during implementation are candidates for
`/ardd-backlog`: a host-facing "end game" control (server support exists
via `onEndGame`, no UI wired to it yet), and observability logging for
the start-game/end-game transitions (currently unlogged; Principle IX
covers room creation/join/leave/reconnect/turn-advance/completion only).

## In Flight

_(none — plan-main-2026-07-13-4bd4.md's only tasks file, tasks-main-a0d8.md,
merged to `main` and its worktree was reaped)_

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

Run `/ardd-plan fly-io-deployment` to design and task the Fly.io
deployment feature. Separately: `/ardd-defects` to formally log the
`Room.status` drawing-phase mismatch, then `/ardd-backlog` for the
end-game-control and start/end-game-logging gaps. `/ardd-diagram` on
datamodel, infrastructure, and ui would also give this stable v1 design
a visual reference.
