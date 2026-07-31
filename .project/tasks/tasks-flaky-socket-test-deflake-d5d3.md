---
plan: plan-flaky-socket-test-deflake-2026-07-31-012d.md
generated: 2026-07-31
status: completed
complexity: simple
---

# Tasks

## Phase 1: Diagnose and de-flake

- [x] T001 Confirm the connect-budget race behind the two flaky cases in `server/src/socket/server.test.ts` — `reconnect tolerance … a dropped connection can resume the same seat with its session token` (times out as `waitForEvent: timed out after 2000ms waiting for "connect"`, ~server.test.ts:322) and `onPlayAgain … pushes the other client its own new roomChanged` (~server.test.ts:673). The 2000ms default in `server/src/test-support/waitFor.ts` (`timeoutMs = 2000`) is too tight when the full suite runs in parallel under load. Reproduce the flakiness (repeated runs and/or artificial load) enough to confirm it is a timing race, not a product bug.
- [x] T002 De-flake the two cases: prefer awaiting an explicit `connect` event over polling where the test can (so it waits on a real signal, not a longer race window); otherwise loosen `waitForEvent`'s connect budget with a clearly justifying comment, and/or serialize the heaviest socket integration tests. Keep changes confined to `server/src/socket/server.test.ts` and `server/src/test-support/waitFor.ts`; make no product/behavior change.

## Phase 2: Confirm determinism

- [x] T003 Run the affected tests repeatedly (and the full suite via the pre-commit gate) to confirm they now pass deterministically without retry. Record the result; if any residual flake remains, tighten the fix from T002.
