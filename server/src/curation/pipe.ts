import { mkdir, open, readdir, readFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sanitizeForDisplay } from '@exquisite-telephone/shared';
import {
  aggregateEvents,
  curationEventsDirFor,
  resolveEventPath,
  type CurationData,
  type RatingEvent,
} from '../domain/curationStore.js';
import type { Logger } from '../observability/logger.js';

/**
 * Reads the live event directory and folds it via the existing
 * `aggregateEvents` (no new fold logic — infrastructure.md Aggregation
 * Pipe). "Folded" means the file PARSED: it is incorporated and, later,
 * archived. A file that fails to parse is left live and never archived,
 * so a lost rating stays visible rather than being swept away.
 *
 * Note "folded" is parse-success, not "produced a candidate": a
 * player-written thumbs-down parses fine and contributes nothing to the
 * aggregate, yet is still folded and thus archivable.
 */
export async function readAndFoldEvents(
  eventsDir: string,
): Promise<{ data: CurationData; foldedNames: string[]; skippedNames: string[] }> {
  let names: string[];
  try {
    names = (await readdir(eventsDir)).filter((n) => n.endsWith('.json'));
  } catch {
    // No directory yet means no events yet — an empty aggregate.
    return { data: aggregateEvents([]), foldedNames: [], skippedNames: [] };
  }

  const events: RatingEvent[] = [];
  const foldedNames: string[] = [];
  const skippedNames: string[] = [];
  // Name order is timestamp order, so the fold sees events roughly in the
  // order they happened — `firstLoggedAt` then pins it exactly.
  for (const name of names.sort()) {
    try {
      const raw = await readFile(resolveEventPath(eventsDir, name), 'utf8');
      events.push(JSON.parse(raw) as RatingEvent);
      foldedNames.push(name);
    } catch {
      // Corrupt/unparseable: not folded, left in place.
      skippedNames.push(name);
    }
  }
  return { data: aggregateEvents(events), foldedNames, skippedNames };
}

/**
 * OUTPUT-ONLY display sanitization: returns a copy of the fold with each
 * `CandidatePhrase.phrase` passed through `sanitizeForDisplay`. The fold's
 * exact-text dedup key is NEVER sanitized (that already happened before
 * this point), so two candidates whose raw text differed only by a
 * stripped control char remain two distinct entries here. Counts,
 * `firstLoggedAt`, and the bank `ratings` map pass through unchanged.
 */
export function sanitizeCurationData(data: CurationData): CurationData {
  return {
    ratings: data.ratings,
    candidates: data.candidates.map((c) => ({ ...c, phrase: sanitizeForDisplay(c.phrase) })),
  };
}

/** The snapshot artifacts, all beside the configured `CURATION_DATA_PATH`. */
export function snapshotPaths(dataPath: string): { jsonPath: string; summaryPath: string } {
  const dir = dirname(dataPath);
  return {
    jsonPath: join(dir, 'curation-snapshot.json'),
    summaryPath: join(dir, 'curation-snapshot.summary.txt'),
  };
}

/** A curator-readable summary: ratings by net score, candidates by votes. */
export function buildSummary(data: CurationData, generatedAt: number): string {
  const ratings = Object.values(data.ratings)
    .map((r) => ({ ...r, net: r.up - r.down }))
    .sort((a, b) => b.net - a.net || b.up - a.up);
  const candidates = [...data.candidates].sort(
    (a, b) => b.votes - a.votes || a.firstLoggedAt - b.firstLoggedAt,
  );

  const lines: string[] = [];
  lines.push(`Curation snapshot — generated ${new Date(generatedAt).toISOString()}`);
  lines.push('');
  lines.push(`Bank ratings (${ratings.length}) by net score:`);
  for (const r of ratings) {
    lines.push(`  ${r.net >= 0 ? '+' : ''}${r.net}  (↑${r.up} ↓${r.down})  ${r.phrase}`);
  }
  lines.push('');
  lines.push(`Player-written candidates (${candidates.length}) by votes:`);
  for (const c of candidates) {
    lines.push(`  ↑${c.votes}  ${c.phrase}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Durable write: write to a temp file IN THE SAME DIRECTORY, fsync it,
 * then atomically `rename` it over the target. A crash leaves either the
 * old snapshot or the new one, never a torn file.
 */
export async function writeFileDurable(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  const handle = await open(tmp, 'wx');
  try {
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmp, path);
}

/**
 * Moves the folded event files out of the live dir into
 * `curation-events-archive/<snapshot-ts>/` via `rename` (same volume, so
 * the rename is atomic and cheap). Only folded (parsed) names are passed
 * in; corrupt/skipped files are never moved, so a lost rating stays
 * visible in the live dir. Draining the live dir is what lets the store
 * accept new ratings again (the `MAX_CURATION_EVENTS` remedy).
 *
 * Returns the archive directory, or `undefined` when nothing folded.
 */
export async function archiveFoldedEvents(
  eventsDir: string,
  foldedNames: string[],
  snapshotTs: number,
): Promise<string | undefined> {
  if (foldedNames.length === 0) return undefined;
  const archiveDir = join(dirname(eventsDir), 'curation-events-archive', String(snapshotTs));
  await mkdir(archiveDir, { recursive: true });
  for (const name of foldedNames) {
    // resolveEventPath re-validates the name shape before we touch it.
    await rename(resolveEventPath(eventsDir, name), join(archiveDir, name));
  }
  return archiveDir;
}

/**
 * The pipe entrypoint: fold the events under `dataPath`, sanitize
 * candidate text for display, and write the snapshot (JSON + readable
 * summary) durably. The archive step (Phase 3) runs after this.
 */
export async function runAggregatePipe(
  dataPath: string,
  deps: {
    logger: Logger;
    now?: () => number;
    /** Injectable durable writer — tests use it to force a snapshot-write failure. */
    writeFile?: (path: string, contents: string) => Promise<void>;
  },
): Promise<{
  jsonPath: string;
  summaryPath: string;
  foldedNames: string[];
  skippedNames: string[];
  archivedTo: string | undefined;
}> {
  const now = deps.now ?? Date.now;
  const writeFile = deps.writeFile ?? writeFileDurable;
  const generatedAt = now();
  const eventsDir = curationEventsDirFor(dataPath);

  const { data, foldedNames, skippedNames } = await readAndFoldEvents(eventsDir);
  const snapshot = sanitizeCurationData(data);
  const { jsonPath, summaryPath } = snapshotPaths(dataPath);

  // Snapshot FIRST — a write failure here throws before any event is
  // moved, leaving the live event dir untouched (infrastructure.md
  // Aggregation Pipe — snapshot durably first, then archive).
  await writeFile(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeFile(summaryPath, buildSummary(snapshot, generatedAt));

  // Only AFTER the snapshot is durable: move the folded events aside,
  // draining the live dir below the cap. `generatedAt` names the archive
  // subdir so it correlates with the snapshot it was taken from.
  const archivedTo = await archiveFoldedEvents(eventsDir, foldedNames, generatedAt);

  deps.logger.log({
    event: 'curation_pipe_snapshot',
    outcome: 'success',
    path: jsonPath,
    folded: foldedNames.length,
    skipped: skippedNames.length,
    archivedTo: archivedTo ?? null,
  });

  return { jsonPath, summaryPath, foldedNames, skippedNames, archivedTo };
}

export type { CurationData, RatingEvent };
