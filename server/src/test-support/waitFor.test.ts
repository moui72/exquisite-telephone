import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { waitFor, waitForEvent } from './waitFor.js';

describe('waitFor', () => {
  it('resolves as soon as the condition becomes true', async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 10);

    await waitFor(() => ready, { timeoutMs: 500, intervalMs: 5 });

    expect(ready).toBe(true);
  });

  it('resolves immediately when the condition is already true', async () => {
    await expect(waitFor(() => true, { timeoutMs: 50 })).resolves.toBeUndefined();
  });

  it('rejects with a descriptive error once the timeout elapses without the condition becoming true', async () => {
    await expect(
      waitFor(() => false, { timeoutMs: 30, intervalMs: 5, description: 'the sky to fall' }),
    ).rejects.toThrow(/timed out after 30ms.*the sky to fall/);
  });
});

describe('waitForEvent', () => {
  it('resolves with the value the event was emitted with', async () => {
    const emitter = new EventEmitter();
    setTimeout(() => emitter.emit('ping', { pong: true }), 5);

    const result = await waitForEvent<{ pong: boolean }>(emitter, 'ping', 500);

    expect(result).toEqual({ pong: true });
  });

  it('rejects with a descriptive error if the event never fires before the timeout', async () => {
    const emitter = new EventEmitter();

    await expect(waitForEvent(emitter, 'never', 30)).rejects.toThrow(
      /timed out after 30ms waiting for "never"/,
    );
  });

  it('removes its listener once settled, so a late emit after timeout does not throw', async () => {
    const emitter = new EventEmitter();

    await expect(waitForEvent(emitter, 'late', 20)).rejects.toThrow();
    expect(emitter.listenerCount('late')).toBe(0);

    // A late emit after the listener was cleaned up must not blow up the process.
    expect(() => emitter.emit('late', 'value')).not.toThrow();
  });
});
