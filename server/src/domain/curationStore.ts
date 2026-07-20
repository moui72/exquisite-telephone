import { readFileSync } from 'node:fs';
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

function emptyData(): CurationData {
  return { ratings: {}, candidates: [] };
}

/**
 * Reads the curation file, degrading to an empty store on anything
 * unexpected. Deliberately total: a missing, unreadable, corrupt, or
 * structurally wrong file all yield an empty store rather than a throw,
 * because the game does not depend on this data and refusing to boot
 * over it would trade a curation gap for an outage (constitution
 * Principle IX — the failure is logged, not swallowed silently).
 */
function loadData(path: string, logger: Logger): CurationData {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      logger.log({
        event: 'curation_store_load',
        outcome: 'failure',
        path,
        reason: 'unreadable',
        code,
      });
    }
    // A missing file is the normal first-run case, not a failure.
    return emptyData();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('curation file is not an object');
    }
    const { ratings, candidates } = parsed as Partial<CurationData>;
    return {
      ratings: ratings && typeof ratings === 'object' ? { ...ratings } : {},
      candidates: Array.isArray(candidates) ? [...candidates] : [],
    };
  } catch (error) {
    logger.log({
      event: 'curation_store_load',
      outcome: 'failure',
      path,
      reason: 'unparseable',
      message: error instanceof Error ? error.message : String(error),
    });
    return emptyData();
  }
}

export interface CurationStoreOptions {
  /** Injectable clock, so `firstLoggedAt` is assertable in tests. */
  now?: () => number;
}

/**
 * The Curation Store (infrastructure.md Curation Store) — the one place
 * in this app that writes to disk, and the only state that survives a
 * restart. Game state deliberately stays in memory (datamodel.md
 * Overview); nothing here touches Room, Player, Book, or Entry.
 *
 * Loads synchronously at construction: the file is small, this runs once
 * at boot, and a synchronous read keeps the store usable the instant it
 * is constructed rather than forcing every caller through a ready-check.
 */
export function createCurationStore(
  path: string,
  logger: Logger,
  options: CurationStoreOptions = {},
): CurationStore {
  const data = loadData(path, logger);
  const now = options.now ?? Date.now;

  return {
    snapshot() {
      return data;
    },
    recordRating(phrase: string, value: PromptRatingValue, isBankPhrase: boolean) {
      if (isBankPhrase) {
        const existing = data.ratings[phrase] ?? { phrase, up: 0, down: 0 };
        data.ratings[phrase] = {
          ...existing,
          [value]: existing[value] + 1,
        };
        return;
      }

      // Player-written. Upsert by EXACT text -- never normalized or
      // lowercased, because the curator wants to see exactly what was
      // typed (datamodel.md CandidatePhrase). Near-miss wordings are
      // therefore separate records, deliberately.
      const candidate = data.candidates.find((c) => c.phrase === phrase);
      if (candidate) {
        candidate.votes += 1;
        return;
      }
      data.candidates.push({ phrase, votes: 1, firstLoggedAt: now() });
    },
    flush() {
      throw new Error('createCurationStore.flush: not implemented');
    },
  };
}
