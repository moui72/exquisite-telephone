import { CURATED_PHRASE_BANK } from '@exquisite-telephone/shared';

/**
 * Built once at module load rather than per call: the bank is a fixed,
 * compile-time constant, so rebuilding this on every submission would be
 * pure waste.
 */
const CURATED_PHRASE_SET = new Set<string>(CURATED_PHRASE_BANK);

/**
 * Resolves a book's opening phrase to its origin, authoritatively and
 * server-side — a client claim about where a phrase came from is never
 * trusted (datamodel.md Normalization Rules — Prompt rating).
 *
 * Deliberately a pure set-membership test, with no reference to
 * `Room.promptMode`. Mode only correlates with origin, it does not
 * determine it: a free-form player may type a phrase the bank already
 * holds, and a curated player may write in one it does not. Because the
 * test is on text alone, a player-WRITTEN phrase that coincidentally
 * equals a bank entry resolves as a BANK phrase — the two are
 * indistinguishable by text, and the bank tally is the more useful
 * destination.
 *
 * Matching is exact: no trimming, no case folding. The bank's text is
 * what a player was actually shown.
 */
export function isBankPhrase(phrase: string): boolean {
  return CURATED_PHRASE_SET.has(phrase);
}
