import type { Book, EntryType, Player, Room } from './types.js';

/**
 * The players who still participate in turn rotation: everyone in
 * `Room.players` who hasn't been kicked (see datamodel.md Player.kicked).
 * The single source of truth for "who counts" — turn assignment,
 * completion math, timeout-vote membership, and roster rendering all
 * derive from this rather than filtering `room.players` ad hoc, so a
 * kicked player is excluded consistently. Preserves roster order.
 */
export function activePlayers(room: Room): Player[] {
  return room.players.filter((p) => !p.kicked);
}

/**
 * The next Entry a Book needs, computed from Room.players order and the
 * book's originAuthorId (the "pass the folded paper" round-robin
 * mechanic — see ui.md Writing/Drawing View). Shared between server
 * (authoritative validation) and client (knowing whose turn it is)
 * so the round-robin rule has a single source of truth.
 */
export interface NextEntry {
  authorId: string;
  type: EntryType;
  position: number;
}

export interface NextEntryForBook extends NextEntry {
  bookId: string;
}

function entryTypeForPosition(position: number): EntryType {
  return position % 2 === 0 ? 'text' : 'drawing';
}

/**
 * The default number of full rotations through the room each book
 * completes before the game ends, derived from live player count
 * (datamodel.md Normalization Rules — Laps per book): 2 when fewer
 * than 5 players, 1 otherwise. Used both by the client (to display the
 * live default while `Room.lapsPerBook` is `null`) and by the server
 * (to resolve a concrete value at `onStartGame`, and as the fallback
 * in `computeNextEntry`'s completion check before that resolution
 * happens).
 */
export function defaultLapsPerBook(playerCount: number): 1 | 2 {
  return playerCount < 5 ? 2 : 1;
}

/**
 * The room-wide current round: the minimum `entries.length` across all
 * of `Room.books`. Turns are round-gated, not asynchronous (datamodel.md
 * Normalization Rules, reversed 2026-07-14 per feedback F001) — a book
 * ahead of this round waits rather than being assigned its next entry,
 * so no book runs further ahead of the rest of the room. Purely derived
 * from existing state (constitution Principle VI), not persisted.
 */
export function currentRoundFor(room: Room): number {
  if (room.books.length === 0) {
    return 0;
  }
  return Math.min(...room.books.map((b) => b.entries.length));
}

/**
 * Whether `book` has received every entry it will ever get: no active
 * players remain, or its entry count has reached the round-robin total
 * of `activeCount * laps`. The single definition of "book complete" —
 * `computeNextEntry`'s completion branch and the server's submit guard
 * both call this so the boundary can't drift (the old server guard used
 * `entries.length >= players.length`, which ignored laps and kicks;
 * defect d27f4eea). `activeCount` and `laps` resolve exactly as in
 * `computeNextEntry`: active roster count, and `Room.lapsPerBook` with
 * `defaultLapsPerBook(activeCount)` as the pre-resolution fallback.
 */
export function isBookComplete(room: Room, book: Book): boolean {
  const activeCount = activePlayers(room).length;
  const laps = room.lapsPerBook ?? defaultLapsPerBook(activeCount);
  // Round-robin runs over the *active* roster, so completion is reached
  // after activeCount * laps entries — a kicked player's slot is never
  // assigned and must not strand the book (restart continuability fix).
  return activeCount === 0 || book.entries.length >= activeCount * laps;
}

/**
 * Computes the next Entry due on `book`, or null when the book is
 * complete (every player has contributed once) or when it has already
 * moved ahead of the room-wide current round and must wait for the rest
 * of the room to catch up (round-gating).
 */
export function computeNextEntry(room: Room, book: Book): NextEntry | null {
  const active = activePlayers(room);
  const activeCount = active.length;
  const position = book.entries.length;
  if (isBookComplete(room, book)) {
    return null;
  }
  if (position > currentRoundFor(room)) {
    return null;
  }

  const originIndex = active.findIndex((p) => p.id === book.originAuthorId);
  // The origin author was kicked (post-kick, pre-restart book): no active
  // slot to rotate from, so the book has no next entry.
  if (originIndex === -1) {
    return null;
  }
  const authorIndex = (originIndex + position) % activeCount;
  const author = active[authorIndex];

  return {
    authorId: author!.id,
    type: entryTypeForPosition(position),
    position,
  };
}

/**
 * Computes the next Entry for every book in the room that isn't yet
 * complete (constitution Principle VI — a pure computation over the
 * server's authoritative Room state, no hidden side state).
 */
export function computeNextEntries(room: Room): NextEntryForBook[] {
  return room.books.flatMap((book) => {
    const next = computeNextEntry(room, book);
    return next ? [{ bookId: book.id, ...next }] : [];
  });
}
