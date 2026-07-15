import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Socket } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBooksForRoom,
  createRoom,
  createRoomStore,
  joinRoom,
  type RoomStore,
} from '../domain/roomStore.js';
import { createLogger } from '../observability/logger.js';
import { createSocketServer } from './server.js';
import {
  onCastTimeoutVote,
  onEndGame,
  onSetTurnTimer,
  onStartGame,
  onSubmitEntry,
  onVoteToPlayAgain,
  type CreateRoomAck,
  type JoinRoomAck,
  type SetMonochromeAck,
  type StartGameAck,
} from './handlers.js';

/**
 * onSetMonochrome: host-only, lobby-only toggle of Room.monochromeOnly
 * (datamodel.md), mirroring onStartGame's host-only/status guard shape
 * (server.test.ts).
 */
describe('onSetMonochrome', () => {
  let httpServer: HttpServer;
  let store: RoomStore;
  let clientA: ClientSocket;
  let clientB: ClientSocket;
  let port: number;

  beforeEach(async () => {
    store = createRoomStore();
    httpServer = createServer();
    createSocketServer(httpServer, store);
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    clientA?.close();
    clientB?.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('lets the host set Room.monochromeOnly and broadcasts the updated room', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;
    const hostId = createAck.room!.hostPlayerId;

    clientB = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));
    await new Promise<void>((resolve) => {
      clientB.emit('joinRoom', { roomId, playerName: 'Grace' }, () => resolve());
    });

    const roomUpdatePromise = new Promise<{ room: SetMonochromeAck['room'] }>((resolve) => {
      clientB.once('roomUpdated', resolve);
    });

    const ack = await new Promise<SetMonochromeAck>((resolve) => {
      clientA.emit('set_monochrome', { roomId, playerId: hostId, monochromeOnly: true }, resolve);
    });

    expect(ack.error).toBeUndefined();
    expect(ack.room?.monochromeOnly).toBe(true);

    const broadcast = await roomUpdatePromise;
    expect(broadcast.room?.monochromeOnly).toBe(true);
  });

  it('rejects a non-host caller', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;

    clientB = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));
    const joinAck = await new Promise<JoinRoomAck>((resolve) => {
      clientB.emit('joinRoom', { roomId, playerName: 'Grace' }, resolve);
    });

    const ack = await new Promise<SetMonochromeAck>((resolve) => {
      clientB.emit(
        'set_monochrome',
        { roomId, playerId: joinAck.player!.id, monochromeOnly: true },
        resolve,
      );
    });

    expect(ack.error).toBe('not-host');
  });

  it('rejects once the room has left the lobby', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;
    const hostId = createAck.room!.hostPlayerId;

    await new Promise<StartGameAck>((resolve) => {
      clientA.emit('startGame', { roomId, playerId: hostId, acknowledgeSmallGame: true }, resolve);
    });

    const ack = await new Promise<SetMonochromeAck>((resolve) => {
      clientA.emit('set_monochrome', { roomId, playerId: hostId, monochromeOnly: true }, resolve);
    });

    expect(ack.error).toBe('room-not-in-lobby');
  });
});

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

describe('onCastTimeoutVote', () => {
  function setUpRoomWithPendingVote() {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const [adaId, graceId, linId] = room.players.map((p) => p.id) as [string, string, string];
    room.turnTimerMinutes = 30;
    room.roundStartedAt = Date.now() - 60_000;
    room.pendingTimeoutVote = {
      stalledPlayerIds: [adaId],
      eligibleVoterIds: [graceId, linId],
      votes: {},
      voteDeadline: Date.now() + 120_000,
    };
    return { store, room, adaId, graceId, linId };
  }

  it('records a cast vote into Room.pendingTimeoutVote.votes', () => {
    const { store, room, graceId } = setUpRoomWithPendingVote();
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onCastTimeoutVote(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: graceId, choice: 'full' },
      ack,
    );

    expect(room.pendingTimeoutVote?.votes[graceId]).toBe('full');
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ room: expect.any(Object) }));
  });

  it('rejects a vote when no vote is pending', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onCastTimeoutVote(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId, choice: 'full' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'no-vote-pending' });
  });

  it('rejects a vote from a player who is not an eligible voter', () => {
    const { store, room, adaId } = setUpRoomWithPendingVote();
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    // ada is the stalled player, not an eligible voter.
    onCastTimeoutVote(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId, choice: 'full' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'not-eligible' });
    expect(room.pendingTimeoutVote?.votes[adaId]).toBeUndefined();
  });

  it('resolves the vote immediately once every eligible voter has voted, without waiting for the sweep', () => {
    const { store, room, graceId, linId, adaId } = setUpRoomWithPendingVote();
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});

    onCastTimeoutVote(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: graceId, choice: 'full' },
      vi.fn(),
    );
    expect(room.pendingTimeoutVote).not.toBeNull();

    onCastTimeoutVote(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: linId, choice: 'full' },
      vi.fn(),
    );

    expect(room.pendingTimeoutVote).toBeNull();
    expect(room.timerExtensions[adaId]).toBe(30 * 60_000);
  });
});

/**
 * onEndGame: host-only transition to 'ended' must emit a structured
 * game_completed log event (constitution Principle IX), matching the
 * natural-completion path in onSubmitEntry but distinguishable via
 * reason: 'host-ended'. Only the success path logs — rejections
 * (room-not-found, not-host) must not.
 */
describe('onEndGame observability', () => {
  it("logs game_completed with reason 'host-ended' when the host ends the game", () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const hostId = room.hostPlayerId;

    const socket = makeFakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const logger = createLogger((line) => events.push(JSON.parse(line)));
    const ack = vi.fn();

    onEndGame(socket, store, logger, { roomId: room.id, playerId: hostId }, ack);

    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'game_completed',
        outcome: 'success',
        roomId: room.id,
        reason: 'host-ended',
      }),
    );
  });

  it('does not log game_completed when the room is not found', () => {
    const store = createRoomStore();

    const socket = makeFakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const logger = createLogger((line) => events.push(JSON.parse(line)));
    const ack = vi.fn();

    onEndGame(socket, store, logger, { roomId: 'nonexistent', playerId: 'p1' }, ack);

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-found' });
    expect(events.filter((e) => e.event === 'game_completed')).toHaveLength(0);
  });

  it('does not log game_completed when the caller is not the host', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;

    const socket = makeFakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const logger = createLogger((line) => events.push(JSON.parse(line)));
    const ack = vi.fn();

    onEndGame(socket, store, logger, { roomId: room.id, playerId: grace.id }, ack);

    expect(ack).toHaveBeenCalledWith({ error: 'not-host' });
    expect(events.filter((e) => e.event === 'game_completed')).toHaveLength(0);
  });
});

/**
 * onVoteToPlayAgain: host-agnostic — adds the caller's playerId to
 * Room.playAgainVotes (deduplicated) and broadcasts roomUpdated
 * (datamodel.md Normalization Rules — End-of-game controls).
 */
describe('onVoteToPlayAgain', () => {
  it("adds playerId to Room.playAgainVotes and broadcasts roomUpdated", () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;

    const socket = makeFakeSocket();
    const ack = vi.fn();

    onVoteToPlayAgain(socket, store, { roomId: room.id, playerId: grace.id }, ack);

    expect(room.playAgainVotes).toEqual([grace.id]);
    expect(socket.to).toHaveBeenCalledWith(room.id);
    expect(ack).toHaveBeenCalledWith({ room });
  });

  it('voting twice with the same playerId does not create a duplicate entry', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;

    const socket = makeFakeSocket();
    const ack = vi.fn();

    onVoteToPlayAgain(socket, store, { roomId: room.id, playerId: grace.id }, ack);
    onVoteToPlayAgain(socket, store, { roomId: room.id, playerId: grace.id }, ack);

    expect(room.playAgainVotes).toEqual([grace.id]);
  });
});
