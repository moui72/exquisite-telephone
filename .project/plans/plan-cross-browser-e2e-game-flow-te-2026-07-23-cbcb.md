---
status: approved
branch: cross-browser-e2e-game-flow-te
created: 2026-07-23
features: [cross-browser-e2e-game-flow-te]
surfaced-defects: []
---

# Plan: Cross-Browser E2E Game-Flow Test Gate

## Goal

Stand up a Playwright end-to-end suite that exercises the main game flow
(lobby → write/draw → reveal) across Chromium, Firefox, WebKit, and the
`msedge` channel, run as a shardable job after each code-change beta deploy,
recording a per-commit result that `promote.yml` reads to gate production.

## Scope

**In scope**

- Playwright installed as a dev-only toolchain (devDependency + browser
  binaries), with a `playwright.config` set `fullyParallel` and a
  four-target project matrix.
- A page-object / fixture layer that drives the existing UI (Lobby →
  WritingDrawing → Reveal) using stable selectors, adding `data-testid`s
  where a stable selector is missing.
- A Node `socket.io-client` observer helper that joins a room as an extra
  player and reads broadcast state, used to assert submitted `DrawOps`
  vector data directly.
- The core multiplayer flow spec (N players, one browser context each),
  plus one flagship four-engine "summit" spec (one player per engine).
- A typed, curated lobby-settings matrix parametrizing the flow spec
  across turn-timer / laps / monochrome / min-player-override / prompt-mode
  combinations.
- A deterministic drawing spec that draws intentional strokes and asserts
  the exact resulting `DrawOps`.
- A test-only app seam that (a) isolates curation writes from test traffic
  on live beta and (b) allows a shortened turn-timer for long-timer combos.
- A GitHub Actions job that runs the sharded suite against live beta after
  each beta deploy (gated by the existing code-change `changes` signal, so
  docs/chore pushes run nothing) and records pass/fail keyed to the deployed
  commit sha.
- A change to `promote.yml` that reads the recorded e2e result for the exact
  commit being promoted and refuses to promote on a red-or-missing result.

**Out of scope**

- Real Apple Safari / specific Edge-build certification (WebKit and
  Chromium engines only — stated in [[infrastructure]]).
- Visual/pixel snapshot testing as a primary assertion (at most one loose
  smoke check).
- Load/performance testing, or any change to the per-push `checks` gate.
- Running the e2e suite in the pre-commit hook or the per-push CI job.

## Technical Approach

Grounded in [[infrastructure]] End-to-End Test Gate (Cross-Browser) and the
research at `.project/plans/research-cross-browser-e2e-game-flow-te.md`.

- **Isolation is per-room, so parallelism is free.** The authoritative
  in-memory room store scopes every broadcast per room ([[infrastructure]]
  Realtime Sync; [[datamodel]]). Each test mints its own room, so tests are
  independent against one shared server — `fullyParallel` locally and
  `--shard=i/n`-safe for arbitrary N in CI. Each player is a distinct
  browser **context** (a shared context's `localStorage` session token
  would collide).
- **Assert the data model, not pixels.** Because drawings are pure
  `DrawOps` vectors broadcast by the server ([[datamodel]]; Export Pipeline
  in [[infrastructure]]), a Node `socket.io-client` observer parses the
  exact submitted ops with the production parser — robust across engines,
  where pixel counts are not.
- **Trigger dissolves the staleness race; the record preserves the gate.**
  The run is triggered by the beta deploy of a specific commit, so it
  inherently tests that commit — no "which beta build?" race. It records
  pass/fail keyed to the deployed sha (a GitHub commit status is the natural
  home), and `promote.yml` reads that record for the commit it is
  fast-forwarding, refusing on red-or-missing. The baked-in
  `vX.Y.Z-beta+<short-sha>` (App Versioning, [[infrastructure]]) remains the
  cross-check that the deployed artifact is the sha the run believes.
- **Same code-change gate as the deploy.** The e2e job hangs off the
  existing `changes` job in `ci.yml`: a code (`fix`/`feat`) push deploys
  beta and runs the full suite; a docs/chore push skips the beta deploy and
  runs no e2e — the docs-vs-code diff already decides this, nothing parses
  commit subjects.
- **Test-only seams, inert in runtime.** Curation-write isolation tags test
  traffic and routes those ratings to a scratch/discarded path (never
  repointing beta's real `CURATION_DATA_PATH`); a test-only turn-timer seam
  lets long-timer combos run in a fast gate. Any per-channel config either
  seam needs flows through the generated fly-config template + allowlist,
  never a hand-edit (Config Lockstep, [[infrastructure]]).

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file.

**Phase 1 — Toolchain & harness foundation** (no dependencies)
- Add Playwright as a dev toolchain: devDependency, browser install,
  `playwright.config` (`fullyParallel`, four-target project matrix:
  chromium / firefox / webkit / msedge), and package scripts.
- Build the Node `socket.io-client` observer helper (joins a room, exposes
  parsed broadcast state and submitted `DrawOps`).
- Build the base fixture / page objects for Lobby, WritingDrawing, Reveal,
  adding `data-testid`s where stable selectors are missing.

**Phase 2 — Test-only app seams** (depends on: understanding of the room
/ curation / timer code paths; can start alongside Phase 1)
- Add the test-traffic tag + server routing so test prompt-ratings hit a
  scratch/discarded curation path, leaving real curation untouched
  (resolves the [OPEN] in [[infrastructure]]: header vs. room-flag).
  `[artifacts: infrastructure, datamodel]`
- Add the test-only turn-timer seam (inert in normal runtime).
  `[artifacts: infrastructure]`
- Thread the beta scratch/seam config through the generated fly-config
  template + allowlist, never a hand-edit. `[artifacts: infrastructure]`

**Phase 3 — Core flow & drawing specs** (depends on: Phases 1–2)
- The core multiplayer flow spec: N players (one context each) complete
  lobby → write/draw → reveal, asserting server state transitions.
- The deterministic drawing spec: draw intentional strokes, assert exact
  submitted `DrawOps` via the observer helper.
- The flagship four-engine "summit" spec: one player per engine through the
  full flow.

**Phase 4 — Parametrized settings matrix** (depends on: Phase 3)
- A typed, curated lobby-settings matrix; run the flow spec across the
  named combos (turn timer via the seam, laps, monochrome, min-player
  override, curated vs. free-form prompt mode).

**Phase 5 — Beta-deploy run & promote-gate wiring** (depends on: Phases 3–4)
- A GitHub Actions job, triggered after a successful beta deploy and gated
  by the existing code-change `changes` signal, that runs the suite sharded
  against live beta. `[artifacts: infrastructure]`
- Record the run's pass/fail keyed to the deployed commit sha (a GitHub
  commit status/check on that sha). `[artifacts: infrastructure]`
- Change `promote.yml` to look up the recorded e2e result for the commit
  being promoted and refuse on red-or-missing, leaving the per-push `checks`
  gate untouched. `[artifacts: infrastructure]`

## Complexity Tracking

Principle I (Keep It Simple / No Premature Scaling) requires new complexity
to be justified.

| Deviation | Justification | Simpler alternative rejected because |
|---|---|---|
| Add Playwright + browser binaries | The only way to get real cross-engine (WebKit/Gecko/Chromium) confidence before a prod cut; unit tests (vitest) cannot exercise a real browser. Dev-only — ships nothing into the app ([[constitution]] scope note). | Hand-rolling a browser-driver harness re-implements what Playwright owns idiomatically (Principle V). |
| Four-target project matrix | Catches engine-specific regressions the user explicitly wants; sharding keeps wall-clock bounded. | A single-browser suite would miss exactly the cross-browser regressions this feature exists to catch. |
| Test-only app seams (curation isolation, timer) | Required to test live beta without polluting real curation data and without a 15-min-per-combo floor. Inert in runtime. | Repointing beta's whole `CURATION_DATA_PATH` would break real beta curation; not seaming the timer would make long-timer combos untestable in a fast gate. |
| Runs against live beta rather than an ephemeral spin-up | Tests the real deployed artifact a promote will ship; being triggered by the deploy makes the run inherently test that commit, and the recorded per-sha result carries the guarantee forward to promote. | Ephemeral spin-up tests a tree that isn't the deployed beta, weakening the "gate the real thing" guarantee the user asked for. |

## Open Questions

- **Curation test-tag mechanism** (the [OPEN] in [[infrastructure]]): a
  test-only request header vs. a room-level flag, and scratch-path vs.
  outright discard for tagged ratings. Decide in Phase 2.
- **Player count for the core flow spec** — the smallest N that meaningfully
  exercises multi-lap rotation while keeping the suite fast (the min-player
  override and default laps-by-count rules bear on this).
- **Beta env exposure of the seams** — confirm the test-timer and
  curation-tag seams are gated so they cannot be triggered by real beta
  traffic, only by the suite (a shared secret / header the gate holds).
- **Shard count in CI** — how many shards the beta-deploy job fans out,
  balanced against beta being a single shared server under concurrent test
  rooms.
- **Per-sha result storage & missing-result policy** (the second [OPEN] in
  [[infrastructure]]): a GitHub commit status vs. a stored artifact, and
  whether `promote.yml` blocks or warns when the commit has no recorded e2e
  run yet. Decide in Phase 5.

## Production Annotation Summary

No production annotations are owed. The suite and its seams are dev/test
tooling ([[constitution]] scope: not app runtime), and the seams are inert
in normal runtime rather than being accepted runtime shortcuts. The
existing turn-timer floor and curation-store behavior they work around are
already annotated in [[infrastructure]] where relevant.
