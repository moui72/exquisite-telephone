---
plan: plan-e2e-flake-fix-2026-07-24-0428.md
generated: 2026-07-24
status: ready
---

# Tasks

## Phase 1: Kill the ambiguity and bound the action

- [ ] T001 In `e2e/pages/writingDrawing.ts` `playIfMyTurn` (~lines 118–146),
  make the submit interaction target only the **current turn's enabled
  submit**, so Playwright's auto-retry can never re-resolve the ambiguous
  "Present your contribution" accessible name to the drawing turn's
  `disabled type="button"` submit after the round advances. Resolve the
  open question by choosing the least brittle option against
  `client/src/lib/views/WritingDrawing.svelte` (three buttons ~lines
  378/415/489): a turn-scoped `data-testid`, an `:enabled` filter, or
  scoping to the active turn's form — if a `data-testid` is chosen, add it
  to the relevant submit button(s) in `WritingDrawing.svelte`. Addresses
  F001. Verify: `pnpm exec playwright test --list` still collects the specs,
  and lint + typecheck pass; if browsers are available locally, a chromium
  run of `flow.spec.ts` still passes.

- [ ] T002 [parallel] Add a global `actionTimeout` (~15–20s) to
  `playwright.config.ts` so a wedged action fails fast with a legible error
  instead of burning the 240s test timeout (~4 min). Pick a value
  comfortably above real live-beta interaction latency but far below the
  test timeout (resolve the open question). Verify config still parses
  (`playwright test --list`) and typecheck passes.

## Phase 2: Progress-verified turn play

- [ ] T003 In `e2e/pages/writingDrawing.ts` `playIfMyTurn`, make turn-play
  **tolerant of an action timeout**: after attempting the submit, confirm
  the round actually advanced by consulting the observer's authoritative
  room snapshot (`e2e/helpers/observer.ts`) rather than trusting the single
  DOM click, retrying/advancing based on server state. This closes any
  residual check-then-act window left after T001. Verify lint + typecheck,
  and (if browsers available) a local chromium `flow.spec.ts` run.

## Phase 3: Re-evaluate retries; parallelize the engines

- [ ] T004 Now that the root cause is fixed (Phases 1–2), tighten the CI
  `retries` policy so a genuine flake fails loudly instead of being silently
  retried — decide `retries: 0` in CI vs. keeping `1` but treating flaky as
  failure — and apply the decision in `playwright.config.ts` (and/or the CI
  invocation). Document the rationale in a comment.

- [ ] T005 Restructure the `Cross-browser e2e (beta)` job in
  `.github/workflows/ci.yml` from the current mixed 4-shard fan-out to a
  **per-engine matrix** (chromium/firefox/webkit/msedge), so the slow
  engines run in parallel rather than serializing behind a shared shard.
  Keep the per-sha commit-status recording (`e2e/cross-browser`) intact so
  `promote.yml` still reads one aggregate result. Update the
  `infrastructure.md` End-to-End Test Gate section (which currently
  describes "fan out across four shards") to match the per-engine matrix.
  [artifacts: infrastructure]

## Phase 4: Test-only client grace seam

- [ ] T006 Add a **test-only client-side seam** that shrinks the 30s
  `GRACE_MS` per-turn wait for test traffic only (the existing server-side
  turn-timer seam does not reach the client grace), gated with the same
  discipline as the existing E2E seams (inert and un-triggerable in normal
  runtime). Wire the e2e harness to activate it, and document the new seam
  on the End-to-End Test Gate seam surface in `infrastructure.md`. Include a
  test asserting the grace is shortened only under the test signal and is a
  no-op otherwise. [artifacts: infrastructure]
