import { randomUUID } from 'node:crypto';
import { computeNextEntries, type Entry, type Room, type TimeoutVoteChoice } from '@exquisite-telephone/shared';

/**
 * Pure turn-timer sweep logic (infrastructure.md Turn Timer Sweep,
 * datamodel.md Normalization Rules — Turn timer): opening/resolving a
 * `Room.pendingTimeoutVote` when a round's timer has expired with
 * players still short of their deadline. Kept free of any Socket.IO or
 * interval-scheduling concern (constitution Principle X) — the caller
 * (`startTimerSweep`, wired from `server/src/index.ts`) is responsible
 * for periodically invoking `sweepRoom` and broadcasting the result.
 */

const FULL_TURN_MS = (room: Room): number => (room.turnTimerMinutes ?? 0) * 60_000;
const FIFTEEN_MINUTES_MS = 15 * 60_000;

/** Most lenient first — used both to rank plurality winners and to break ties. */
const CHOICE_PREFERENCE_ORDER: TimeoutVoteChoice[] = ['full', 'half', '15m', 'force-empty'];

function winningChoice(votes: Record<string, TimeoutVoteChoice>): TimeoutVoteChoice {
  const castChoices = Object.values(votes);
  if (castChoices.length === 0) {
    // No votes cast by the deadline: guarantees the round can never
    // deadlock (datamodel.md Normalization Rules).
    return 'force-empty';
  }

  const counts = new Map<TimeoutVoteChoice, number>();
  for (const choice of castChoices) {
    counts.set(choice, (counts.get(choice) ?? 0) + 1);
  }

  let best: TimeoutVoteChoice = 'force-empty';
  let bestCount = -1;
  for (const choice of CHOICE_PREFERENCE_ORDER) {
    const count = counts.get(choice) ?? 0;
    // Strictly greater, not >=: ties fall through to the earlier
    // (more lenient) choice already selected as `best`.
    if (count > bestCount) {
      best = choice;
      bestCount = count;
    }
  }
  return best;
}

function extensionMsFor(choice: 'full' | 'half' | '15m', room: Room): number {
  switch (choice) {
    case 'full':
      return FULL_TURN_MS(room);
    case 'half':
      return FULL_TURN_MS(room) / 2;
    case '15m':
      return FIFTEEN_MINUTES_MS;
  }
}

/**
 * Resolves an open `Room.pendingTimeoutVote` (by plurality of votes
 * cast, tie-broken toward the most lenient option) and clears it.
 * `full`/`half`/`15m` extend `Room.timerExtensions` for the stalled
 * players only; `force-empty` auto-submits an empty `Entry` for each
 * stalled player's currently-due book/position.
 */
export function resolveTimeoutVote(room: Room, _now: number): void {
  const vote = room.pendingTimeoutVote;
  if (!vote) {
    return;
  }

  const choice = winningChoice(vote.votes);

  if (choice === 'force-empty') {
    const nextEntries = computeNextEntries(room);
    for (const playerId of vote.stalledPlayerIds) {
      const next = nextEntries.find((e) => e.authorId === playerId);
      if (!next) {
        continue;
      }
      const book = room.books.find((b) => b.id === next.bookId);
      if (!book) {
        continue;
      }
      const entry: Entry = {
        id: randomUUID(),
        bookId: book.id,
        authorId: playerId,
        position: next.position,
        type: next.type,
        content: '',
        emptyByTimeout: true,
      };
      book.entries.push(entry);
    }
  } else {
    const extensionMs = extensionMsFor(choice, room);
    for (const playerId of vote.stalledPlayerIds) {
      room.timerExtensions[playerId] = (room.timerExtensions[playerId] ?? 0) + extensionMs;
    }
  }

  room.pendingTimeoutVote = null;
}
