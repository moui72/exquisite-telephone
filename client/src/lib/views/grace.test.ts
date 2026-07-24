import { describe, expect, it } from 'vitest';
import { GRACE_MS, TEST_GRACE_MS, graceMsFor } from './grace.js';

/**
 * T006 — the client half of the test-only grace seam: the grace is
 * shortened ONLY when the server-confirmed test-traffic flag is set, and
 * is otherwise the full 30s (a no-op in normal runtime).
 */
describe('graceMsFor (T006 client grace seam)', () => {
  it('shortens the grace under the test signal', () => {
    expect(graceMsFor(true)).toBe(TEST_GRACE_MS);
    expect(TEST_GRACE_MS).toBeLessThan(GRACE_MS);
  });

  it('is a no-op without the test signal — the full 30s grace stands', () => {
    expect(graceMsFor(false)).toBe(GRACE_MS);
    expect(GRACE_MS).toBe(30_000);
  });
});
