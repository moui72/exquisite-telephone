import type { Book, EntryType, Room } from './types.js';

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
 * Computes the next Entry due on `book`, or null when the book is
 * complete (every player has contributed once) or when it has already
 * moved ahead of the room-wide current round and must wait for the rest
 * of the room to catch up (round-gating).
 */
export function computeNextEntry(room: Room, book: Book): NextEntry | null {
  const position = book.entries.length;
  const laps = room.lapsPerBook ?? defaultLapsPerBook(room.players.length);
  if (position >= room.players.length * laps) {
    return null;
  }
  if (position > currentRoundFor(room)) {
    return null;
  }

  const originIndex = room.players.findIndex((p) => p.id === book.originAuthorId);
  const authorIndex = (originIndex + position) % room.players.length;
  const author = room.players[authorIndex];

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
