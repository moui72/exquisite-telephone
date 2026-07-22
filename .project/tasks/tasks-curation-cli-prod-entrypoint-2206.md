---
plan: plan-curation-cli-prod-entrypoint-2026-07-22-bc34.md
generated: 2026-07-22
status: ready
---

# Tasks

The behavior-bearing change is a guard test (Phase 2, Principle III applies);
the rest is workflow/doc changes validated structurally (YAML parses; the
compiled entrypoint runs from `server/dist`).

## Phase 1: Point machine-side callers at the compiled CLI

- [ ] T001 [artifacts: infrastructure] Change
  `.github/workflows/curation-aggregate.yml`'s aggregate step to run the
  compiled entrypoint on the machine — `fly ssh console -C 'node
  server/dist/curation/cli.js'` (working dir `/app`) — instead of `pnpm
  --filter server curation:aggregate` (which is `tsx src/curation/cli.ts`, not
  present in the slim runtime image). Keep the per-channel jobs and the
  post-aggregate `fly apps restart`. Validate the workflow YAML parses.
  (feedback F001)
- [ ] T002 [artifacts: infrastructure] Revise `infrastructure.md` Aggregation
  Pipe: state that the **prod / on-machine** run is the compiled `node
  server/dist/curation/cli.js` (emitted by the server `tsc` build — which
  excludes only tests — and copied into the slim runtime image), while `pnpm
  --filter server curation:aggregate` (`tsx`) is the **dev/local** form. Note
  that the `tsx` path does not exist on the deployed machine (no `src/`, no
  `tsx`). (feedback F001)
- [ ] T003 Update the `curation-review` SKILL.md where it references running the
  aggregation pipe: the on-machine/prod command is `node
  server/dist/curation/cli.js` (via `fly ssh console -C`), dev stays `pnpm
  --filter server curation:aggregate`. Keep the no-mutating-`fly` boundary
  (this is a read op on the machine; the aggregate itself is the separate,
  deliberate pipe step, not part of the review). (feedback F001; file
  `.claude/skills/curation-review/SKILL.md`)

## Phase 2: Guard against silent regression

- [ ] T004 Add a guard so a future `tsconfig`/Dockerfile change that stops
  emitting or shipping the compiled CLI fails loudly rather than breaking the
  next scheduled prod aggregate. Preferred: a server test (run after build, or
  that builds) asserting `server/dist/curation/cli.js` exists and is
  node-loadable; alternatively a `curation:aggregate:dist` script (`node
  dist/curation/cli.js`) plus a check that the Dockerfile copies
  `server/dist`. Under TDD, write the assertion first and confirm it would fail
  if the compiled entrypoint were absent, then ensure it passes against the
  current build.
