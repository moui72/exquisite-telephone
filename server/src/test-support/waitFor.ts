/**
 * Test-only helpers for waiting on real signals instead of hardcoded
 * sleeps or unbounded `await new Promise((resolve) => ...)` patterns.
 *
 * Both helpers bound how long a test can wait and reject with a
 * descriptive error on timeout, so a genuine bug fails the test fast and
 * legibly instead of hanging until Vitest's generic per-test timeout.
 */

export interface WaitForOptions {
  /** Milliseconds to wait before giving up. Defaults to 2000. */
  timeoutMs?: number;
  /** Milliseconds between condition checks. Defaults to 5. */
  intervalMs?: number;
  /** Included in the timeout error to identify what was being waited on. */
  description?: string;
}

/**
 * Polls `condition` until it returns true, or rejects once `timeoutMs`
 * elapses. Use this in place of a hardcoded `setTimeout(resolve, N)` sleep
 * when what you actually want is to wait for observable state (e.g. a
 * room-store field) to change.
 */
export async function waitFor(
  condition: () => boolean,
  options: WaitForOptions = {},
): Promise<void> {
  const { timeoutMs = 2000, intervalMs = 5, description = 'condition to become true' } = options;
  const deadline = Date.now() + timeoutMs;

  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error(`waitFor: timed out after ${timeoutMs}ms waiting for ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

interface MinimalEventTarget {
  once(event: string, listener: (...args: unknown[]) => void): unknown;
  off(event: string, listener: (...args: unknown[]) => void): unknown;
}

/**
 * Waits for `event` to fire on `emitter` (a Socket.IO client socket, or
 * any Node-style EventEmitter), resolving with the value it was emitted
 * with. Rejects with a descriptive error if the event does not fire
 * within `timeoutMs`, and always removes its listener so a late emit
 * after timeout is a no-op rather than a leak.
 */
export function waitForEvent<T = void>(
  emitter: MinimalEventTarget,
  event: string,
  timeoutMs = 2000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.off(event, handleEvent);
      reject(new Error(`waitForEvent: timed out after ${timeoutMs}ms waiting for "${event}"`));
    }, timeoutMs);

    function handleEvent(value: unknown) {
      clearTimeout(timer);
      resolve(value as T);
    }

    emitter.once(event, handleEvent);
  });
}

/**
 * Connect budget for a Socket.IO client establishing its transport to a
 * localhost test server — deliberately more generous than the 2000ms
 * default of `waitForEvent`.
 *
 * A `'connect'` wait is unlike a wait on an application signal
 * (`roomChanged`, an ack): it exercises no product code path, only the
 * transport handshake, whose latency is dominated by event-loop and CPU
 * scheduling. When the full suite runs in parallel under load the
 * handshake can exceed 2000ms, which surfaced as flaky
 * `waitForEvent: timed out ... waiting for "connect"` failures with no
 * underlying product bug. Genuine-signal waits keep the tighter 2000ms so
 * a real broadcast/ack regression still fails fast; only transport
 * establishment gets this looser budget.
 *
 * Kept below Vitest's per-test timeout so a truly dead connection still
 * fails legibly here ("waiting for connect") rather than as a generic
 * per-test-timeout hang. Callers that chain two connects in one test
 * should raise that test's timeout to preserve the headroom (see
 * server.test.ts).
 */
export const CONNECT_TIMEOUT_MS = 5000;

/**
 * Waits for a Socket.IO client's `'connect'` event using the generous
 * {@link CONNECT_TIMEOUT_MS} transport budget. Thin wrapper over
 * `waitForEvent` so every connect wait shares one tunable knob.
 */
export function waitForConnect(
  emitter: MinimalEventTarget,
  timeoutMs = CONNECT_TIMEOUT_MS,
): Promise<void> {
  return waitForEvent<void>(emitter, 'connect', timeoutMs);
}
