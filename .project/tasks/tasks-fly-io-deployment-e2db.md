---
plan: plan-fly-io-deployment-2026-07-13-20ad.md
generated: 2026-07-13
status: ready
---

# Tasks

## Phase 1: Server serves the client's static build
- [ ] T001 [artifacts: infrastructure] [feature: fly-io-deployment] Write a failing test asserting the server responds to a static asset request (e.g. `GET /` returns the client's `index.html`) when a static root directory is configured, then implement static-file serving in the server (e.g. `serve-static` or Node's built-in static-serving via a minimal middleware) wired in `server/src/index.ts` per Principle X (entry point only wires dependencies — the static-serving logic itself lives in its own module, not inlined).
- [ ] T002 [artifacts: infrastructure] [feature: fly-io-deployment] Update `server/src/config.ts` to read the static root directory path from an environment variable (e.g. `CLIENT_DIST_PATH`) with a sensible default relative path, test-first for the default-vs-override resolution logic.

## Phase 2: Docker image
- [ ] T003 [artifacts: infrastructure] [feature: fly-io-deployment] Write a multi-stage `Dockerfile`: a build stage that installs dependencies with pnpm and runs `pnpm run build` (building `shared`, `server`, `client` per the existing root script), then a slim runtime stage copying only the compiled `server/dist`, `shared/dist`, `client/dist`, and production `node_modules` needed to run the server.
- [ ] T004 [artifacts: infrastructure] [parallel] Add a `.dockerignore` excluding `node_modules`, test files, and `.project/`/`.claude/` from the Docker build context.
- [ ] T005 Verify the image builds and runs locally: `docker build` then `docker run` the image, confirm the server starts, serves the client's `index.html` at `/`, and a Socket.IO connection succeeds against it (manual verification task — no unit test applies to a container build; the verification steps and expected output are the task's acceptance criteria).

## Phase 3: Fly app configuration and deploy
- [ ] T006 [artifacts: infrastructure] [feature: fly-io-deployment] Write `fly.toml`: single app, single process group, internal port matching the server's `PORT` config, and a health check hitting a lightweight endpoint (add a minimal `GET /healthz` route returning 200 if none exists yet — test-first for the route itself).
- [ ] T007 [feature: fly-io-deployment] Run `fly launch`/`fly deploy` (or equivalent) against a real Fly app and verify end-to-end: the deployed URL serves the client, a room can be created and joined from two browser sessions, and Socket.IO reconnect works across a network blip — this is the plan's demonstrable increment, not a unit test. Record the app name/URL for the user's reference. This task requires an authenticated Fly.io account/CLI session and is likely to need direct user involvement (login, org/app selection, billing) — stop and surface this as a blocker rather than guessing at account specifics if the environment has no Fly credentials available.
