import type { CurationData, RatingEvent } from '../domain/curationStore.js';

/**
 * The consolidated aggregation snapshot the pipe reads out and the
 * ingestion skill later consumes. Same shape as the in-process
 * `CurationData` fold, but every `CandidatePhrase.phrase` has been
 * display-sanitized (datamodel.md Consolidated view sanitization).
 */
export interface CurationSnapshot {
  data: CurationData;
  /** Event file names that folded (parsed successfully). */
  foldedNames: string[];
  /** Event file names left live because they could not be parsed. */
  skippedNames: string[];
}

/**
 * Reads the live event directory and folds it via the existing
 * `aggregateEvents` (no new fold logic — infrastructure.md Aggregation
 * Pipe). "Folded" means the file parsed: it is counted and, later,
 * archived. A file that fails to parse is left live and never archived,
 * so a lost rating stays visible rather than being swept away.
 */
export function readAndFoldEvents(
  eventsDir: string,
): Promise<{ data: CurationData; foldedNames: string[]; skippedNames: string[] }> {
  void eventsDir;
  throw new Error('readAndFoldEvents not implemented');
}

/**
 * OUTPUT-ONLY display sanitization: returns a copy of the fold with each
 * `CandidatePhrase.phrase` passed through `sanitizeForDisplay`. The fold's
 * exact-text dedup key is NEVER sanitized (that already happened before
 * this point), so two candidates whose raw text differed only by a
 * stripped control char remain two distinct entries here.
 */
export function sanitizeCurationData(data: CurationData): CurationData {
  void data;
  throw new Error('sanitizeCurationData not implemented');
}

export type { RatingEvent };
