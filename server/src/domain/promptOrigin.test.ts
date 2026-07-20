import { readFileSync } from 'node:fs';
import { CURATED_PHRASE_BANK } from '@exquisite-telephone/shared';
import { describe, expect, it } from 'vitest';
import { isBankPhrase } from './promptOrigin.js';

const A_BANK_PHRASE = CURATED_PHRASE_BANK[0] as string;

/**
 * Origin resolution is a pure set-membership test against
 * `CURATED_PHRASE_BANK` — nothing else. It never consults
 * `Room.promptMode`, and never trusts a client's claim about where a
 * phrase came from (datamodel.md Normalization Rules — Prompt rating).
 */
describe('isBankPhrase', () => {
  it('resolves a verbatim bank phrase as a bank phrase', () => {
    expect(isBankPhrase(A_BANK_PHRASE)).toBe(true);
  });

  it('resolves every phrase in the bank as a bank phrase', () => {
    expect(CURATED_PHRASE_BANK.every((phrase) => isBankPhrase(phrase))).toBe(true);
  });

  it('resolves a phrase absent from the bank as player-written', () => {
    expect(isBankPhrase('a moose reading the evening news aloud to nobody')).toBe(false);
  });

  /**
   * The two are indistinguishable by text, and the bank tally is the more
   * useful destination — so a coincidental match counts as BANK, not as a
   * new candidate. This is the case the "mode never enters the decision"
   * rule buys us: no branch on how the phrase was produced.
   */
  it('resolves a player-WRITTEN phrase that coincidentally equals a bank entry as a BANK phrase', () => {
    // Simulates a free-form or write-in player typing, by chance, exactly
    // what the bank already contains. Nothing about the input marks it as
    // player-written; that is precisely the point.
    const typedByHand = String(A_BANK_PHRASE);

    expect(isBankPhrase(typedByHand)).toBe(true);
  });

  it('is exact — differing whitespace or case is not a bank phrase', () => {
    expect(isBankPhrase(`  ${A_BANK_PHRASE}  `)).toBe(false);
    expect(isBankPhrase(A_BANK_PHRASE.toUpperCase())).toBe(false);
  });

  it('resolves the empty string as player-written', () => {
    expect(isBankPhrase('')).toBe(false);
  });

  it('builds its lookup set once at module load, not per call', () => {
    const source = readFileSync(new URL('./promptOrigin.ts', import.meta.url), 'utf8');
    const indexOfSet = source.search(/new Set[<(]/);
    const indexOfFirstFunction = source.indexOf('export function');

    expect(indexOfSet).toBeGreaterThan(-1);
    // The Set must be built at module scope — outside any function body.
    expect(indexOfSet).toBeLessThan(indexOfFirstFunction);
  });
});
