import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LogEvent, Logger } from '../observability/logger.js';
import {
  aggregateEvents,
  createCurationStore,
  curationEventsDirFor,
  generateEventFilename,
  MAX_CURATION_EVENTS,
  resolveEventPath,
} from './curationStore.js';

let dir: string;
let dataPath: string;

function makeLogger(): { logger: Logger; events: LogEvent[] } {
  const events: LogEvent[] = [];
  return { logger: { log: (event) => events.push(event) }, events };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'curation-events-'));
  dataPath = join(dir, 'curation.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Every event file the store has written, in name order. */
function eventFiles(): string[] {
  const eventsDir = curationEventsDirFor(dataPath);
  try {
    return readdirSync(eventsDir).sort();
  } catch {
    return [];
  }
}

function readEvents(): unknown[] {
  const eventsDir = curationEventsDirFor(dataPath);
  return eventFiles().map((f) => JSON.parse(readFileSync(join(eventsDir, f), 'utf8')) as unknown);
}

/**
 * T011 — filenames are composed ONLY of server-controlled values. Player
 * text belongs in a file's CONTENTS, where it is inert, never in its path
 * (infrastructure.md Curation Store — Filenames are server-controlled).
 */
describe('generateEventFilename', () => {
  it('derives no part of the name from the phrase text', () => {
    const innocuous = generateEventFilename(1_700_000_000_000, 'a quiet phrase');
    const hostile = generateEventFilename(
      1_700_000_000_000,
      '../../etc/passwd <script> ~/.ssh/id_rsa %2e%2e',
    );

    // Wildly different phrase content, structurally identical names.
    for (const phrase of ['a quiet phrase', '../../etc/passwd', 'ZZZ']) {
      const name = generateEventFilename(1_700_000_000_000, phrase);
      expect(name).toMatch(/^1700000000000-[0-9a-f-]+\.json$/);
    }

    // Nothing recognisable from either phrase survives into the name.
    for (const fragment of ['quiet', 'phrase', 'etc', 'passwd', 'script', 'ssh']) {
      expect(innocuous).not.toContain(fragment);
      expect(hostile).not.toContain(fragment);
    }

    // The two differ only in their random suffix — same timestamp prefix.
    expect(innocuous.split('-')[0]).toBe(hostile.split('-')[0]);
    expect(innocuous).not.toBe(hostile);
  });

  it('produces only timestamp, random suffix, and extension — no path separators', () => {
    for (let i = 0; i < 50; i += 1) {
      const name = generateEventFilename(Date.now(), '../'.repeat(i));
      expect(name).not.toContain('/');
      expect(name).not.toContain('\\');
      expect(name).not.toContain('..');
    }
  });

  it('does not collide across rapid calls within the same millisecond', () => {
    const names = new Set(
      Array.from({ length: 500 }, () => generateEventFilename(1_700_000_000_000, 'same phrase')),
    );
    expect(names.size).toBe(500);
  });
});

/**
 * T012 — redundant against T011's generated names BY DESIGN. This is what
 * stops a FUTURE change to the naming scheme silently reintroducing
 * traversal (plan Complexity Tracking).
 */
describe('resolveEventPath containment guard', () => {
  const traversals = [
    '../escape.json',
    '../../../../etc/passwd',
    './../../outside.json',
    'sub/../../escape.json',
    '/etc/passwd',
    '/tmp/absolute.json',
    '..%2f..%2fescape.json',
    '%2e%2e/escape.json',
    '....//escape.json',
    '..\\..\\escape.json',
    'nested/deep/../../../escape.json',
  ];

  it.each(traversals)('refuses to resolve a target outside the directory: %s', (candidate) => {
    const eventsDir = curationEventsDirFor(dataPath);
    expect(() => resolveEventPath(eventsDir, candidate)).toThrow();
  });

  it('accepts an ordinary generated name and resolves it inside the directory', () => {
    const eventsDir = curationEventsDirFor(dataPath);
    const name = generateEventFilename(Date.now(), 'a phrase');
    const resolved = resolveEventPath(eventsDir, name);
    expect(resolved.startsWith(resolve(eventsDir) + sep)).toBe(true);
  });
});

/**
 * T013 — one file per event, created exactly once, never mutated.
 */
describe('append-only write path', () => {
  it('writes one file per rating event and never mutates an existing one', async () => {
    const { logger } = makeLogger();
    const store = createCurationStore(dataPath, logger);

    store.recordRating('bank phrase', 'up', true);
    store.recordRating('bank phrase', 'up', true);
    store.recordRating('bank phrase', 'down', true);
    await store.settled();

    const files = eventFiles();
    expect(files).toHaveLength(3);

    const before = files.map((f) => readFileSync(join(curationEventsDirFor(dataPath), f), 'utf8'));
    store.recordRating('bank phrase', 'up', true);
    await store.settled();

    // The original three files are byte-identical — nothing was rewritten.
    const after = files.map((f) => readFileSync(join(curationEventsDirFor(dataPath), f), 'utf8'));
    expect(after).toEqual(before);
    expect(eventFiles()).toHaveLength(4);
  });

  it('records phrase, value, origin and timestamp in each event', async () => {
    const { logger } = makeLogger();
    const store = createCurationStore(dataPath, logger, { now: () => 1_700_000_000_000 });

    store.recordRating('a bank phrase', 'down', true);
    await store.settled();

    expect(readEvents()).toEqual([
      { phrase: 'a bank phrase', value: 'down', origin: 'bank', ratedAt: 1_700_000_000_000 },
    ]);
  });

  it('still records nothing at all for a player-written thumbs-down', async () => {
    const { logger } = makeLogger();
    const store = createCurationStore(dataPath, logger);

    store.recordRating('something a player typed', 'down', false);
    await store.settled();

    expect(eventFiles()).toEqual([]);
  });

  it('logs and swallows a write failure — curation must never block a turn', async () => {
    const { logger, events } = makeLogger();
    // A FILE where the events directory should be: every write must fail.
    writeFileSync(curationEventsDirFor(dataPath), 'not a directory', 'utf8');
    const store = createCurationStore(dataPath, logger);

    expect(() => store.recordRating('a phrase', 'up', true)).not.toThrow();
    await expect(store.settled()).resolves.toBeUndefined();

    expect(events).toContainEqual(
      expect.objectContaining({ event: 'curation_store_write', outcome: 'failure' }),
    );
  });
});

/**
 * T014 — the read path folds the event log into the aggregate view
 * (datamodel.md Persisted Entities).
 */
describe('aggregate (read-time fold)', () => {
  it('accumulates bank-phrase events into up/down tallies', async () => {
    const { logger } = makeLogger();
    const store = createCurationStore(dataPath, logger);

    store.recordRating('bank one', 'up', true);
    store.recordRating('bank one', 'up', true);
    store.recordRating('bank one', 'down', true);
    store.recordRating('bank two', 'down', true);
    await store.settled();

    const aggregate = await store.aggregate();
    expect(aggregate.ratings['bank one']).toEqual({ phrase: 'bank one', up: 2, down: 1 });
    expect(aggregate.ratings['bank two']).toEqual({ phrase: 'bank two', up: 0, down: 1 });
    expect(aggregate.candidates).toEqual([]);
  });

  it('upserts candidates by exact text, incrementing votes and preserving the earliest firstLoggedAt', async () => {
    const { logger } = makeLogger();
    let clock = 5_000;
    const store = createCurationStore(dataPath, logger, { now: () => (clock += 1_000) });

    store.recordRating('a player phrase', 'up', false);
    store.recordRating('a player phrase', 'up', false);
    store.recordRating('A Player Phrase', 'up', false); // different exact text
    await store.settled();

    const aggregate = await store.aggregate();
    const exact = aggregate.candidates.find((c) => c.phrase === 'a player phrase')!;
    expect(exact.votes).toBe(2);
    expect(exact.firstLoggedAt).toBe(6_000); // the EARLIEST event, not the latest
    // Near-miss wording stays a separate record, deliberately.
    expect(aggregate.candidates.find((c) => c.phrase === 'A Player Phrase')!.votes).toBe(1);
  });

  it('skips a corrupt or partial trailing file with a logged warning rather than failing the fold', async () => {
    const { logger, events } = makeLogger();
    const store = createCurationStore(dataPath, logger);

    store.recordRating('bank one', 'up', true);
    await store.settled();

    // The crash case append-only accepts by construction: one truncated
    // trailing file, written when the process died mid-write.
    // The name must be a VALID generated name -- a real mid-write crash
    // leaves a properly-named file with truncated contents. A
    // bad-shaped name would be rejected by resolveEventPath first, and
    // this test would pass without ever exercising the parse failure it
    // exists to cover. Sorts last, so it is genuinely the trailing file.
    writeFileSync(
      join(curationEventsDirFor(dataPath), '9999999999999-deadbeef-dead-beef-dead-beefdeadbeef.json'),
      '{"phrase":"trunca',
      'utf8',
    );

    const aggregate = await store.aggregate();
    // The good event still folds; only the partial one is lost.
    expect(aggregate.ratings['bank one']).toEqual({ phrase: 'bank one', up: 1, down: 0 });
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'curation_event_skipped', outcome: 'failure' }),
    );
  });

  it('yields an empty aggregate when nothing has ever been written', async () => {
    const { logger } = makeLogger();
    const store = createCurationStore(dataPath, logger);
    await expect(store.aggregate()).resolves.toEqual({ ratings: {}, candidates: [] });
  });

  it('aggregateEvents is a pure fold over events, independent of disk', () => {
    expect(
      aggregateEvents([
        { phrase: 'p', value: 'up', origin: 'bank', ratedAt: 2 },
        { phrase: 'p', value: 'down', origin: 'bank', ratedAt: 1 },
      ]),
    ).toEqual({ ratings: { p: { phrase: 'p', up: 1, down: 1 } }, candidates: [] });
  });
});

/**
 * T015 — Open Question 3: the fold runs ON DEMAND, never at boot.
 */
describe('aggregation is on-demand, never at boot', () => {
  it('does not read the event directory during construction', () => {
    const { logger } = makeLogger();
    const probe = createCurationStore(dataPath, logger);
    void probe;

    // Construction touches nothing: no events directory is even created,
    // and no read is attempted. Boot cost is zero.
    expect(eventFiles()).toEqual([]);
  });

  it('reads from disk only when aggregate() is called', async () => {
    const { logger } = makeLogger();
    const store = createCurationStore(dataPath, logger);
    store.recordRating('bank one', 'up', true);
    await store.settled();

    // A store constructed fresh over the SAME directory sees the events
    // only via aggregate() — proving the fold is not cached from boot.
    const fresh = createCurationStore(dataPath, logger);
    const aggregate = await fresh.aggregate();
    expect(aggregate.ratings['bank one']).toEqual({ phrase: 'bank one', up: 1, down: 0 });
  });
});

/**
 * T016 — Open Question 2: a bound on event accumulation that FAILS SAFELY.
 */
describe('event accumulation bound', () => {
  it('stops writing new events once the limit is reached, without throwing', async () => {
    const { logger, events } = makeLogger();
    const store = createCurationStore(dataPath, logger, { maxEvents: 3 });

    for (let i = 0; i < 10; i += 1) store.recordRating('bank one', 'up', true);
    await store.settled();

    expect(eventFiles()).toHaveLength(3);
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'curation_store_full', outcome: 'failure' }),
    );
  });

  it('counts events already on disk, not only those written this process', async () => {
    const { logger } = makeLogger();
    const first = createCurationStore(dataPath, logger, { maxEvents: 2 });
    first.recordRating('bank one', 'up', true);
    first.recordRating('bank one', 'up', true);
    await first.settled();

    const second = createCurationStore(dataPath, logger, { maxEvents: 2 });
    second.recordRating('bank one', 'up', true);
    await second.settled();

    expect(eventFiles()).toHaveLength(2);
  });

  it('degrades curation only — a full store never makes recordRating throw', async () => {
    const { logger } = makeLogger();
    const store = createCurationStore(dataPath, logger, { maxEvents: 1 });
    store.recordRating('bank one', 'up', true);
    await store.settled();

    expect(() => store.recordRating('bank one', 'up', true)).not.toThrow();
    await expect(store.settled()).resolves.toBeUndefined();
  });

  it('keeps the default limit well inside the 1GB Fly volume', () => {
    // Worst-case event file is bounded by MAX_TEXT_ENTRY_BYTES plus a
    // little metadata; the default must not be able to fill the volume.
    expect(MAX_CURATION_EVENTS * 800).toBeLessThan(1024 * 1024 * 1024);
  });
});
