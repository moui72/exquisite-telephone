import { describe, expect, it } from 'vitest';
import type { Book, Entry, Player, Room } from '@exquisite-telephone/shared';
import { computeNextEntry, computeNextEntries } from './turnAdvancement.js';

function makePlayer(id: string, roomId: string): Player {
  return { id, roomId, name: id, connected: true, sessionToken: `${id}-token` };
}

function makeEntry(bookId: string, authorId: string, position: number): Entry {
  return {
    id: `${bookId}-${position}`,
    bookId,
    authorId,
    position,
    type: position % 2 === 0 ? 'text' : 'drawing',
    content: `content-${position}`,
  };
}

describe('turn advancement (round-robin per book)', () => {
  const roomId = 'ROOM1';
  const ada = makePlayer('ada', roomId);
  const grace = makePlayer('grace', roomId);
  const lin = makePlayer('lin', roomId);
  const players = [ada, grace, lin];

  function makeRoom(books: Book[]): Room {
    return {
      id: roomId,
      hostPlayerId: ada.id,
      players,
      status: 'writing',
      books,
      createdAt: Date.now(),
    };
  }

  it('assigns the next entry to the next player in rotation from the book origin author', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    const room = makeRoom([bookA]);

    const next = computeNextEntry(room, bookA);

    expect(next).toEqual({ authorId: grace.id, type: 'drawing', position: 1 });
  });

  it('wraps around the rotation back to the origin author', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0), makeEntry('bookA', grace.id, 1)],
    };
    const room = makeRoom([bookA]);

    const next = computeNextEntry(room, bookA);

    expect(next).toEqual({ authorId: lin.id, type: 'text', position: 2 });
  });

  it('returns null once every player has contributed to the book', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [
        makeEntry('bookA', ada.id, 0),
        makeEntry('bookA', grace.id, 1),
        makeEntry('bookA', lin.id, 2),
      ],
    };
    const room = makeRoom([bookA]);

    expect(computeNextEntry(room, bookA)).toBeNull();
  });

  it('computes the next entry per book across a full multi-player round-robin room', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    const bookB: Book = {
      id: 'bookB',
      roomId,
      originAuthorId: grace.id,
      entries: [makeEntry('bookB', grace.id, 0)],
    };
    const bookC: Book = {
      id: 'bookC',
      roomId,
      originAuthorId: lin.id,
      entries: [makeEntry('bookC', lin.id, 0)],
    };
    const room = makeRoom([bookA, bookB, bookC]);

    const nextEntries = computeNextEntries(room);

    expect(nextEntries).toEqual([
      { bookId: 'bookA', authorId: grace.id, type: 'drawing', position: 1 },
      { bookId: 'bookB', authorId: lin.id, type: 'drawing', position: 1 },
      { bookId: 'bookC', authorId: ada.id, type: 'drawing', position: 1 },
    ]);
  });

  it('excludes completed books from computeNextEntries', () => {
    const completeBook: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [
        makeEntry('bookA', ada.id, 0),
        makeEntry('bookA', grace.id, 1),
        makeEntry('bookA', lin.id, 2),
      ],
    };
    const room = makeRoom([completeBook]);

    expect(computeNextEntries(room)).toEqual([]);
  });
});
