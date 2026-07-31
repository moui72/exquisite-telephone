---
status: approved
branch: flaky-socket-test-deflake
created: 2026-07-31
features: []
surfaced-defects: []
---

# Plan — De-flake the real-socket server integration tests

## Goal

Make the real-socket server integration tests in `server/src/socket/server.test.ts`
deterministic under load so they stop tripping the pre-commit full-suite hook and
passing only on retry.

## Scope

**In scope**
- `feedback-flaky-server-socket-tests-b13d` (F001): two recurring flaky
  signatures — `reconnect tolerance … a dropped connection can resume the same
  seat with its session token` (fails as `waitForEvent: timed out after 2000ms
  waiting for "connect"`, server.test.ts:322) and `onPlayAgain … pushes the
  other client its own new roomChanged` (server.test.ts:673). Root cause is
  timing-sensitivity: the whole suite runs in parallel and the 2000ms default
  poll/connect budget in `server/src/test-support/waitFor.ts` (`timeoutMs =
  2000`) is too tight when the machine is loaded.

**Out of scope**
- Any product/behavior change — this is test-support only; the reconnect and
  play-again features are correct.
- The DrawingCanvas and Reveal feedback (separate plans).

## Technical Approach

Weigh and apply the least-invasive de-flake among the feedback's candidates:
raise/loosen `waitForEvent`'s connect budget for these socket tests, await an
explicit `connect` event rather than polling, serialize the heaviest socket
integration tests, or a combination. Prefer awaiting the real `connect` event
over simply inflating the timeout where practical, so the test asserts on a
genuine signal rather than a longer race window; fall back to a larger, clearly
justified budget for the connect wait where an explicit event isn't clean.
Keep the change confined to `server/src/socket/server.test.ts` and
`server/src/test-support/waitFor.ts`.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in
the linked tasks file.

### Phase 1 — Diagnose and de-flake
- Reproduce the timing-sensitivity (e.g. run the socket suite under artificial
  load / repeated runs) enough to confirm the connect-budget race, then apply
  the chosen fix to the two flaky cases: prefer awaiting an explicit `connect`
  event; otherwise loosen `waitForEvent`'s connect budget with a justifying
  comment, and/or serialize the heaviest socket integration tests.
  (feedback b13d) Depends on: nothing.

### Phase 2 — Confirm determinism
- Run the affected tests repeatedly (and the full suite) to confirm they pass
  deterministically without retry; confirm the pre-commit hook is green.
  (feedback b13d) Depends on: Phase 1.

## Open Questions
- Await-explicit-`connect`-event vs. loosened-timeout vs. serialize-heaviest —
  Phase 1 picks per what actually removes the race with the least behavioral
  coupling.
