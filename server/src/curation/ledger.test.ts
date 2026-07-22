import { describe, expect, it } from 'vitest';
import type { CurationData } from '../domain/curationStore.js';
import { reconcileLedger, type LedgerEntry } from './ledger.js';

function snapshot(candidates: CurationData['candidates']): CurationData {
  return { ratings: {}, candidates };
}

describe('reconcileLedger (T007, datamodel.md CurationLedger)', () => {
  it.fails('promotes decked candidates out, carries disposition, appends new', () => {
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
