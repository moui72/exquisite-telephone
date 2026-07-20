import type { CandidatePhrase, PromptRating, PromptRatingValue } from '@exquisite-telephone/shared';
import type { Logger } from '../observability/logger.js';

/**
 * The on-disk shape of the curation file, mirrored exactly by the
 * store's in-memory state so there is no mapping layer between them.
 */
export interface CurationData {
  /** Keyed by verbatim bank phrase. */
  ratings: Record<string, PromptRating>;
  candidates: CandidatePhrase[];
}

export interface CurationStore {
  /** The current in-memory state — the same shape written to disk. */
  snapshot(): CurationData;
  recordRating(phrase: string, value: PromptRatingValue, isBankPhrase: boolean): void;
  /** Write immediately, bypassing the debounce timer. */
  flush(): Promise<void>;
}

/**
 * The Curation Store (infrastructure.md Curation Store) — the one place
 * in this app that writes to disk. Not implemented yet; T005 lands the
 * load behavior T004's tests describe.
 */
export function createCurationStore(_path: string, _logger: Logger): CurationStore {
  throw new Error('createCurationStore: not implemented');
}
