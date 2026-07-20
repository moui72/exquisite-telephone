/**
 * Dealing curated opening prompts.
 *
 * See datamodel.md Normalization Rules — Curated prompts. The deal shuffles
 * the bank *once* and partitions the result across players. Partitioning a
 * single shuffle, rather than sampling independently per player, is what makes
 * the no-phrase-reaches-two-players guarantee structural rather than a
 * retry-until-distinct loop.
 */

/** Injectable so tests are deterministic without stubbing global randomness. */
export type Shuffle = <T>(items: readonly T[]) => T[];

/** Fisher-Yates over a copy; never mutates its input. */
export const defaultShuffle: Shuffle = <T>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Deal each player a private hand of phrases from `bank`.
 *
 * The requested count is clamped to `floor(bank.length / playerIds.length)`
 * with a floor of 1, so a large room quietly gets fewer choices rather than
 * the deal throwing or repeating a phrase.
 *
 * The floor of 1 clamps the hand *size*; it does not promise every player a
 * phrase. When players outnumber the bank entirely, the partition serves as
 * many players as the bank allows and leaves the overflow with empty hands —
 * distinctness outranks coverage. Every player id is always present as a key,
 * so callers indexing `dealtPrompts[playerId]` never see `undefined`.
 */
export function dealPrompts(
  bank: readonly string[],
  playerIds: readonly string[],
  requestedCount: number,
  shuffle: Shuffle = defaultShuffle,
): Record<string, string[]> {
  const hands: Record<string, string[]> = {};
  if (playerIds.length === 0) return hands;

  const capacity = Math.floor(bank.length / playerIds.length);
  const effectiveCount = Math.max(1, Math.min(requestedCount, capacity));

  const shuffled = shuffle(bank);
  playerIds.forEach((playerId, index) => {
    hands[playerId] = shuffled.slice(index * effectiveCount, (index + 1) * effectiveCount);
  });

  return hands;
}
