import { describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io';
import { createBooksForRoom, createRoom, createRoomStore, joinRoom } from '../domain/roomStore.js';
import { createLogger } from '../observability/logger.js';
import { onSetTurnTimer, onStartGame, onSubmitEntry } from './handlers.js';

/**
 * A minimal fake of the Socket.IO `Socket` surface the handlers touch
 * (`.data`, `.join`, `.to(...).emit(...)`), so handler functions can be
 * unit-tested directly without spinning up a real Socket.IO server (see
 * server.test.ts for the integration-level coverage of the same events).
 */
function makeFakeSocket(): Socket {
  return {
    data: {},
    join: vi.fn(),
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
  } as unknown as Socket;
}

describe('onSubmitEntry round-gating', () => {
  it('returns round-not-open (distinct from book-complete) when the book is ahead of the room-wide current round', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const [adaId, graceId, linId] = room.players.map((p) => p.id);
    const adaBook = room.books.find((b) => b.originAuthorId === adaId)!;
    const graceBook = room.books.find((b) => b.originAuthorId === graceId)!;
    const linBook = room.books.find((b) => b.originAuthorId === linId)!;

    // graceBook races ahead: two entries submitted while adaBook/linBook
    // still have zero — graceBook is ahead of the room-wide current round.
    graceBook.entries.push({
      id: 'e0',
      bookId: graceBook.id,
      authorId: graceId!,
      position: 0,
      type: 'text',
      content: 'phrase',
    });
    graceBook.entries.push({
      id: 'e1',
      bookId: graceBook.id,
      authorId: linId!,
      position: 1,
      type: 'drawing',
      content: 'stroke-data',
    });
    void adaBook;
    void linBook;

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onSubmitEntry(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId!, bookId: graceBook.id, content: 'too soon' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'round-not-open' });
  });

  it('still returns book-complete once every player has contributed to the book', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const adaId = room.players[0]!.id;
    const adaBook = room.books[0]!;
    adaBook.entries.push({
      id: 'e0',
      bookId: adaBook.id,
      authorId: adaId,
      position: 0,
      type: 'text',
      content: 'phrase',
    });

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onSubmitEntry(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, content: 'too late' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'book-complete' });
  });
});

describe('round timer bookkeeping (Room.roundStartedAt / timerExtensions / pendingTimeoutVote)', () => {
  it('onStartGame sets roundStartedAt to now and initializes timerExtensions/pendingTimeoutVote', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    const before = Date.now();

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      ack,
    );

    const after = Date.now();
    expect(room.status).toBe('writing');
    expect(room.roundStartedAt).not.toBeNull();
    expect(room.roundStartedAt!).toBeGreaterThanOrEqual(before);
    expect(room.roundStartedAt!).toBeLessThanOrEqual(after);
    expect(room.timerExtensions).toEqual({});
    expect(room.pendingTimeoutVote).toBeNull();
  });

  it('onSubmitEntry resets roundStartedAt and clears timerExtensions/pendingTimeoutVote when the current round advances', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const [adaId, graceId] = room.players.map((p) => p.id);
    const adaBook = room.books.find((b) => b.originAuthorId === adaId)!;
    const graceBook = room.books.find((b) => b.originAuthorId === graceId)!;

    // Simulate an in-progress round with stale bookkeeping that should be
    // cleared once the round-wide minimum advances.
    room.roundStartedAt = Date.now() - 100_000;
    room.timerExtensions = { [adaId!]: 60_000 };
    room.pendingTimeoutVote = {
      stalledPlayerIds: [graceId!],
      eligibleVoterIds: [adaId!],
      votes: {},
      voteDeadline: Date.now() + 60_000,
    };

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});

    // Round 0 -> both books need an entry at position 0 before the
    // room-wide round can advance from 0 to 1.
    onSubmitEntry(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId!, bookId: adaBook.id, content: 'phrase one' },
      vi.fn(),
    );
    // Still round 0 (graceBook hasn't submitted yet) — bookkeeping must
    // not have reset yet.
    expect(room.timerExtensions).toEqual({ [adaId!]: 60_000 });

    const before = Date.now();
    onSubmitEntry(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: graceId!, bookId: graceBook.id, content: 'phrase two' },
      vi.fn(),
    );
    const after = Date.now();

    // Room-wide round advanced 0 -> 1: bookkeeping resets.
    expect(room.roundStartedAt!).toBeGreaterThanOrEqual(before);
    expect(room.roundStartedAt!).toBeLessThanOrEqual(after);
    expect(room.timerExtensions).toEqual({});
    expect(room.pendingTimeoutVote).toBeNull();
  });
});

describe('minimum player count (onStartGame)', () => {
  it('rejects starting with fewer than 3 players when acknowledgeSmallGame is not true', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onStartGame(socket, store, { roomId: room.id, playerId: adaId }, ack);

    expect(ack).toHaveBeenCalledWith({ error: 'too-few-players' });
    expect(room.status).toBe('lobby');
  });

  it('starts with 1 player when acknowledgeSmallGame is true', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      ack,
    );

    expect(room.status).toBe('writing');
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ room: expect.any(Object) }));
  });
});

describe('onSetTurnTimer', () => {
  it('lets the host set Room.turnTimerMinutes while the room is in lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetTurnTimer(socket, store, { roomId: room.id, playerId: adaId, turnTimerMinutes: 30 }, ack);

    expect(room.turnTimerMinutes).toBe(30);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ room: expect.any(Object) }));
  });

  it('accepts null to turn the timer back off', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    room.turnTimerMinutes = 15;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetTurnTimer(
      socket,
      store,
      { roomId: room.id, playerId: adaId, turnTimerMinutes: null },
      ack,
    );

    expect(room.turnTimerMinutes).toBeNull();
  });

  it('rejects a non-host caller with not-host', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    const graceId = room.players[1]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetTurnTimer(
      socket,
      store,
      { roomId: room.id, playerId: graceId, turnTimerMinutes: 30 },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'not-host' });
    expect(room.turnTimerMinutes).toBeNull();
  });

  it('rejects setting the timer once the room has left lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    room.status = 'writing';

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetTurnTimer(socket, store, { roomId: room.id, playerId: adaId, turnTimerMinutes: 30 }, ack);

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-in-lobby' });
    expect(room.turnTimerMinutes).toBeNull();
  });
});
