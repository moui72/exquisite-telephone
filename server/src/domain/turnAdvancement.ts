import type { Book, EntryType, Room } from '@exquisite-telephone/shared';

/**
 * The next Entry a Book needs, computed from Room.players order and the
 * book's originAuthorId (the "pass the folded paper" round-robin
 * mechanic — see ui.md Writing/Drawing View).
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
 * Computes the next Entry due on `book`, or null once every player in
 * the room has contributed to it exactly once (the book is complete).
 */
export function computeNextEntry(room: Room, book: Book): NextEntry | null {
  const position = book.entries.length;
  if (position >= room.players.length) {
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
