---
status: approved
branch: e2e-flake-fix
created: 2026-07-24
features: []
surfaced-defects: []
---

# Plan: De-flake and speed up the cross-browser e2e suite

## Goal

Eliminate the retry-masked webkit/msedge flake in the e2e suite by removing
the ambiguous-locator check-then-act race and bounding stuck actions, then
recover the wasted wall-clock, so the gate passes without relying on
`retries`.

## Scope

Addresses feedback F001 (`feedback-e2e-webkit-msedge-flake`), whose root
cause and five ranked remediations are analyzed in
`.project/plans/research-webkit-e2e-flakes-2026-07-24.md`.

**In scope**
- Fix the core defect: `playIfMyTurn` clicking an ambiguous
  "Present your contribution" accessible name that re-resolves to a
  different (disabled) button after the round advances.
- Bound wedged actions so a failure surfaces in seconds, not after the 240s
  test timeout.
- Make turn-play verify progress via the observer's room snapshot rather
  than trusting a single click.
- Recover slowness: restructure CI so the heavy engines run in parallel, and
  add a test-only client grace seam to shrink the 30s per-turn wait.
- Re-evaluate the CI `retries` policy once the root cause is gone (a lasting
  flake should fail loudly, not be silently retried).

**Out of scope**
- Any change to production game behavior — all fixes are in the e2e harness,
  Playwright config, and CI, except the Phase 4 client grace seam, which is
  test-only and inert in normal runtime.
- Rewriting the settings-matrix combos or the flow itself.

## Technical Approach

Grounded in the research report and [[infrastructure]] End-to-End Test Gate.

- **Disambiguate at the source.** `WritingDrawing.svelte` renders three
  buttons named "Present your contribution"; the fix is to have
  `playIfMyTurn` target the *current turn's* enabled submit (scope by the
  active turn's form / `:enabled` / a turn-specific test id) so Playwright's
  auto-retry can never re-resolve to the drawing turn's disabled button.
- **Fail fast.** No `actionTimeout` is set today, so a wedged action burns
  the full 240s test timeout (~4 min each). A global `actionTimeout` bounds
  it to seconds, turning a 4-minute burn into a fast, legible failure.
- **Trust the model, not the click.** The observer helper already exposes
  the authoritative room snapshot; turn-play can confirm the round actually
  advanced instead of depending on a single DOM interaction.
- **Parallelize the slow engines.** The slowness is mostly flake tax plus
  live-beta latency × 5 combos; a per-engine CI matrix isolates webkit/msedge
  so they don't serialize behind a mixed shard.
- **Shrink the real-time wait under test.** The client's 30s `GRACE_MS` is a
  fixed per-turn cost the server-side timer seam doesn't reach; a test-only
  client grace seam (same gating discipline as the existing seams) removes it
  for test traffic. This one touches [[infrastructure]]'s seam surface.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file.

**Phase 1 — Kill the ambiguity and bound the action** (no dependencies) —
the critical path that resolves F001
- Scope `playIfMyTurn`'s submit interaction to the current turn's enabled
  submit so the "Present your contribution" name cannot re-resolve to the
  disabled drawing-turn button after the round advances.
- Add a global `actionTimeout` (~15–20s) in `playwright.config.ts` so a
  wedged action fails fast instead of burning the 240s test timeout.

**Phase 2 — Progress-verified turn play** (depends on: Phase 1)
- Make `playIfMyTurn` tolerate an action timeout and confirm the round
  advanced via the observer's room snapshot before proceeding, closing any
  residual check-then-act window.

**Phase 3 — Re-evaluate retries; parallelize the engines** (depends on:
Phases 1–2 proving stable)
- Once the root cause is fixed, tighten the CI `retries` policy so a genuine
  flake fails loudly rather than being silently retried (decide 0 vs.
  keeping 1 with flaky-as-failure).
- Restructure the CI e2e job to a per-engine matrix so webkit/msedge run in
  parallel instead of serializing behind a mixed shard. [artifacts:
  infrastructure]

**Phase 4 — Test-only client grace seam** (depends on: Phase 1)
- Add a test-only client-side seam to shrink the 30s `GRACE_MS` per-turn wait
  for test traffic (same gating discipline as the existing E2E seams), and
  document it on the End-to-End Test Gate seam surface. [artifacts:
  infrastructure]

## Complexity Tracking

Principle I asks that complexity be justified.

| Item | Justification |
|---|---|
| A test-only client grace seam (Phase 4) | Adds one more seam beyond the existing header-gated server seams, but it is the only way to remove a fixed 30s-per-turn test cost the server seam can't reach; inert in normal runtime, and gated the same way. Deferrable if Phases 1–3 make the suite fast enough. |
| Per-engine CI matrix (Phase 3) | More CI jobs, but it parallelizes the two slow engines rather than adding capability; net wall-clock win, no new runtime surface. |

## Open Questions

- **`actionTimeout` value** — a concrete number (~15–20s) that's comfortably
  above real live-beta interaction latency but far below the 240s test
  timeout; tune against observed CI timings.
- **Retries policy after the fix** — drop CI `retries` to 0 so any residual
  flake is a hard red, or keep 1 but surface flaky-as-failure? Decide once
  Phases 1–2 have run green a few times.
- **Is Phase 4 needed?** If Phases 1–3 bring webkit/msedge wall-clock into an
  acceptable range, the client grace seam may not be worth the added seam —
  decide based on post-fix timings.
- **Turn-scoped selector shape** — whether disambiguation is best done via a
  turn-specific `data-testid`, an `:enabled` filter, or scoping to the active
  turn's form; pick the least brittle against the existing markup.

## Production Annotation Summary

No production annotations are owed — every change is in test tooling, CI, or
a test-only seam inert in normal runtime; none is an accepted production
shortcut.
