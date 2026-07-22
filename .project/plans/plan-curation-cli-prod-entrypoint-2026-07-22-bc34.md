---
status: approved
branch: curation-cli-prod-entrypoint
created: 2026-07-22
features: []
surfaced-defects: []
---

# Plan — curation aggregate CLI runs in the prod image

## Goal

Make the scheduled and on-machine curation aggregation actually run in
production by invoking the compiled CLI (`node server/dist/curation/cli.js`)
that already ships in the slim image, instead of the `tsx` source command that
isn't present there.

## Scope

Consumes `feedback-curation-cli-slim-image-996e.md` (F001).

**In scope.**
- Change the **on-machine invocation** of the aggregation pipe from
  `pnpm --filter server curation:aggregate` (which is `tsx src/curation/cli.ts`)
  to `node server/dist/curation/cli.js` — the compiled entrypoint the server
  `tsc` build already emits and the slim runtime image already copies.
- Update the scheduled workflow (`curation-aggregate.yml`), and the SKILL and
  `infrastructure.md` docs, to name the compiled entrypoint for the prod/machine
  path while keeping the `tsx`/pnpm form for local dev.
- Verify the compiled CLI runs from the runtime image's layout (`server/dist`
  present, `@exquisite-telephone/shared` resolvable), not just via `tsx`.

**Not in scope.**
- **Any change to the pipe/skill behavior** — the compiled `cli.js` is byte-for-
  byte the same logic; only how it's launched changes.
- **Bloating the runtime image with `tsx`/source** — deliberately avoided; the
  compiled artifact is already there, which is the whole point.
- **Regenerating the stale diagrams** — a follow-up `/ardd-diagram` pass.

## Technical Approach

The root cause and the fix are both small. The server build
(`tsc -p tsconfig.build.json`) excludes only `*.test.ts`, so it already emits
`server/dist/curation/{cli,pipe,ledger}.js`; the Dockerfile runtime stage
copies `server/dist` and the `@exquisite-telephone/shared` symlink resolves, so
`node server/dist/curation/cli.js` runs in the deployed image with no new build
or image change. The only defect was the *invocation*: `pnpm --filter server
curation:aggregate` runs `tsx src/curation/cli.ts`, and neither `tsx` nor
`src/` exists in the slim image.

So the fix points the machine-side callers at the compiled entrypoint:
`fly ssh console -C 'node server/dist/curation/cli.js'` in the workflow, and the
same in the docs' prod path. The dev/local path keeps `pnpm --filter server
curation:aggregate` (tsx) since dev has the source. A guard is added so a future
build/config change that stops emitting the compiled CLI is caught rather than
silently re-breaking prod.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in
the linked tasks file. Phases are ordered.

### Phase 1 — Point the machine-side callers at the compiled CLI

- Change `.github/workflows/curation-aggregate.yml` to run `node
  server/dist/curation/cli.js` on the machine (via `fly ssh console -C`),
  instead of `pnpm --filter server curation:aggregate` — feedback F001.
- Revise `infrastructure.md` Aggregation Pipe: the prod/on-machine run is the
  compiled `node server/dist/curation/cli.js` (already in the slim image via the
  server build); `tsx`/`pnpm curation:aggregate` is dev-only. Note the earlier
  slim-image gap this corrects — feedback F001 `[artifacts: infrastructure]`.
- Update the `curation-review` SKILL.md's "run the aggregation pipe" reference
  to the compiled entrypoint for the machine, keeping the dev form — feedback
  F001.

### Phase 2 — Guard against silent regression

- Add a lightweight guard that the compiled CLI entrypoint exists/runs after a
  build (e.g. a server test or a `curation:aggregate:dist` script asserting
  `server/dist/curation/cli.js` is present and node-executable), so a future
  `tsconfig`/Dockerfile change that drops it fails loudly instead of breaking
  the next scheduled prod run.

## Open Questions

- **How to verify against the real image without a live `fly` run** — build the
  runtime Docker stage locally and exec the compiled CLI, or accept a
  structural check (the artifact is copied + node-runs from `server/dist`). A
  Phase-1 decision; a local image build is the stronger proof.
