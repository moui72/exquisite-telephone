import { describe, expect, it } from 'vitest';
import type { CurationData } from '../domain/curationStore.js';
import {
  analyzeCounts,
  partitionOffensive,
  reconcileLedger,
  type LedgerEntry,
} from './ledger.js';

function snapshot(candidates: CurationData['candidates']): CurationData {
  return { ratings: {}, candidates };
}

describe('reconcileLedger (T007, datamodel.md CurationLedger)', () => {
  it('promotes decked candidates out, carries disposition, appends new', () => {
    const prior: LedgerEntry[] = [
      { phrase: 'now in the deck', votes: 2, firstSeenAt: 100, disposition: 'pending' },
      { phrase: 'a rejected one', votes: 5, firstSeenAt: 200, disposition: 'rejected' },
      { phrase: 'still pending', votes: 1, firstSeenAt: 300, disposition: 'pending' },
    ];
    const fresh = snapshot([
      { phrase: 'now in the deck', votes: 4, firstLoggedAt: 100 },
      { phrase: 'a rejected one', votes: 9, firstLoggedAt: 200 },
      { phrase: 'still pending', votes: 3, firstLoggedAt: 300 },
      { phrase: 'brand new candidate', votes: 1, firstLoggedAt: 400 },
    ]);
    const bank = ['now in the deck'];

    const { ledger, promoted } = reconcileLedger(prior, fresh, bank);

    // Decked candidate promoted and dropped out of the active ledger.
    expect(ledger.find((e) => e.phrase === 'now in the deck')).toBeUndefined();
    expect(promoted.map((e) => e.phrase)).toEqual(['now in the deck']);
    expect(promoted[0].disposition).toBe('promoted');

    // Rejected entry keeps its disposition and firstSeenAt; votes refreshed.
    const rejected = ledger.find((e) => e.phrase === 'a rejected one');
    expect(rejected).toEqual({
      phrase: 'a rejected one',
      votes: 9,
      firstSeenAt: 200,
      disposition: 'rejected',
    });

    // Existing pending kept, votes refreshed from the snapshot.
    const stillPending = ledger.find((e) => e.phrase === 'still pending');
    expect(stillPending).toEqual({
      phrase: 'still pending',
      votes: 3,
      firstSeenAt: 300,
      disposition: 'pending',
    });

    // Absent-from-ledger candidate appended as new pending, firstSeenAt
    // seeded from the snapshot's firstLoggedAt.
    const brandNew = ledger.find((e) => e.phrase === 'brand new candidate');
    expect(brandNew).toEqual({
      phrase: 'brand new candidate',
      votes: 1,
      firstSeenAt: 400,
      disposition: 'pending',
    });
  });
});

describe('analyzeCounts (T009, count thresholds)', () => {
  it.fails('flags down-heavy over-sample removals and strong-vote additions', () => {
    const data: CurationData = {
      ratings: {
        'down-heavy enough': { phrase: 'down-heavy enough', up: 2, down: 18 }, // 20, .9
        'down but tiny sample': { phrase: 'down but tiny sample', up: 1, down: 4 }, // 5, .8
        'well liked': { phrase: 'well liked', up: 30, down: 2 },
        'borderline ratio': { phrase: 'borderline ratio', up: 10, down: 10 }, // 20, .5
      },
      candidates: [
        { phrase: 'strong candidate', votes: 5, firstLoggedAt: 1 },
        { phrase: 'exactly at threshold', votes: 3, firstLoggedAt: 2 },
        { phrase: 'too few votes', votes: 2, firstLoggedAt: 3 },
      ],
    };

    const { removalCandidates, additionCandidates } = analyzeCounts(data);

    expect(removalCandidates.map((r) => r.phrase)).toEqual(['down-heavy enough']);
    expect(additionCandidates.map((c) => c.phrase).sort()).toEqual([
      'exactly at threshold',
      'strong candidate',
    ]);
  });
});

describe('partitionOffensive (T009, quarantine plumbing)', () => {
  it.fails('routes flagged entries to quarantine, keeps the rest in the ledger', () => {
    const entries: LedgerEntry[] = [
      { phrase: 'a fine phrase', votes: 3, firstSeenAt: 1, disposition: 'pending' },
      { phrase: 'an offensive phrase', votes: 4, firstSeenAt: 2, disposition: 'pending' },
      { phrase: 'another fine one', votes: 1, firstSeenAt: 3, disposition: 'pending' },
    ];
    const flagged = new Set(['an offensive phrase']);

    const { ledger, quarantine } = partitionOffensive(entries, flagged);

    expect(ledger.map((e) => e.phrase)).toEqual(['a fine phrase', 'another fine one']);
    expect(quarantine.map((e) => e.phrase)).toEqual(['an offensive phrase']);
  });
});
