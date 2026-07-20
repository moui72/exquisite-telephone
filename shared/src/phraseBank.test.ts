import { describe, expect, it } from 'vitest';
import { CURATED_PHRASE_BANK } from './phraseBank.js';

/**
 * The bank is a hand-curated set (see ../PROMPT_CRITERIA.md), so its size is
 * bounded by what survives those criteria rather than by a round target. The
 * binding requirement is datamodel.md's "the bank is sized so realistic rooms
 * never reach the clamp": there is no maximum player count in the design, so
 * `REALISTIC_MAX_PLAYERS` is a sizing assumption, not a system constant. A
 * room larger than this still deals safely — it clamps to a smaller hand.
 */
const MAX_HAND_SIZE = 5;
const REALISTIC_MAX_PLAYERS = 12;
const MINIMUM_BANK_SIZE = MAX_HAND_SIZE * REALISTIC_MAX_PLAYERS;

describe('CURATED_PHRASE_BANK', () => {
  it('is non-empty', () => {
    expect(CURATED_PHRASE_BANK.length).toBeGreaterThan(0);
  });

  it('contains no duplicate entries, so a partitioned deal cannot repeat a phrase', () => {
    const unique = new Set(CURATED_PHRASE_BANK);
    expect(unique.size).toBe(CURATED_PHRASE_BANK.length);
  });

  it('is large enough that a maximum room at the maximum hand size never clamps', () => {
    expect(CURATED_PHRASE_BANK.length).toBeGreaterThanOrEqual(MINIMUM_BANK_SIZE);
  });

  it('holds only trimmed, non-empty phrases', () => {
    for (const phrase of CURATED_PHRASE_BANK) {
      expect(phrase).toBe(phrase.trim());
      expect(phrase.length).toBeGreaterThan(0);
    }
  });
});
