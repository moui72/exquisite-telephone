---
status: approved
branch: fly-io-deployment
created: 2026-07-13
features: [fly-io-deployment]
surfaced-defects: []
---

# Plan: Fly.io Deployment

## Goal

Make Exquisite Telephone deployable as a single Fly.io app: one
container running the Node/Socket.IO server, which also serves the
built Svelte client's static assets.

## Scope

**In scope:** extending the server to serve the client's static build,
a multi-stage Dockerfile, a `fly.toml` app config, and a manual deploy
verified end-to-end against a real Fly app.

**Out of scope:** CI-triggered auto-deploy on push (per [[constitution]]
Principle I — no premature infrastructure; a manual `fly deploy` is
enough for v1), horizontal scaling / multi-region, and any durable
persistence (already out of scope per [[infrastructure]]).

## Technical Approach

The server (`server/src/index.ts`) currently only runs Socket.IO on a
bare `http.Server` — it does not yet serve the client's static build,
even though [[infrastructure]]'s Overview already describes that as the
target shape. This plan closes that gap first, then builds the
deployment path on top of it: a multi-stage Docker build produces a
runtime image containing the compiled server and the client's static
`dist/`, and a single `fly.toml` configures one Fly app/process reading
`PORT` from the environment (already supported by
`server/src/config.ts`), per [[infrastructure]]'s new Deployment
(Fly.io) section.

## Phase Breakdown

### Phase 1: Server serves the client's static build
- [ ] T001 [artifacts: infrastructure] [feature: fly-io-deployment]
  Write a failing test asserting the server responds to a static asset
  request (e.g. `GET /` returns the client's `index.html`) when a
  static root directory is configured, then implement static-file
  serving in the server (e.g. `serve-static` or Node's built-in
  static-serving via a minimal middleware) wired in `server/src/index.ts`
  per Principle X (entry point only wires dependencies — the static-
  serving logic itself lives in its own module, not inlined).
- [ ] T002 [artifacts: infrastructure] [feature: fly-io-deployment]
  Update `server/src/config.ts` to read the static root directory path
  from an environment variable (e.g. `CLIENT_DIST_PATH`) with a sensible
  default relative path, test-first for the default-vs-override
  resolution logic.

### Phase 2: Docker image
- [ ] T003 [artifacts: infrastructure] [feature: fly-io-deployment]
  Write a multi-stage `Dockerfile`: a build stage that installs
  dependencies with pnpm and runs `pnpm run build` (building
  `shared`, `server`, `client` per the existing root script), then a
  slim runtime stage copying only the compiled `server/dist`,
  `shared/dist`, `client/dist`, and production `node_modules` needed to
  run the server.
- [ ] T004 [artifacts: infrastructure] [parallel] Add a `.dockerignore`
  excluding `node_modules`, test files, and `.project/`/`.claude/` from
  the Docker build context.
- [ ] T005 Verify the image builds and runs locally: `docker build` then
  `docker run` the image, confirm the server starts, serves the
  client's `index.html` at `/`, and a Socket.IO connection succeeds
  against it (manual verification task — no unit test applies to a
  container build; the verification steps and expected output are the
  task's acceptance criteria).

### Phase 3: Fly app configuration and deploy
- [ ] T006 [artifacts: infrastructure] [feature: fly-io-deployment]
  Write `fly.toml`: single app, single process group, internal port
  matching the server's `PORT` config, and a health check hitting a
  lightweight endpoint (add a minimal `GET /healthz` route returning
  200 if none exists yet — test-first for the route itself).
- [ ] T007 [feature: fly-io-deployment] Run `fly launch`/`fly deploy`
  (or equivalent) against a real Fly app and verify end-to-end: the
  deployed URL serves the client, a room can be created and joined from
  two browser sessions, and Socket.IO reconnect works across a network
  blip — this is the plan's demonstrable increment, not a unit test.
  Record the app name/URL in the plan's Open Questions or a follow-up
  note for the user's reference (this task is manual/interactive with
  the user; surface blockers rather than guessing at Fly account
  specifics).

## Complexity Tracking

No deviations from the simplest viable approach are known at plan time
(per [[constitution]] Principle I). Choosing a single Fly app/process
over separate server+static-site apps was an explicit simplicity
decision made during this plan's artifact-design step, not a deviation
needing justification here.

## Open Questions

- Fly.io account/org and app name are not yet chosen — T007 will
  surface this interactively with the user rather than guessing.
- Whether to add a `fly deploy` CI step later (once this manual path is
  proven) is left for a future plan — out of scope here per Principle I.
