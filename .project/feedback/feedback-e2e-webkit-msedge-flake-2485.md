---
status: planned
created: 2026-07-24
---

# Feedback

## Bugs

- [x] F001 The cross-browser e2e suite flakes on the heavier engines
  (webkit and msedge) and is retry-masked green: in CI run `30066639657`
  msedge flaked 6× and webkit 3× (chromium/firefox clean), all with the
  same signature — `locator.click: Target page, context or browser has
  been closed` while clicking **"Present your contribution"** — and those
  two shards were also the slowest (msedge 17m29s, webkit 12m25s). The gate
  passes today only because `retries: 1` papers over it; it is a coin-flip
  from a red gate on a slow day. Full analysis in
  `.project/plans/research-webkit-e2e-flakes-2026-07-24.md`.

  **Root cause (not a teardown race — that was a wrong first guess):** the
  "Target closed" text is rewritten from a real `Test timeout of 240000ms
  exceeded` — the fixture's `context.close()` loop (`e2e/fixtures.ts`, after
  `await use`) only runs *after* the timeout, while the stuck action is
  still in flight. The actual defect is a **check-then-act race on an
  ambiguous accessible name** in `playIfMyTurn`
  (`e2e/pages/writingDrawing.ts:118–146`): `WritingDrawing.svelte` renders
  **three** buttons named "Present your contribution" (~lines 378/415/489).
  The text-turn submit click lands, the round advances, and Playwright's
  auto-retry **re-resolves the same name to a different button** — the
  drawing turn's `disabled` `type="button"` submit — then spins ~350–450 ×
  500ms on a permanently-disabled button until the 240s test timeout. No
  `actionTimeout` is set in `playwright.config.ts`, so a wedged action is
  bounded only by the full test timeout (~4 min burned each time). msedge is
  a Chromium *channel*, so its flaking proves this is timing/locator, not a
  rendering-engine difference; the heavy engines on a 2-vCPU runner (2
  workers × multiple contexts, against live beta) just widen the race
  window. Slowness is therefore **mostly flake tax** — a clean webkit flow
  is ~1.2–1.3 min; the residual floor is live-beta latency + a 30s
  client-side `GRACE_MS` grace, ×5 settings-matrix combos.

  **Remediation options (ranked in the report; capture all here):**
  1. **Scope the submit locator** to the current turn's form / `:enabled`
     submit so the ambiguous name can't re-resolve to another button — the
     core fix.
  2. **Set a global `actionTimeout` (~15–20s)** so a wedged action fails
     fast instead of burning ~4 min against the test timeout.
  3. Make `playIfMyTurn` **tolerate an action timeout and verify progress
     via the observer's room snapshot** (belt-and-suspenders against any
     residual check-then-act window).
  4. **Matrix CI over browser** (a job per engine) to isolate and
     parallelize the slow webkit/msedge runs rather than sharding a mixed
     matrix.
  5. Add a **client-side grace seam** to shrink the 30s `GRACE_MS` wait
     under test (the existing server-side turn-timer seam does not reach
     the client grace) — this one may warrant an [[infrastructure]] note on
     the End-to-End Test Gate seam surface.
  Explicitly **not** a teardown/close barrier — it would only change the
  error text, not the failure. Fixes 1 + 2 are the high-value, low-risk
  pair addressing both the flake and most of the slowness.
