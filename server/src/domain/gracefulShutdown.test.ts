import { describe, expect, it, vi } from 'vitest';
import type { LogEvent, Logger } from '../observability/logger.js';
import type { CurationStore } from './curationStore.js';
import { registerGracefulShutdown, type ShutdownProcess } from './gracefulShutdown.js';

function makeLogger(): { logger: Logger; events: LogEvent[] } {
  const events: LogEvent[] = [];
  return { logger: { log: (event) => events.push(event) }, events };
}

function makeProcess(): {
  proc: ShutdownProcess;
  handlers: Map<string, () => void | Promise<void>>;
  exits: number[];
} {
  const handlers = new Map<string, () => void | Promise<void>>();
  const exits: number[] = [];
  return {
    proc: {
      on(signal, handler) {
        handlers.set(signal, handler);
      },
      exit(code) {
        exits.push(code);
      },
    },
    handlers,
    exits,
  };
}

/**
 * A Fly deploy stops the machine with SIGTERM. Without this, every rating
 * still sitting in the store's debounce window is lost on every deploy —
 * silently, since nothing else in the app notices.
 */
describe('registerGracefulShutdown', () => {
  it('registers a handler for both SIGTERM and SIGINT', () => {
    const { logger } = makeLogger();
    const { proc, handlers } = makeProcess();
    const store = { flush: vi.fn(async () => {}) } as unknown as CurationStore;

    registerGracefulShutdown(store, logger, proc);

    expect([...handlers.keys()].sort()).toEqual(['SIGINT', 'SIGTERM']);
  });

  it('flushes the curation store on SIGTERM', async () => {
    const { logger } = makeLogger();
    const { proc, handlers } = makeProcess();
    const flush = vi.fn(async () => {});
    const store = { flush } as unknown as CurationStore;

    registerGracefulShutdown(store, logger, proc);
    await handlers.get('SIGTERM')?.();

    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('awaits the flush BEFORE exiting — an exit that races the write loses it', async () => {
    const { logger } = makeLogger();
    const { proc, handlers, exits } = makeProcess();
    const order: string[] = [];
    const store = {
      flush: vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push('flushed');
      }),
    } as unknown as CurationStore;
    const proc2: ShutdownProcess = {
      on: proc.on,
      exit: (code) => {
        order.push('exited');
        exits.push(code);
      },
    };

    registerGracefulShutdown(store, logger, proc2);
    await handlers.get('SIGTERM')?.();

    expect(order).toEqual(['flushed', 'exited']);
    expect(exits).toEqual([0]);
  });

  it('still exits when the flush fails — a stuck write must not hang the deploy', async () => {
    const { logger, events } = makeLogger();
    const { proc, handlers, exits } = makeProcess();
    const store = {
      flush: vi.fn(async () => {
        throw new Error('disk gone');
      }),
    } as unknown as CurationStore;

    registerGracefulShutdown(store, logger, proc);
    await handlers.get('SIGINT')?.();

    expect(exits).toEqual([0]);
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'graceful_shutdown', outcome: 'failure' }),
    );
  });
});
