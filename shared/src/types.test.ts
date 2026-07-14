import { describe, expect, it } from 'vitest';
import type { Book, Entry, Player, Room } from './index.js';

describe('datamodel types (datamodel.md)', () => {
  it('Entry requires id, bookId, authorId, position, type, content', () => {
    const entry: Entry = {
      id: 'entry-1',
      bookId: 'book-1',
      authorId: 'player-1',
      position: 0,
      type: 'text',
      content: 'a phrase',
    };

    expect(entry.type === 'text' || entry.type === 'drawing').toBe(true);
    expect(entry.position).toBeGreaterThanOrEqual(0);
  });

  it('Book requires id, roomId, originAuthorId, and an ordered entries chain', () => {
    const entry: Entry = {
      id: 'entry-1',
      bookId: 'book-1',
      authorId: 'player-1',
      position: 0,
      type: 'text',
      content: 'a phrase',
    };
    const book: Book = {
      id: 'book-1',
      roomId: 'room-1',
      originAuthorId: 'player-1',
      entries: [entry],
    };

    expect(book.entries).toHaveLength(1);
    expect(book.entries[0]?.id).toBe('entry-1');
  });

  it('Player requires id, roomId, name, connected, sessionToken', () => {
    const player: Player = {
      id: 'player-1',
      roomId: 'room-1',
      name: 'Ada',
      connected: true,
      sessionToken: 'token-1',
    };

    expect(player.connected).toBe(true);
  });

  it('Room requires id, hostPlayerId, players, status, books, createdAt', () => {
    const player: Player = {
      id: 'player-1',
      roomId: 'room-1',
      name: 'Ada',
      connected: true,
      sessionToken: 'token-1',
    };
    const room: Room = {
      id: 'room-1',
      hostPlayerId: 'player-1',
      players: [player],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
    };

    const validStatuses: Room['status'][] = ['lobby', 'writing', 'reveal', 'ended'];
    expect(validStatuses).toContain(room.status);
    expect(room.players).toHaveLength(1);
  });
});
