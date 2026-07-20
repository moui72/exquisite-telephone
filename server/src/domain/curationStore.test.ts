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
  it('yields an empty store when the file is missing', () => {
    const { logger } = makeLogger();

    const store = createCurationStore(join(dir, 'absent.json'), logger);

    expect(store.snapshot()).toEqual({ ratings: {}, candidates: [] });
  });

  it('yields an empty store and logs a structured warning when the file is unparseable', () => {
    const path = join(dir, 'corrupt.json');
    writeFileSync(path, '{ this is not json');
    const { logger, events } = makeLogger();

    const store = createCurationStore(path, logger);

    expect(store.snapshot()).toEqual({ ratings: {}, candidates: [] });
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'curation_store_load', outcome: 'failure' }),
    );
  });

  it('does not throw on an unparseable file — a lost file must not stop the server booting', () => {
    const path = join(dir, 'corrupt.json');
    writeFileSync(path, 'not json at all');
    const { logger } = makeLogger();

    expect(() => createCurationStore(path, logger)).not.toThrow();
  });

  it('loads existing ratings and candidates back from a well-formed file', () => {
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

/**
 * Where a rating lands depends on the opening phrase's origin, which the
 * caller resolves (datamodel.md Normalization Rules — Prompt rating).
 */
describe('recordRating routing', () => {
  it('creates a PromptRating on a bank phrase’s first rating', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger);

    store.recordRating('a bear on a unicycle', 'up', true);

    expect(store.snapshot().ratings['a bear on a unicycle']).toEqual({
      phrase: 'a bear on a unicycle',
      up: 1,
      down: 0,
    });
    expect(store.snapshot().candidates).toEqual([]);
  });

  it('increments the existing record rather than replacing it, for both up and down', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger);

    store.recordRating('a bear on a unicycle', 'up', true);
    store.recordRating('a bear on a unicycle', 'up', true);
    store.recordRating('a bear on a unicycle', 'down', true);

    expect(store.snapshot().ratings['a bear on a unicycle']).toEqual({
      phrase: 'a bear on a unicycle',
      up: 2,
      down: 1,
    });
    expect(Object.keys(store.snapshot().ratings)).toHaveLength(1);
  });

  it('creates a CandidatePhrase on a non-bank phrase’s first thumbs-up', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger, { now: () => 1_700_000_000_000 });

    store.recordRating('a moose reading the news', 'up', false);

    expect(store.snapshot().candidates).toEqual([
      { phrase: 'a moose reading the news', votes: 1, firstLoggedAt: 1_700_000_000_000 },
    ]);
    expect(store.snapshot().ratings).toEqual({});
  });

  it('upserts by exact text — a repeat thumbs-up increments votes and preserves firstLoggedAt', () => {
    let clock = 1_000;
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger, { now: () => clock });

    store.recordRating('a moose reading the news', 'up', false);
    clock = 9_999;
    store.recordRating('a moose reading the news', 'up', false);

    expect(store.snapshot().candidates).toEqual([
      { phrase: 'a moose reading the news', votes: 2, firstLoggedAt: 1_000 },
    ]);
  });

  it('treats near-miss wording as distinct records — exact text only', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger);

    store.recordRating('a bear on a unicycle', 'up', false);
    store.recordRating('a bear riding a unicycle', 'up', false);

    expect(store.snapshot().candidates).toHaveLength(2);
  });
});

/**
 * A thumbs-DOWN on a player-written phrase is recorded NOWHERE — not as
 * a candidate, not as a zero-vote placeholder, not as a PromptRating
 * (datamodel.md CandidatePhrase: "There is no negative counterpart").
 * It has no destination: the phrase isn't in the bank, so there's no
 * tally to decrement, and recording "someone disliked this player's
 * writing" serves no purpose the curator needs.
 *
 * These tests exist because "does nothing" is precisely the behavior a
 * later refactor breaks silently — a well-meaning symmetry pass that
 * gives candidates a `downvotes` field would pass every other test here.
 */
describe('recordRating discards a thumbs-down on a player-written phrase', () => {
  it('creates no candidate record', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger);

    store.recordRating('a moose reading the news', 'down', false);

    expect(store.snapshot().candidates).toEqual([]);
  });

  it('creates no rating record either — it does not fall through to the bank tally', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger);

    store.recordRating('a moose reading the news', 'down', false);

    expect(store.snapshot().ratings).toEqual({});
  });

  it('does not throw — the rating is accepted and discarded, never rejected', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger);

    expect(() => store.recordRating('a moose reading the news', 'down', false)).not.toThrow();
  });

  it('leaves an existing candidate’s votes untouched', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger);

    store.recordRating('a moose reading the news', 'up', false);
    store.recordRating('a moose reading the news', 'down', false);

    expect(store.snapshot().candidates).toEqual([
      { phrase: 'a moose reading the news', votes: 1, firstLoggedAt: expect.any(Number) },
    ]);
  });

  it('mutates nothing at all — the whole store is byte-identical afterwards', () => {
    const { logger } = makeLogger();
    const store = createCurationStore(join(dir, 'c.json'), logger);
    store.recordRating('a bear on a unicycle', 'up', true);
    const before = JSON.stringify(store.snapshot());

    store.recordRating('a moose reading the news', 'down', false);

    expect(JSON.stringify(store.snapshot())).toBe(before);
  });
});
