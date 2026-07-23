---
plan: plan-cross-browser-e2e-game-flow-te-2026-07-23-cbcb.md
generated: 2026-07-23
status: in-progress
---

# Tasks

## Phase 1: Toolchain & harness foundation

- [x] T001 Add Playwright as a dev-only toolchain: add `@playwright/test` as
  a devDependency, add a `playwright.config.ts` at repo root with
  `fullyParallel: true` and a four-project matrix (chromium, firefox, webkit,
  and a chromium project with `channel: 'msedge'`), and add root package
  scripts (`e2e`, `e2e:install`). Point `use.baseURL` at an env var
  (`E2E_BASE_URL`) defaulting to a local dev server so the same config runs
  locally and against beta. No app/src changes in this task.

- [x] T002 [parallel] Build the Node `socket.io-client` observer helper
  (`e2e/helpers/observer.ts`): given a room code, it joins the room as an
  extra player over Socket.IO, subscribes to `roomUpdated`/broadcast events,
  and exposes typed accessors for the latest room state and each entry's
  parsed `DrawOps`. Reuse the production stroke-data parser from `shared`
  (do not re-implement parsing). Include a unit test that drives it against
  a locally-started server and asserts it observes a known submitted entry.
  [artifacts: datamodel, infrastructure]

- [x] T003 [parallel] Build the base fixture and page objects for the three
  flow surfaces (`e2e/pages/lobby.ts`, `writingDrawing.ts`, `reveal.ts`) and
  a `game` fixture that creates a room and joins N players (one browser
  context each). Drive existing selectors where present; where a stable
  selector is missing, add a `data-testid` to the corresponding Svelte
  component (`client/src/...`) and use it. This task may touch client markup
  only to add test ids. [artifacts: ui]

## Phase 2: Test-only app seams

- [x] T004 Add a test-traffic tag and server-side routing so prompt-ratings
  from test traffic never reach beta's real Curation Store. Decide and
  document the tagging mechanism (test-only request header vs. a room-level
  flag — this resolves the curation `[OPEN]` in infrastructure.md), and route
  tagged ratings to a scratch/discarded curation path instead of
  `CURATION_DATA_PATH`. The seam must be inert for untagged (real) traffic
  and un-triggerable without the test signal (e.g. a shared secret the CI job
  holds). Write a server unit test proving a tagged rating does not write to
  the configured curation dir and an untagged one does. [artifacts:
  infrastructure, datamodel]

- [x] T005 Add a test-only turn-timer seam so long-timer lobby combos can be
  exercised below the 15-minute production floor. Gate it behind the same
  test-only signal as T004 (inert and un-triggerable in normal runtime).
  Write a server unit test that the seam shortens the effective deadline only
  when the test signal is present and is a no-op otherwise. [artifacts:
  infrastructure]

- [x] T006 Thread any per-channel config the T004/T005 seams require (e.g. a
  beta-only test-signal secret or scratch path) through the generated
  fly-config template and its per-channel allowlist — never by hand-editing a
  generated `fly.toml`/`fly.staging.toml`. Confirm the config-lockstep CI
  check still passes against the regenerated output. [artifacts:
  infrastructure]

## Phase 3: Core flow & drawing specs

- [x] T007 Write the core multiplayer flow spec (`e2e/flow.spec.ts`): N
  players (one browser context each) complete lobby → write/draw turns →
  reveal end to end, asserting the server's `Room.status` transitions and
  that every book completed its laps. Each test mints its own unique room so
  the spec is parallel-safe. Uses the Phase 1 fixtures and observer helper.
  [artifacts: datamodel]

- [x] T008 [parallel] Write the deterministic drawing spec
  (`e2e/drawing.spec.ts`): drive intentional strokes on the drawing canvas
  via pointer actions (fixed endpoints/color/width), submit the turn, then
  assert the exact submitted `DrawOps` via the observer helper — not a pixel
  comparison. [artifacts: datamodel]

- [x] T009 [parallel] Write the flagship four-engine "summit" spec
  (`e2e/summit.spec.ts`): a single test launches one context per engine
  (chromium, firefox, webkit, msedge), each hosting one player, and runs the
  full flow through to reveal. Kept as one heavy flagship case, distinct from
  the per-project matrix.

## Phase 4: Parametrized settings matrix

- [x] T010 Define a typed, curated lobby-settings matrix
  (`e2e/settings-matrix.ts`) — a small set of named combos across turn timer
  (via the T005 seam), laps per book, monochrome, min-player override, and
  curated vs. free-form prompt mode — and run the core flow spec across each
  named combo. Not the full combinatorial cross product; justify each combo's
  inclusion in a comment. [artifacts: datamodel]

## Phase 5: Beta-deploy run & promote-gate wiring

- [x] T011 Add a GitHub Actions job that runs after a successful beta deploy,
  gated by the existing code-change `changes` signal in `ci.yml` (so a
  docs/chore push that skips the beta deploy runs no e2e), installs Playwright
  browsers, and runs the suite sharded (`--shard=i/n`) against
  `E2E_BASE_URL=https://beta-ex-tel.ty-pe.com`, supplying the test-signal
  secret the T004/T005 seams require. [artifacts: infrastructure]

- [ ] T012 Record the run's aggregate pass/fail keyed to the deployed commit
  sha — decide storage (a GitHub commit status/check on the sha vs. a stored
  artifact; this resolves the per-sha-result `[OPEN]` in infrastructure.md).
  As a cross-check, assert the `vX.Y.Z-beta+<short-sha>` the live beta bundle
  reports matches the sha the job is testing, failing the job on mismatch.
  [artifacts: infrastructure]

- [ ] T013 Change `promote.yml` to look up the recorded e2e result for the
  commit being promoted and refuse to promote on a red-or-missing result
  (decide block vs. allow-with-warning for the missing case, per the
  infrastructure `[OPEN]`). Leave the per-push `checks` gate untouched.
  Document the new promote precondition in the workflow. [artifacts:
  infrastructure]
