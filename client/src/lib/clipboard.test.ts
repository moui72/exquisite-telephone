import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './clipboard.js';

/**
 * Unit tests for the clipboard helper (room-code-copy-and-join-link).
 * Callers (Lobby click-to-copy, copy-join-link) gate their confirmation
 * cue on the boolean return, so both the success and the failure/absent
 * paths must be pinned.
 */
describe('copyToClipboard', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'clipboard');
    vi.restoreAllMocks();
  });

  function stubClipboard(writeText: () => Promise<void>) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
  }

  it('writes the text and returns true on success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    await expect(copyToClipboard('ABCDE')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('ABCDE');
  });

  it('returns false when the clipboard write rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    stubClipboard(writeText);

    await expect(copyToClipboard('ABCDE')).resolves.toBe(false);
    expect(writeText).toHaveBeenCalledWith('ABCDE');
  });

  it('returns false when the Clipboard API is absent', async () => {
    // navigator.clipboard is not defined (default, cleaned up in afterEach).
    await expect(copyToClipboard('ABCDE')).resolves.toBe(false);
  });
});
