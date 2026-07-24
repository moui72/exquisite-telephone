/**
 * The client-side decoration grace (ui.md Cover Decoration; datamodel.md —
 * Cover decoration): when a new turn becomes ready while the player is
 * mid-decoration, a countdown precedes the turn view taking over. It is a
 * view-transition courtesy ONLY — it never touches the server-side
 * turn-timer deadline or the force-empty flow.
 */
export const GRACE_MS = 30_000;

/**
 * The shortened grace used for e2e test traffic. Long enough to still
 * exercise the grace path, short enough not to add ~30s per round
 * transition ×5 combos to every cross-browser run. Non-zero deliberately:
 * a zero grace would skip the courtesy entirely rather than fast-forward
 * it, changing behavior under test rather than merely speeding it.
 */
export const TEST_GRACE_MS = 500;

/**
 * The grace duration to use. `testTraffic` is only ever true when the
 * server has echoed the test-only seam (server/src/socket/server.ts —
 * `testSeamActive`), which fires strictly under the SAME gate as the other
 * E2E seams (seam enabled AND the `x-e2e-test-signal` secret matches). In
 * normal runtime it is always false, so this is a no-op and the full 30s
 * grace stands (T006).
 */
export function graceMsFor(testTraffic: boolean): number {
  return testTraffic ? TEST_GRACE_MS : GRACE_MS;
}
