import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LogEvent, Logger } from '../observability/logger.js';
import type { RatingEvent } from '../domain/curationStore.js';
import { readAndFoldEvents, runAggregatePipe, sanitizeCurationData } from './pipe.js';

let eventsDir: string;
const logger: Logger = { log: (_event: LogEvent) => undefined };

function writeEvent(name: string, event: RatingEvent): void {
  writeFileSync(join(eventsDir, name), JSON.stringify(event), 'utf8');
}

beforeEach(() => {
  eventsDir = mkdtempSync(join(tmpdir(), 'pipe-events-'));
});

afterEach(() => {
  rmSync(eventsDir, { recursive: true, force: true });
});

describe('aggregation pipe fold + display sanitization (T003)', () => {
  it('folds the event dir and sanitizes candidate text on output', async () => {
    // Two player-written candidates whose RAW text differs only by a
    // stripped control char (ESC): they must fold to SEPARATE entries
    // (exact-text dedup key, not sanitized), then both display as "abc".
    writeEvent('1000-a.json', {
      phrase: 'abc',
      value: 'up',
      origin: 'player-written',
      ratedAt: 1000,
    });
    writeEvent('1001-b.json', {
      phrase: 'a\x1bbc',
      value: 'up',
      origin: 'player-written',
      ratedAt: 1001,
    });
    // A bank rating too, to assert ratings survive the shape.
    writeEvent('1002-c.json', {
      phrase: 'A crocodile at the dentist',
      value: 'up',
      origin: 'bank',
      ratedAt: 1002,
    });

    const { data } = await readAndFoldEvents(eventsDir);
    // Fold keeps the two near-miss candidates distinct.
    expect(data.candidates).toHaveLength(2);

    const snapshot = sanitizeCurationData(data);
    // Display copies are sanitized: both now read "abc", still two entries.
    expect(snapshot.candidates).toHaveLength(2);
    expect(snapshot.candidates.map((c) => c.phrase).sort()).toEqual(['abc', 'abc']);
    // Counts and ratings untouched by sanitization.
    expect(snapshot.candidates.every((c) => c.votes === 1)).toBe(true);
    expect(snapshot.ratings['A crocodile at the dentist']).toEqual({
      phrase: 'A crocodile at the dentist',
      up: 1,
      down: 0,
    });
  });
});

describe('aggregation pipe archive of folded events (T005)', () => {
  it('archives folded events, leaves corrupt ones live, drains the dir', async () => {
    const dataPath = join(eventsDir, 'curation.json');
    const liveDir = join(eventsDir, 'curation-events');
    mkdirSync(liveDir);
    writeFileSync(
      join(liveDir, '1000-a.json'),
      JSON.stringify({ phrase: 'ok one', value: 'up', origin: 'bank', ratedAt: 1000 }),
    );
    writeFileSync(
      join(liveDir, '1001-b.json'),
      JSON.stringify({ phrase: 'ok two', value: 'up', origin: 'player-written', ratedAt: 1001 }),
    );
    // Corrupt: parses => throws, so it is NOT folded and NOT moved.
    writeFileSync(join(liveDir, '1002-c.json'), 'not json at all');

    const result = await runAggregatePipe(dataPath, { logger, now: () => 5000 });

    // Folded files moved out of the live dir; only the corrupt one remains.
    expect(readdirSync(liveDir).sort()).toEqual(['1002-c.json']);
    // Moved into curation-events-archive/<snapshot-ts>/.
    const archiveDir = join(eventsDir, 'curation-events-archive', '5000');
    expect(readdirSync(archiveDir).sort()).toEqual(['1000-a.json', '1001-b.json']);
    expect(result.foldedNames.sort()).toEqual(['1000-a.json', '1001-b.json']);
    expect(result.skippedNames).toEqual(['1002-c.json']);
  });

  it('snapshot-before-move: a snapshot write failure leaves events untouched', async () => {
    const dataPath = join(eventsDir, 'curation.json');
    const liveDir = join(eventsDir, 'curation-events');
    mkdirSync(liveDir);
    writeFileSync(
      join(liveDir, '1000-a.json'),
      JSON.stringify({ phrase: 'ok one', value: 'up', origin: 'bank', ratedAt: 1000 }),
    );

    await expect(
      runAggregatePipe(dataPath, {
        logger,
        now: () => 5000,
        writeFile: () => Promise.reject(new Error('disk full')),
      }),
    ).rejects.toThrow('disk full');

    // Nothing moved: the event is still live, no archive dir created.
    expect(readdirSync(liveDir)).toEqual(['1000-a.json']);
    expect(existsSync(join(eventsDir, 'curation-events-archive'))).toBe(false);
  });
});
