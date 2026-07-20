import { describe, expect, it } from 'vitest';
import { dealPrompts } from './promptDeal.js';

/** Deterministic stand-in for a shuffle: returns the bank untouched. */
const identityShuffle = <T>(items: readonly T[]): T[] => [...items];

/** Deterministic non-trivial shuffle, so ordering assumptions can't sneak in. */
const reverseShuffle = <T>(items: readonly T[]): T[] => [...items].reverse();

function bankOf(size: number): string[] {
  return Array.from({ length: size }, (_, i) => `phrase-${i}`);
}

describe('dealPrompts (datamodel.md Normalization Rules — Curated prompts)', () => {
  it('deals every player exactly the requested count', () => {
    const hands = dealPrompts(bankOf(50), ['a', 'b', 'c'], 4, identityShuffle);

    expect(Object.keys(hands).sort()).toEqual(['a', 'b', 'c']);
    for (const id of ['a', 'b', 'c']) {
      expect(hands[id]).toHaveLength(4);
    }
  });

  it('never gives the same phrase to two players', () => {
    const hands = dealPrompts(bankOf(50), ['a', 'b', 'c', 'd'], 5, reverseShuffle);

    const all = Object.values(hands).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('clamps to floor(bankSize / playerCount) rather than throwing or repeating', () => {
    // 10 phrases, 3 players, host asked for 5 -> floor(10/3) = 3 each.
    const hands = dealPrompts(bankOf(10), ['a', 'b', 'c'], 5, identityShuffle);

    for (const id of ['a', 'b', 'c']) {
      expect(hands[id]).toHaveLength(3);
    }
    const all = Object.values(hands).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('floors the hand size at 1 when players outnumber the bank, serving as many as it can', () => {
    // The floor of 1 clamps the hand *size* -- it does not promise every
    // player a phrase. Distinctness outranks coverage (datamodel.md), so with
    // 5 players and 3 phrases the partition serves three players one phrase
    // each and leaves the overflow with empty hands rather than repeating.
    const playerIds = ['a', 'b', 'c', 'd', 'e'];
    const hands = dealPrompts(bankOf(3), playerIds, 2, identityShuffle);

    // Every player is a key, so downstream `dealtPrompts[playerId]` lookups
    // never see `undefined`.
    expect(Object.keys(hands).sort()).toEqual(playerIds);
    expect(hands['a']).toHaveLength(1);
    expect(hands['b']).toHaveLength(1);
    expect(hands['c']).toHaveLength(1);
    expect(hands['d']).toEqual([]);
    expect(hands['e']).toEqual([]);

    const all = Object.values(hands).flat();
    expect(all).toHaveLength(3);
    expect(new Set(all).size).toBe(3);
  });

  it('returns an empty record for no players', () => {
    expect(dealPrompts(bankOf(10), [], 3, identityShuffle)).toEqual({});
  });

  it('does not mutate the bank it was given', () => {
    const bank = bankOf(10);
    const snapshot = [...bank];
    dealPrompts(bank, ['a', 'b'], 2, reverseShuffle);
    expect(bank).toEqual(snapshot);
  });
});
