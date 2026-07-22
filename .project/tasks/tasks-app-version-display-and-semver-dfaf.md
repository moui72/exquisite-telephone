---
plan: plan-app-version-display-and-semver-2026-07-22-0c08.md
generated: 2026-07-22
status: in-progress
---

# Tasks

Constitution Principle III (Test-First): every code task is preceded by a test
written and confirmed failing (red) before implementation. Mark each red test
`it.fails` (Vitest) on its commit and remove the marker on the paired
implementation commit. Workflow/Dockerfile changes that can't be unit-tested
are validated structurally (YAML parses; the version-string logic they feed is
covered by the Phase-1 pure-function tests).

## Phase 1: Version string + build-time injection

- [x] T001 [artifacts: infrastructure] Write a failing test for a pure
  version-string composer (in `shared/` or `client`) taking `{ version,
  channel, sha }` and returning: `vX.Y.Z` for `channel==='prod'`;
  `vX.Y.Z-beta+<sha>` for `channel==='beta'`; `vX.Y.Z-dev` for
  `channel==='dev'` (or absent). Assert each form and that a missing sha on
  beta degrades gracefully. Confirm red.
- [x] T002 [artifacts: infrastructure] Implement the composer per T001. Make it
  pass.
- [x] T003 [artifacts: infrastructure] Add a Vite `define` in
  `client/vite.config.ts` that supplies `{ version, channel, sha }` from
  `process.env` (`APP_VERSION`, `BUILD_CHANNEL`, `BUILD_SHA`), defaulting
  `version` to the root `package.json` version and `channel` to `dev` when the
  env vars are absent, and exposes the composed string to the client as a build
  constant (e.g. `__APP_VERSION__`). Add a test asserting the constant is
  defined and non-empty in a client build/test context. (test-after acceptable
  here — the define is build config; keep the composer's logic in the
  T001-tested function.)
- [x] T004 [artifacts: infrastructure] Declare `ARG APP_VERSION`,
  `ARG BUILD_CHANNEL`, `ARG BUILD_SHA` in the Dockerfile and expose them (as
  env) to the client build step so Vite reads them. Verify the build still
  succeeds with and without the args set (args absent → dev fallback).

## Phase 2: Version display (footer + About tab)

- [x] T005 [artifacts: ui] Write a failing test that `SalonFooter.svelte`
  renders the app-version constant as small, muted, readable text (not a link
  or control) present on the footer. Confirm red.
- [x] T006 [artifacts: ui] Implement the footer version display per T005
  (unobtrusive placement, Space Mono). Make it pass.
- [x] T007 [artifacts: ui] Write a failing test that the help panel's About tab
  (`RulesOverview.svelte`) renders the app version **prominently** as labeled
  copy (e.g. "Version vX.Y.Z") beside the existing source link, using the same
  version constant. Confirm red.
- [x] T008 [artifacts: ui] Implement the About-tab version display per T007.
  Make it pass. (The About tab is already the shipped tabbed structure; add the
  version, don't rebuild the tabs.)

## Phase 3: Beta build-arg wiring (ci.yml)

- [x] T009 [artifacts: infrastructure] Update `ci.yml`'s `deploy-beta` job to
  pass `--build-arg APP_VERSION=<root package.json version> --build-arg
  BUILD_CHANNEL=beta --build-arg BUILD_SHA=<short sha of the pushed commit>` to
  `flyctl deploy`. Validate the workflow YAML parses; confirm (by the Phase-1
  composer test) that these inputs produce `vX.Y.Z-beta+<sha>`. Keep the
  existing code-change deploy gate (`needs: [checks, changes]`) intact.

## Phase 4: Prod auto-bump, tag, release (promote.yml)

- [ ] T010 [artifacts: infrastructure] Add a `workflow_dispatch` input to
  `promote.yml` — `bump` (choice: `patch` | `minor` | `major`). Before the
  existing fast-forward, run `npm version <bump> --no-git-tag-version` on
  `main`, commit `chore(release): vX.Y.Z`, and push to `main` with the built-in
  `GITHUB_TOKEN` (which does not re-trigger workflows). Validate the workflow
  YAML parses.
- [ ] T011 [artifacts: infrastructure] After the fast-forward of `release`,
  have `promote.yml` create an annotated tag `vX.Y.Z` on the release commit and
  a GitHub release, and pass `--build-arg APP_VERSION=<bumped version>
  --build-arg BUILD_CHANNEL=prod` to the prod `flyctl deploy`. Validate the
  workflow YAML parses and the deploy step references the bumped version.
