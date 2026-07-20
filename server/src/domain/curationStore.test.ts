import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LogEvent, Logger } from '../observability/logger.js';
import { createCurationStore } from './curationStore.js';

let dir: string;

function makeLogger(): { logger: Logger; events: LogEvent[] } {
  const events: LogEvent[] = [];
  return { logger: { log: (event) => events.push(event) }, events };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'curation-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * A lost or corrupt curation file must never stop the server booting
 * (constitution Principle IX). The game does not depend on this data;
 * degrading to an empty store is always preferable to refusing to start.
 */
describe('createCurationStore load behavior', () => {
  // T004 lands these red; T005 implements the behavior and removes `.fails`.
  it.fails('yields an empty store when the file is missing', () => {
    const { logger } = makeLogger();

    const store = createCurationStore(join(dir, 'absent.json'), logger);

    expect(store.snapshot()).toEqual({ ratings: {}, candidates: [] });
  });

  // T004 lands these red; T005 implements the behavior and removes `.fails`.
  it.fails('yields an empty store and logs a structured warning when the file is unparseable', () => {
    const path = join(dir, 'corrupt.json');
    writeFileSync(path, '{ this is not json');
    const { logger, events } = makeLogger();

    const store = createCurationStore(path, logger);

    expect(store.snapshot()).toEqual({ ratings: {}, candidates: [] });
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'curation_store_load', outcome: 'failure' }),
    );
  });

  // T004 lands these red; T005 implements the behavior and removes `.fails`.
  it.fails('does not throw on an unparseable file — a lost file must not stop the server booting', () => {
    const path = join(dir, 'corrupt.json');
    writeFileSync(path, 'not json at all');
    const { logger } = makeLogger();

    expect(() => createCurationStore(path, logger)).not.toThrow();
  });

  // T004 lands these red; T005 implements the behavior and removes `.fails`.
  it.fails('loads existing ratings and candidates back from a well-formed file', () => {
    const path = join(dir, 'curation.json');
    writeFileSync(
      path,
      JSON.stringify({
        ratings: { 'a bear on a unicycle': { phrase: 'a bear on a unicycle', up: 2, down: 1 } },
        candidates: [{ phrase: 'a moose reading the news', votes: 1, firstLoggedAt: 1 }],
      }),
    );
    const { logger } = makeLogger();

    const store = createCurationStore(path, logger);

    expect(store.snapshot().ratings['a bear on a unicycle']).toEqual({
      phrase: 'a bear on a unicycle',
      up: 2,
      down: 1,
    });
    expect(store.snapshot().candidates).toEqual([
      { phrase: 'a moose reading the news', votes: 1, firstLoggedAt: 1 },
    ]);
  });
});
