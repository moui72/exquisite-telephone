import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CandidatePhrase, PromptRating } from '@exquisite-telephone/shared';
import type { CurationData } from '../domain/curationStore.js';
import { snapshotPaths } from './pipe.js';

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
  const priorByPhrase = new Map(prior.map((e) => [e.phrase, e]));
  const bankSet = new Set(bank);
  const ledger: LedgerEntry[] = [];
  const promoted: LedgerEntry[] = [];

  for (const candidate of snapshot.candidates) {
    const existing = priorByPhrase.get(candidate.phrase);

    if (bankSet.has(candidate.phrase)) {
      // Now in the deck: promoted, and it drops out of the active ledger.
      promoted.push({
        phrase: candidate.phrase,
        votes: candidate.votes,
        firstSeenAt: existing?.firstSeenAt ?? candidate.firstLoggedAt,
        disposition: 'promoted',
      });
      continue;
    }

    if (existing) {
      // Carry the prior disposition and firstSeenAt; refresh votes.
      ledger.push({ ...existing, votes: candidate.votes });
      continue;
    }

    // "New" = absent from the prior ledger.
    ledger.push({
      phrase: candidate.phrase,
      votes: candidate.votes,
      firstSeenAt: candidate.firstLoggedAt,
      disposition: 'pending',
    });
  }

  return { ledger, promoted };
}

/**
 * Deterministic count thresholds (plan Open Question — Removal threshold).
 * These are fixed so the LLM judges only borderline ADDITIONS, never the
 * arithmetic. The values are a judgement call for a low-traffic app whose
 * curation data one human reads every few weeks, not an empirical cutoff:
 *
 * - A bank phrase is a removal candidate only once it has been rated at
 *   least `REMOVAL_MIN_SAMPLE` times AND at least `REMOVAL_DOWN_RATIO` of
 *   those ratings are thumbs-down — a down-heavy majority on real sample,
 *   so a couple of early dislikes never flag a phrase.
 * - A player-written candidate is an addition candidate once it reaches
 *   `ADDITION_MIN_VOTES` distinct thumbs-up — enough signal to be worth a
 *   human's `PROMPT_CRITERIA.md` judgement, which is the actual gate.
 */
export const REMOVAL_MIN_SAMPLE = 20;
export const REMOVAL_DOWN_RATIO = 0.6;
export const ADDITION_MIN_VOTES = 3;

/**
 * Deterministic count analysis: down-heavy bank phrases over the sample
 * floor are removal candidates; strong-vote player candidates are addition
 * candidates. RECOMMENDATIONS ONLY — the human (and, for additions, the
 * `PROMPT_CRITERIA.md` judgement) decides; nothing here edits the deck.
 */
export function analyzeCounts(snapshot: CurationData): {
  removalCandidates: PromptRating[];
  additionCandidates: CandidatePhrase[];
} {
  void snapshot;
  throw new Error('analyzeCounts not implemented');
}

/**
 * Offensive-quarantine plumbing (datamodel.md OffensiveQuarantine): given
 * the phrases the skill flagged offensive, route those entries to the
 * SEPARATE quarantine file and keep the rest in the main ledger. Kept
 * deterministic; the offensiveness judgement itself is the skill's.
 */
export function partitionOffensive(
  entries: readonly LedgerEntry[],
  offensivePhrases: ReadonlySet<string>,
): { ledger: LedgerEntry[]; quarantine: LedgerEntry[] } {
  void entries;
  void offensivePhrases;
  throw new Error('partitionOffensive not implemented');
}

/** The ledger + quarantine files, beside `CURATION_DATA_PATH` on the volume. */
export function ledgerPaths(dataPath: string): { ledgerPath: string; quarantinePath: string } {
  const dir = dirname(dataPath);
  return {
    ledgerPath: join(dir, 'curation-ledger.json'),
    quarantinePath: join(dir, 'curation-quarantine.json'),
  };
}

/**
 * READ-ONLY ingest of the pipe's snapshot (the candidate text is already
 * display-sanitized by the pipe). Missing file → an empty aggregate; the
 * helper never writes the snapshot, only reads it.
 */
export async function readSnapshot(dataPath: string): Promise<CurationData> {
  const { jsonPath } = snapshotPaths(dataPath);
  try {
    return JSON.parse(await readFile(jsonPath, 'utf8')) as CurationData;
  } catch {
    return { ratings: {}, candidates: [] };
  }
}

/** Reads the durable ledger (missing file → empty ledger). */
export async function readLedger(path: string): Promise<LedgerEntry[]> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as LedgerEntry[];
  } catch {
    return [];
  }
}

/** Persists the reconciled ledger back to the volume (gitignored). */
export async function writeLedger(path: string, entries: readonly LedgerEntry[]): Promise<void> {
  await writeFile(path, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

export type { CandidatePhrase, PromptRating };
