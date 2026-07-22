import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RatingEvent } from '../domain/curationStore.js';
import { readAndFoldEvents, sanitizeCurationData } from './pipe.js';

let eventsDir: string;

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
  it.fails('folds the event dir and sanitizes candidate text on output', async () => {
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
