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

0 defects — see `.project/DEFECTS.md`, last checked 2026-07-13. All 4
defects from the earlier pass today are resolved: late-join rejection is
now implemented and tested, the never-built Loading state was dropped from
`ui.md`, `server/src/index.ts` now explicitly constructs `sessionStore`/
`logger` (closing the Principle X drift), and the stale `drawing` value was
removed from `Room.status`'s documented enum.

## Feature Backlog

1 backlogged · 0 planned · 0 tasked · 1 implemented — see
`.project/features/`. Target the backlogged one with
`/ardd-plan asynchronous-play-turn-timer`.

- `fly-io-deployment` (implemented) — deployed at
  https://exquisite-telephone.fly.dev/. Plan:
  `plan-fly-io-deployment-2026-07-13-20ad.md`. Tasks:
  `tasks-fly-io-deployment-e2db.md` (completed, 7/7).
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

_(none)_

## fly-io-deployment: shipped

Deployed and live at **https://exquisite-telephone.fly.dev/**
(Fly org `personal`, app `exquisite-telephone`). `tasks-fly-io-deployment-e2db.md`
completed 7/7; feature flipped to `implemented`.

Verified end-to-end against the real deployment (not just locally):
`GET /` serves the client (200), `GET /healthz` returns `ok`, and real
`socket.io-client` connections confirmed room create + join +
`roomUpdated` broadcast across two clients, plus rejoin-after-disconnect
via session token.

**Bug found and fixed during verification**: a fresh Fly app's first
deploy provisions 2 machines by default (for HA), but this app's
in-memory room state has no cross-process adapter (Principle VI) — a
room created on one machine 404'd when a join landed on the other.
Fixed with `fly scale count 1`; `fly.toml` now documents this so a
future fresh-app deploy doesn't silently reintroduce it.

Design note worth a glance: `fly.toml` sets `auto_stop_machines = "off"`
/ `min_machines_running = 1` (always-on) rather than scale-to-zero,
since in-memory room state would be lost if the machine suspended
mid-game — reasonable given [[infrastructure]], but a cost/tradeoff
decision not explicitly specified in the artifact.

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

Repo is public on GitHub: https://github.com/moui72/exquisite-telephone
(`origin`, `main` tracked). CI runs on push/PR there.

## Summary

All 4 defects from today's `/ardd-defects` pass are resolved and verified
by a fresh re-check: 0 open. No cross-artifact conflicts or constitution
violations. Safe to /plan: yes.

## Recommended Next Step

`/ardd-backlog` for the two gaps noted during v1 implementation (end-game
UI control, start/end-game observability logging), then `/ardd-plan
asynchronous-play-turn-timer` when ready to design that feature.
`/ardd-diagram` on datamodel, infrastructure, and ui would also give this
stable design a visual reference.
