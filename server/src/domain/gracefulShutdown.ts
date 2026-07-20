import type { Logger } from '../observability/logger.js';
import type { CurationStore } from './curationStore.js';

/** The slice of `process` this needs, so it can be tested against a fake. */
export interface ShutdownProcess {
  on(signal: 'SIGTERM' | 'SIGINT', handler: () => void | Promise<void>): void;
  exit(code: number): void;
}

/**
 * Flushes the Curation Store before the process exits.
 *
 * A Fly deploy stops the machine with SIGTERM. Without this, every rating
 * still sitting inside the store's debounce window is dropped on every
 * deploy — and silently, since nothing else in the app reads that data.
 * Game state is deliberately NOT saved here: it is in-memory by design
 * (datamodel.md Overview), and a deploy ending in-progress games is the
 * accepted, documented behavior.
 */
export function registerGracefulShutdown(
  curationStore: CurationStore,
  logger: Logger,
  proc: ShutdownProcess,
): void {
  let shuttingDown = false;

  const handle = async (): Promise<void> => {
    // A second signal during shutdown must not start a second flush.
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      await curationStore.flush();
      logger.log({ event: 'graceful_shutdown', outcome: 'success' });
    } catch (error) {
      // Exit anyway: a stuck or failing write must not hang the deploy.
      logger.log({
        event: 'graceful_shutdown',
        outcome: 'failure',
        message: error instanceof Error ? error.message : String(error),
      });
    }
    proc.exit(0);
  };

  proc.on('SIGTERM', handle);
  proc.on('SIGINT', handle);
}
