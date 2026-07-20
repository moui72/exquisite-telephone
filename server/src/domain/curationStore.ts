import { randomUUID } from 'node:crypto';
import { mkdir, open, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import type { CandidatePhrase, PromptRating, PromptRatingValue } from '@exquisite-telephone/shared';
import type { Logger } from '../observability/logger.js';

/**
 * The persisted record (datamodel.md Persisted Entities — RatingEvent):
 * one per rating cast, written to its own file exactly once and never
 * mutated. Carries no rater or author attribution, by design.
 */
export interface RatingEvent {
  phrase: string;
  value: PromptRatingValue;
  origin: 'bank' | 'player-written';
  ratedAt: number;
}

/**
 * The DERIVED aggregate view a curator reads — no longer the on-disk
 * shape. Produced by folding the event log at read time.
 */
export interface CurationData {
  /** Keyed by verbatim bank phrase. */
  ratings: Record<string, PromptRating>;
  candidates: CandidatePhrase[];
}

export interface CurationStore {
  /**
   * Appends one rating event. Fire-and-forget by design: a game turn
   * calls this and must never wait on, or fail because of, disk I/O.
   */
  recordRating(phrase: string, value: PromptRatingValue, isBankPhrase: boolean): void;
  /** Folds the event log into the aggregate view. On demand only — see below. */
  aggregate(): Promise<CurationData>;
  /** Resolves once every write issued so far has settled. Test seam only. */
  settled(): Promise<void>;
}

/**
 * The event directory, derived from the single configured
 * `CURATION_DATA_PATH` knob (infrastructure.md Curation Store —
 * Location) so the deployment surface stays one env var per channel and
 * both Fly configs keep the value they already declare.
 */
export function curationEventsDirFor(dataPath: string): string {
  return join(dirname(dataPath), 'curation-events');
}

/**
 * OPEN QUESTION 2 — what bounds event accumulation: count, bytes, or age?
 *
 * RESOLVED: COUNT.
 *
 * Bytes bound the actual risk, but `Entry.content` is ALREADY byte-bounded
 * at the submission boundary (shared/src/entryLimits.ts,
 * MAX_TEXT_ENTRY_BYTES = 610), so every event file has a hard worst-case
 * size of ~800 bytes: a 610-byte phrase plus fixed metadata. That makes a
 * count bound a byte bound too, without a second accounting mechanism —
 * so count is chosen because it is simplest AND sufficient, not merely
 * simplest. Age was rejected: it would silently delete a curator's
 * evidence on a schedule nobody is watching, which is worse than
 * declining to add more.
 *
 * The number: the Fly volume is 1GB. Budgeting 5% of it to curation
 * (50 MiB = 52,428,800 bytes) at the ~800-byte worst case gives
 * 52,428,800 / 800 = 65,536 events. The power of two is a coincidence of
 * the arithmetic, not the reason for the choice.
 */
export const MAX_CURATION_EVENTS = 65_536;

/**
 * T011 — the file name is composed ONLY of server-controlled values: the
 * timestamp and a random UUID. `phrase` is accepted so the signature
 * documents that the phrase is DELIBERATELY IGNORED here, and so a test
 * can assert that no part of the name derives from it.
 *
 * A sanitized slug of the phrase is the tempting shape and the wrong one:
 * it puts attacker-influenced bytes into a filesystem path for no benefit
 * the timestamp does not already provide. Player text belongs in the
 * file's contents, where it is inert.
 *
 * `randomUUID` comes from `node:crypto` — no new dependency.
 */
export function generateEventFilename(timestamp: number, phrase: string): string {
  void phrase; // Intentionally unused. See above; do not "improve" this.
  return `${timestamp}-${randomUUID()}.json`;
}

/**
 * T012 — refuses any target that resolves outside `eventsDir`.
 *
 * This is REDUNDANT against `generateEventFilename` BY DESIGN (plan
 * Complexity Tracking): the generated names are safe today, and this
 * guard is what stops a FUTURE change to the naming scheme from silently
 * reintroducing path traversal. Do not remove it as duplication.
 */
export function resolveEventPath(eventsDir: string, filename: string): string {
  // Whitelist the shape a generated name has: one flat segment of
  // timestamp, hex, hyphens, ending in `.json`. A blacklist would be the
  // weaker choice here -- note that `..\..\x`, `%2e%2e/x` and `....//x`
  // do NOT escape via `resolve()` on POSIX (they are merely odd literal
  // names), so a resolve-only check would silently ACCEPT them and let
  // encoded or Windows-shaped traversal land as real files. Refusing
  // anything that is not a plain generated name closes that off on every
  // platform.
  if (!/^[0-9]+-[0-9a-fA-F-]+\.json$/.test(filename)) {
    throw new Error(`curation event filename is not a generated name: ${filename}`);
  }

  const base = resolve(eventsDir);
  const target = resolve(base, filename);
  // Belt and braces: even a name that passed the pattern above must land
  // inside the directory. This is the guard that survives a future change
  // to the naming scheme (plan Complexity Tracking).
  if (target === base || !target.startsWith(base + sep)) {
    throw new Error(`curation event path escapes its directory: ${filename}`);
  }
  return target;
}

/**
 * The read-time fold: events in, aggregate view out. Pure — it does no
 * I/O, so the aggregation semantics are testable without a filesystem.
 */
export function aggregateEvents(events: readonly RatingEvent[]): CurationData {
  const ratings: Record<string, PromptRating> = {};
  const candidates: CandidatePhrase[] = [];

  for (const event of events) {
    if (event.origin === 'bank') {
      const existing = ratings[event.phrase] ?? { phrase: event.phrase, up: 0, down: 0 };
      ratings[event.phrase] = { ...existing, [event.value]: existing[event.value] + 1 };
      continue;
    }

    // Player-written thumbs-down is never written in the first place
    // (see recordRating); this is belt-and-braces for a hand-placed file.
    if (event.value === 'down') continue;

    // Upsert by EXACT text -- never normalized or lowercased, because the
    // curator wants to see exactly what was typed (datamodel.md
    // CandidatePhrase). Near-miss wordings stay separate, deliberately.
    const candidate = candidates.find((c) => c.phrase === event.phrase);
    if (candidate) {
      candidate.votes += 1;
      // Events fold in name order, which is timestamp order, but a clock
      // skew or a hand-placed file must not move this backwards.
      candidate.firstLoggedAt = Math.min(candidate.firstLoggedAt, event.ratedAt);
      continue;
    }
    candidates.push({ phrase: event.phrase, votes: 1, firstLoggedAt: event.ratedAt });
  }

  return { ratings, candidates };
}

export interface CurationStoreOptions {
  /** Injectable clock, so `ratedAt` is assertable in tests. */
  now?: () => number;
  /** Override the accumulation bound. Tests only; production uses the default. */
  maxEvents?: number;
}

/**
 * The Curation Store (infrastructure.md Curation Store) — the one place
 * in this app that writes to disk. Append-only: one immutable file per
 * rating event, created exactly once, never read-modify-written. Game
 * state deliberately stays in memory (datamodel.md Overview); nothing
 * here touches Room, Player, Book, or Entry.
 *
 * OPEN QUESTION 3 — does aggregation run at server boot or on demand?
 *
 * RESOLVED: ON DEMAND ONLY. Construction performs NO I/O whatsoever — it
 * does not read the event directory, does not create it, and does not
 * fold anything. Nothing in the running game reads the aggregate, so
 * folding at boot would be pure startup cost for zero benefit, and it
 * would grow linearly with accumulated events, making boot slower the
 * longer the app runs. It also keeps the door open for the backlogged
 * `curation-data-aggregation-pipe` to be the aggregate's only reader.
 * The store is usable the instant it is constructed.
 */
export function createCurationStore(
  path: string,
  logger: Logger,
  options: CurationStoreOptions = {},
): CurationStore {
  const now = options.now ?? Date.now;
  const maxEvents = options.maxEvents ?? MAX_CURATION_EVENTS;
  const eventsDir = curationEventsDirFor(path);

  /**
   * Tracks in-flight writes so tests can await quiescence. Callers in the
   * game path never await this -- that is the point of the
   * fire-and-forget shape.
   */
  const pending = new Set<Promise<void>>();

  /** Serializes appends so the accumulation bound cannot be raced. */
  let queue: Promise<void> = Promise.resolve();

  /**
   * Live event count, seeded ONCE by counting the directory on first
   * write (so a restart does not reset the bound) and incremented from
   * there -- rather than a `readdir` on every single rating.
   */
  let count: number | undefined;
  let reportedFull = false;

  async function currentCount(): Promise<number> {
    if (count === undefined) {
      try {
        count = (await readdir(eventsDir)).length;
      } catch {
        // Missing directory is the normal first-run case: zero events.
        count = 0;
      }
    }
    return count;
  }

  async function appendEvent(event: RatingEvent): Promise<void> {
    try {
      if ((await currentCount()) >= maxEvents) {
        // PRODUCTION ANNOTATION -- Curation events are DROPPED at the
        // limit, not rotated. Once MAX_CURATION_EVENTS files exist, every
        // subsequent rating is discarded: the store stops accepting new
        // evidence and never deletes old evidence, so what a curator has
        // is the FIRST 65,536 ratings, not the most recent ones. This is
        // a deliberate shortcut for an app whose curation data is read by
        // one human every few weeks and has never yet run in production.
        // In production this would need either eviction with a retention
        // policy, or the backlogged `curation-data-aggregation-pipe`
        // draining and truncating the log on a schedule. It is logged
        // once per process so it is visible when it happens rather than
        // discovered later as mysteriously absent data.
        //
        // FAIL SAFELY (plan Open Question 2): refuse the write, log once,
        // return normally. The game turn that triggered this has already
        // succeeded and must never learn that curation is full.
        if (!reportedFull) {
          reportedFull = true;
          logger.log({
            event: 'curation_store_full',
            outcome: 'failure',
            path: eventsDir,
            reason: 'max-events-reached',
            maxEvents,
          });
        }
        return;
      }

      await mkdir(eventsDir, { recursive: true });
      // The filename's timestamp exists for ORDERING only -- it is not
      // the rating time. `event.ratedAt` is the rating time, and the fold
      // reads that, never the name.
      const target = resolveEventPath(eventsDir, generateEventFilename(now(), event.phrase));
      // 'wx' -- EXCLUSIVE create. Never opens an existing file, so an
      // event can never be overwritten or partially rewritten, and a name
      // collision fails loudly here rather than silently losing a rating.
      const handle = await open(target, 'wx');
      try {
        await handle.writeFile(JSON.stringify(event), 'utf8');
      } finally {
        await handle.close();
      }
      count = (count ?? 0) + 1;
    } catch (error) {
      // Never throw: losing curation telemetry must not take down a game
      // in progress (Principle IX -- logged, not swallowed silently).
      logger.log({
        event: 'curation_store_write',
        outcome: 'failure',
        path: eventsDir,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    recordRating(phrase: string, value: PromptRatingValue, isBankPhrase: boolean) {
      // Player-written and thumbs-DOWN: record NOTHING, anywhere. Not a
      // zero-vote candidate, not a placeholder -- nothing. The phrase
      // isn't in the bank so there is no tally to decrement, and
      // "someone disliked this player's writing" serves no curator
      // purpose (datamodel.md CandidatePhrase -- there is no negative
      // counterpart). Accepted and discarded, never rejected. Filtered
      // HERE rather than during the fold, so it never reaches disk.
      if (!isBankPhrase && value === 'down') return;

      const event: RatingEvent = {
        phrase,
        value,
        origin: isBankPhrase ? 'bank' : 'player-written',
        ratedAt: now(),
      };
      // SERIALIZED, not fired in parallel. Each append must observe the
      // count left by the previous one, or a burst of ratings all pass
      // the limit check together and overshoot the bound. Chaining also
      // keeps file names in the order events actually happened.
      queue = queue.then(() => appendEvent(event));
      const write = queue.finally(() => pending.delete(write));
      pending.add(write);
    },

    async aggregate() {
      let names: string[];
      try {
        names = (await readdir(eventsDir)).filter((n) => n.endsWith('.json'));
      } catch {
        // No directory yet means no events yet -- an empty aggregate, not
        // a failure. Nothing about curation is ever fatal.
        return aggregateEvents([]);
      }

      const events: RatingEvent[] = [];
      // Name order is timestamp order, so the fold sees events roughly in
      // the order they happened -- which `firstLoggedAt` then pins exactly.
      for (const name of names.sort()) {
        try {
          const raw = await readFile(resolveEventPath(eventsDir, name), 'utf8');
          events.push(JSON.parse(raw) as RatingEvent);
        } catch (error) {
          // The crash case append-only accepts BY CONSTRUCTION: at worst
          // one partial trailing file, costing exactly one rating. Skip it
          // with a warning rather than failing the whole fold.
          logger.log({
            event: 'curation_event_skipped',
            outcome: 'failure',
            path: name,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return aggregateEvents(events);
    },

    async settled() {
      await Promise.all([...pending]);
    },
  };
}
