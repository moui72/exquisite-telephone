import type { CandidatePhrase, PromptRating } from '@exquisite-telephone/shared';
import type { CurationData } from '../domain/curationStore.js';

/**
 * PRODUCTION ANNOTATION — RECOMMEND-ONLY, HUMAN-IN-THE-LOOP.
 *
 * Everything in this module is deterministic maintainer tooling that the
 * ingestion skill invokes during curation (infrastructure.md Curation
 * Store — Ingestion Skill; constitution Project Scope). It reads the
 * pipe's snapshot and keeps a durable review ledger + a separate
 * offensive-quarantine file. It is READ-ONLY with respect to the deck:
 * nothing here writes `shared/src/phraseBank.ts`, and nothing here issues
 * a `fly` command. It can only ever PROPOSE add/remove changes for a human
 * to apply — the injection safety boundary the curation design rests on
 * (a successful prompt-injection in candidate text degrades to at worst a
 * rejected recommendation). Do not add a deck-write or a mutating-`fly`
 * capability to this module or its callers.
 */

/**
 * CurationLedger entry (datamodel.md CurationLedger): one per
 * player-written candidate that has been logged but is not yet in
 * `CURATED_PHRASE_BANK`. A durable review record so a pass reviews only
 * genuinely new material. Gitignored volume artifact — never committed.
 */
export interface LedgerEntry {
  /** Verbatim player-written text; the match key. Never normalized. */
  phrase: string;
  /** Refreshed from the latest snapshot on each reconcile. */
  votes: number;
  /** Epoch ms first seen; preserved across reconciles. */
  firstSeenAt: number;
  disposition: 'pending' | 'rejected' | 'promoted';
}

/**
 * Reconciles a prior ledger against a fresh snapshot, matching by EXACT
 * text (datamodel.md — near-miss wordings stay distinct):
 * - a candidate now in `CURATED_PHRASE_BANK` is promoted and DROPS OUT of
 *   the active ledger (returned separately for the report);
 * - an existing entry keeps its disposition, with votes refreshed;
 * - a candidate absent from the prior ledger is appended `pending` ("new").
 */
export function reconcileLedger(
  prior: readonly LedgerEntry[],
  snapshot: CurationData,
  bank: readonly string[],
): { ledger: LedgerEntry[]; promoted: LedgerEntry[] } {
  void prior;
  void snapshot;
  void bank;
  throw new Error('reconcileLedger not implemented');
}

export type { CandidatePhrase, PromptRating };
