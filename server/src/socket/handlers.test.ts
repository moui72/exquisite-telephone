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
import { computeNextEntries, type Room } from '@exquisite-telephone/shared';
import { createLogger } from '../observability/logger.js';
import { waitForEvent } from '../test-support/waitFor.js';
import { createSocketServer } from './server.js';
import {
  onCastTimeoutVote,
  onEndGame,
  onKickPlayer,
  onRestartGame,
  onSetAllowPromptWriteIn,
  onSetCuratedPromptCount,
  onSetLapsPerBook,
  onSetPromptMode,
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
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;
    const hostId = createAck.room!.hostPlayerId;

    clientB = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientB, 'connect');
    await clientB.timeout(5000).emitWithAck('joinRoom', { roomId, playerName: 'Grace' });

    const roomUpdatePromise = waitForEvent<{ room: SetMonochromeAck['room'] }>(
      clientB,
      'roomUpdated',
    );

    const ack = (await clientA
      .timeout(5000)
      .emitWithAck('set_monochrome', {
        roomId,
        playerId: hostId,
        monochromeOnly: true,
      })) as SetMonochromeAck;

    expect(ack.error).toBeUndefined();
    expect(ack.room?.monochromeOnly).toBe(true);

    const broadcast = await roomUpdatePromise;
    expect(broadcast.room?.monochromeOnly).toBe(true);
  });

  it('rejects a non-host caller', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;

    clientB = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientB, 'connect');
    const joinAck = (await clientB
      .timeout(5000)
      .emitWithAck('joinRoom', { roomId, playerName: 'Grace' })) as JoinRoomAck;

    const ack = (await clientB
      .timeout(5000)
      .emitWithAck('set_monochrome', {
        roomId,
        playerId: joinAck.player!.id,
        monochromeOnly: true,
      })) as SetMonochromeAck;

    expect(ack.error).toBe('not-host');
  });

  it('rejects once the room has left the lobby', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;
    const hostId = createAck.room!.hostPlayerId;

    (await clientA
      .timeout(5000)
      .emitWithAck('startGame', {
        roomId,
        playerId: hostId,
        acknowledgeSmallGame: true,
      })) as StartGameAck;

    const ack = (await clientA
      .timeout(5000)
      .emitWithAck('set_monochrome', {
        roomId,
        playerId: hostId,
        monochromeOnly: true,
      })) as SetMonochromeAck;

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

describe('onSubmitEntry reveal pacing (Room.revealStartedAt)', () => {
  it("stamps revealStartedAt when the last entry flips status to 'reveal'", () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'writing';
    // Pin to a single lap: this test is about reveal-pacing timestamps,
    // not laps-per-book behavior.
    room.lapsPerBook = 1;
    room.books = createBooksForRoom(room);
    const adaId = room.players[0]!.id;
    const adaBook = room.books[0]!;

    expect(room.revealStartedAt).toBeNull();

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const before = Date.now();

    onSubmitEntry(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, content: 'final phrase' },
      vi.fn(),
    );

    const after = Date.now();
    expect(room.status).toBe('reveal');
    expect(room.revealStartedAt).not.toBeNull();
    expect(room.revealStartedAt!).toBeGreaterThanOrEqual(before);
    expect(room.revealStartedAt!).toBeLessThanOrEqual(after);
  });

  it('leaves revealStartedAt null when the submission does not complete the game', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const adaId = room.players[0]!.id;
    const adaBook = room.books.find((b) => b.originAuthorId === adaId)!;

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});

    onSubmitEntry(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, content: 'not last' },
      vi.fn(),
    );

    expect(room.status).toBe('writing');
    expect(room.revealStartedAt).toBeNull();
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

describe('onStartGame resolves Room.lapsPerBook (datamodel.md Normalization Rules — Laps per book)', () => {
  it('resolves lapsPerBook to defaultLapsPerBook(players.length) when still null at start time', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    const adaId = room.players[0]!.id;
    expect(room.lapsPerBook).toBeNull();

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      ack,
    );

    // 3 players -> defaultLapsPerBook(3) === 2.
    expect(room.lapsPerBook).toBe(2);
  });

  it('leaves an explicitly-host-set lapsPerBook value untouched', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    const adaId = room.players[0]!.id;
    room.lapsPerBook = 3;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      ack,
    );

    expect(room.lapsPerBook).toBe(3);
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

describe('onSetLapsPerBook', () => {
  it('lets the host set Room.lapsPerBook to 1, 2, or 3 while the room is in lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetLapsPerBook(socket, store, { roomId: room.id, playerId: adaId, lapsPerBook: 3 }, ack);

    expect(room.lapsPerBook).toBe(3);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ room: expect.any(Object) }));
  });

  it('rejects an invalid lapsPerBook value with invalid-laps-per-book', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetLapsPerBook(
      socket,
      store,
      // @ts-expect-error intentionally invalid input for this test
      { roomId: room.id, playerId: adaId, lapsPerBook: 4 },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'invalid-laps-per-book' });
    expect(room.lapsPerBook).toBeNull();
  });

  it('rejects a non-host caller with not-host', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    const graceId = room.players[1]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetLapsPerBook(socket, store, { roomId: room.id, playerId: graceId, lapsPerBook: 2 }, ack);

    expect(ack).toHaveBeenCalledWith({ error: 'not-host' });
    expect(room.lapsPerBook).toBeNull();
  });

  it('rejects setting laps per book once the room has left lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    room.status = 'writing';

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetLapsPerBook(socket, store, { roomId: room.id, playerId: adaId, lapsPerBook: 2 }, ack);

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-in-lobby' });
    expect(room.lapsPerBook).toBeNull();
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
    room.status = 'reveal';

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
  it('adds playerId to Room.playAgainVotes and broadcasts roomUpdated', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;
    room.status = 'reveal';

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
    room.status = 'reveal';

    const socket = makeFakeSocket();
    const ack = vi.fn();

    onVoteToPlayAgain(socket, store, { roomId: room.id, playerId: grace.id }, ack);
    onVoteToPlayAgain(socket, store, { roomId: room.id, playerId: grace.id }, ack);

    expect(room.playAgainVotes).toEqual([grace.id]);
  });

  it('rejects with room-not-in-reveal when the room is in lobby or writing, leaving playAgainVotes unmodified', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;

    const socket = makeFakeSocket();
    const lobbyAck = vi.fn();

    onVoteToPlayAgain(socket, store, { roomId: room.id, playerId: grace.id }, lobbyAck);

    expect(lobbyAck).toHaveBeenCalledWith({ error: 'room-not-in-reveal' });
    expect(room.playAgainVotes).toEqual([]);

    room.status = 'writing';
    const writingAck = vi.fn();

    onVoteToPlayAgain(socket, store, { roomId: room.id, playerId: grace.id }, writingAck);

    expect(writingAck).toHaveBeenCalledWith({ error: 'room-not-in-reveal' });
    expect(room.playAgainVotes).toEqual([]);
  });
});

/**
 * onKickPlayer: host-only. Sets Player.kicked = true; only sets
 * Room.nonContinuable when the kick happens during 'writing' (a
 * kick during lobby/reveal has nothing to make non-continuable).
 * Logs a structured player_kicked event and broadcasts roomUpdated.
 */
describe('onKickPlayer', () => {
  it('rejects when the caller is not the host', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;
    const lin = joinRoom(store, { roomId: room.id, playerName: 'Lin' }).player!;

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onKickPlayer(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: grace.id, targetPlayerId: lin.id },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'not-host' });
    expect(lin.kicked).toBe(false);
  });

  it('rejects when the room is not found', () => {
    const store = createRoomStore();
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onKickPlayer(
      socket,
      store,
      logger,
      { roomId: 'nonexistent', playerId: 'p1', targetPlayerId: 'p2' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-found' });
  });

  it('kicks a player during lobby without setting nonContinuable', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onKickPlayer(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId, targetPlayerId: grace.id },
      ack,
    );

    expect(grace.kicked).toBe(true);
    expect(room.nonContinuable).toBe(false);
    expect(ack).toHaveBeenCalledWith({ room });
  });

  it('kicks a player during writing and sets nonContinuable', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onKickPlayer(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId, targetPlayerId: grace.id },
      ack,
    );

    expect(grace.kicked).toBe(true);
    expect(room.nonContinuable).toBe(true);
  });

  it('kicks a player during reveal without setting nonContinuable', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;
    room.status = 'reveal';

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onKickPlayer(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId, targetPlayerId: grace.id },
      ack,
    );

    expect(grace.kicked).toBe(true);
    expect(room.nonContinuable).toBe(false);
  });

  it('is idempotent when the same player is kicked twice', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;
    room.status = 'writing';
    room.books = createBooksForRoom(room);

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onKickPlayer(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId, targetPlayerId: grace.id },
      ack,
    );
    onKickPlayer(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId, targetPlayerId: grace.id },
      ack,
    );

    expect(grace.kicked).toBe(true);
    expect(room.nonContinuable).toBe(true);
  });

  it('logs a structured player_kicked event on success', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;

    const socket = makeFakeSocket();
    const events: Array<Record<string, unknown>> = [];
    const logger = createLogger((line) => events.push(JSON.parse(line)));
    const ack = vi.fn();

    onKickPlayer(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId, targetPlayerId: grace.id },
      ack,
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'player_kicked',
        outcome: 'success',
        roomId: room.id,
        kickedPlayerId: grace.id,
        hostPlayerId: room.hostPlayerId,
      }),
    );
  });
});

/**
 * onSubmitEntry: rejects with room-non-continuable before any other
 * check once Room.nonContinuable is true (moderation plan).
 */
describe('onSubmitEntry nonContinuable guard', () => {
  it('rejects with room-non-continuable when the room is frozen', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    room.nonContinuable = true;

    const logger = createLogger(() => {});
    const ack = vi.fn();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        bookId: room.books[0]!.id,
        playerId: room.hostPlayerId,
        content: 'hello',
      },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'room-non-continuable' });
  });
});

/**
 * onRestartGame: host-only, requires Room.nonContinuable === true.
 * Regenerates books excluding kicked players, clears round state, and
 * resumes 'writing'.
 */
describe('onRestartGame', () => {
  it('rejects when the caller is not the host', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;
    room.status = 'writing';
    room.nonContinuable = true;

    const logger = createLogger(() => {});
    const ack = vi.fn();

    onRestartGame(makeFakeSocket(), store, logger, { roomId: room.id, playerId: grace.id }, ack);

    expect(ack).toHaveBeenCalledWith({ error: 'not-host' });
  });

  it('rejects when the room is not found', () => {
    const store = createRoomStore();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onRestartGame(
      makeFakeSocket(),
      store,
      logger,
      { roomId: 'nonexistent', playerId: 'p1' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-found' });
  });

  it('rejects with nothing-to-restart when Room.nonContinuable is false', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'writing';

    const logger = createLogger(() => {});
    const ack = vi.fn();

    onRestartGame(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'nothing-to-restart' });
  });

  it('restarts a frozen game, excluding kicked players and resetting round state', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const grace = joinRoom(store, { roomId: room.id, playerName: 'Grace' }).player!;
    const lin = joinRoom(store, { roomId: room.id, playerName: 'Lin' }).player!;
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    room.timerExtensions = { [lin.id]: 60_000 };
    room.pendingTimeoutVote = {
      stalledPlayerIds: [lin.id],
      eligibleVoterIds: [room.hostPlayerId, grace.id],
      votes: {},
      voteDeadline: Date.now() + 60_000,
    };

    const logger = createLogger(() => {});
    const ack = vi.fn();

    onKickPlayer(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId, targetPlayerId: lin.id },
      vi.fn(),
    );
    expect(room.nonContinuable).toBe(true);

    const beforeRestart = Date.now();
    onRestartGame(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId },
      ack,
    );

    expect(room.status).toBe('writing');
    expect(room.nonContinuable).toBe(false);
    expect(room.books.every((b) => b.entries.length === 0)).toBe(true);
    expect(room.timerExtensions).toEqual({});
    expect(room.pendingTimeoutVote).toBeNull();
    expect(room.roundStartedAt).toBeGreaterThanOrEqual(beforeRestart);
    expect(room.books.map((b) => b.originAuthorId).sort()).toEqual(
      [room.hostPlayerId, grace.id].sort(),
    );
    expect(ack).toHaveBeenCalledWith({ room });
  });

  it('logs a structured game_restarted event on success', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'writing';
    room.nonContinuable = true;

    const events: Array<Record<string, unknown>> = [];
    const logger = createLogger((line) => events.push(JSON.parse(line)));
    const ack = vi.fn();

    onRestartGame(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: room.hostPlayerId },
      ack,
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'game_restarted',
        outcome: 'success',
        roomId: room.id,
      }),
    );
  });
});

/**
 * The three curated-prompt host settings (datamodel.md Room), each a separate
 * named handler per Principle VIII rather than one multi-field setter, and
 * each mirroring onSetLapsPerBook's guard shape.
 */
describe('onSetPromptMode', () => {
  it("lets the host set Room.promptMode to 'curated' while the room is in lobby", () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetPromptMode(socket, store, { roomId: room.id, playerId: adaId, promptMode: 'curated' }, ack);

    expect(room.promptMode).toBe('curated');
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ room: expect.any(Object) }));
  });

  it('rejects an invalid promptMode with invalid-prompt-mode', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetPromptMode(
      socket,
      store,
      // @ts-expect-error intentionally invalid input for this test
      { roomId: room.id, playerId: adaId, promptMode: 'freeform' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'invalid-prompt-mode' });
    expect(room.promptMode).toBe('free-form');
  });

  it('rejects a non-host caller with not-host', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    const graceId = room.players[1]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetPromptMode(
      socket,
      store,
      { roomId: room.id, playerId: graceId, promptMode: 'curated' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'not-host' });
    expect(room.promptMode).toBe('free-form');
  });

  it('rejects setting the prompt mode once the room has left lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    room.status = 'writing';

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetPromptMode(socket, store, { roomId: room.id, playerId: adaId, promptMode: 'curated' }, ack);

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-in-lobby' });
    expect(room.promptMode).toBe('free-form');
  });
});

describe('onSetCuratedPromptCount', () => {
  it('lets the host set Room.curatedPromptCount to 2, 3, 4, or 5 while in lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetCuratedPromptCount(
      socket,
      store,
      { roomId: room.id, playerId: adaId, curatedPromptCount: 4 },
      ack,
    );

    expect(room.curatedPromptCount).toBe(4);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ room: expect.any(Object) }));
  });

  it('rejects an out-of-range count with invalid-curated-prompt-count', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetCuratedPromptCount(
      socket,
      store,
      // @ts-expect-error intentionally invalid input for this test
      { roomId: room.id, playerId: adaId, curatedPromptCount: 6 },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'invalid-curated-prompt-count' });
    expect(room.curatedPromptCount).toBeNull();
  });

  it('rejects a non-host caller with not-host', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    const graceId = room.players[1]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetCuratedPromptCount(
      socket,
      store,
      { roomId: room.id, playerId: graceId, curatedPromptCount: 3 },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'not-host' });
    expect(room.curatedPromptCount).toBeNull();
  });

  it('rejects setting the count once the room has left lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    room.status = 'writing';

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetCuratedPromptCount(
      socket,
      store,
      { roomId: room.id, playerId: adaId, curatedPromptCount: 3 },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-in-lobby' });
    expect(room.curatedPromptCount).toBeNull();
  });
});

describe('onSetAllowPromptWriteIn', () => {
  it('lets the host turn write-in off while the room is in lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetAllowPromptWriteIn(
      socket,
      store,
      { roomId: room.id, playerId: adaId, allowPromptWriteIn: false },
      ack,
    );

    expect(room.allowPromptWriteIn).toBe(false);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ room: expect.any(Object) }));
  });

  it('rejects a non-host caller with not-host', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    const graceId = room.players[1]!.id;

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetAllowPromptWriteIn(
      socket,
      store,
      { roomId: room.id, playerId: graceId, allowPromptWriteIn: false },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'not-host' });
    expect(room.allowPromptWriteIn).toBe(true);
  });

  it('rejects setting write-in once the room has left lobby', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    room.status = 'writing';

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onSetAllowPromptWriteIn(
      socket,
      store,
      { roomId: room.id, playerId: adaId, allowPromptWriteIn: false },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-in-lobby' });
    expect(room.allowPromptWriteIn).toBe(true);
  });
});

/**
 * Dealing curated prompts at game start and restart (datamodel.md
 * Normalization Rules — Curated prompts).
 */
describe('curated prompt dealing on start and restart', () => {
  it('deals a hand to every non-kicked player when the room is in curated mode', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Linus' });
    const adaId = room.players[0]!.id;
    room.promptMode = 'curated';
    room.curatedPromptCount = 3;

    const socket = makeFakeSocket();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      vi.fn(),
    );

    expect(Object.keys(room.dealtPrompts).sort()).toEqual(room.players.map((p) => p.id).sort());
    for (const player of room.players) {
      expect(room.dealtPrompts[player.id]).toHaveLength(3);
    }
    // Structural distinctness: partitioning one shuffle, never sampling.
    const all = Object.values(room.dealtPrompts).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('leaves dealtPrompts empty in free-form mode', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      vi.fn(),
    );

    expect(room.dealtPrompts).toEqual({});
  });

  it('excludes kicked players from the deal', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Linus' });
    const adaId = room.players[0]!.id;
    const linusId = room.players[2]!.id;
    room.players[2]!.kicked = true;
    room.promptMode = 'curated';
    room.curatedPromptCount = 2;

    const socket = makeFakeSocket();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      vi.fn(),
    );

    expect(room.dealtPrompts[linusId]).toBeUndefined();
    expect(Object.keys(room.dealtPrompts)).toHaveLength(2);
  });

  it('re-deals a fresh hand on restart', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Linus' });
    const adaId = room.players[0]!.id;
    room.promptMode = 'curated';
    room.curatedPromptCount = 3;

    const socket = makeFakeSocket();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      vi.fn(),
    );
    const firstDeal = JSON.stringify(room.dealtPrompts);

    room.nonContinuable = true;
    onRestartGame(
      socket,
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: adaId },
      vi.fn(),
    );

    expect(Object.keys(room.dealtPrompts)).toHaveLength(3);
    for (const player of room.players) {
      expect(room.dealtPrompts[player.id]).toHaveLength(3);
    }
    // A re-deal, not the same hands carried over. With a 74-phrase bank and
    // 9 phrases dealt, an identical shuffle result is vanishingly unlikely.
    expect(JSON.stringify(room.dealtPrompts)).not.toBe(firstDeal);
  });
});

/**
 * Opening-turn submission validation in curated mode (datamodel.md
 * Normalization Rules — Curated prompts). Applies to `position === 0` only;
 * every later text entry is a blind guess and stays free-form in both modes.
 */
describe('onSubmitEntry curated opening-turn validation', () => {
  const logger = createLogger(() => {});

  function startedCuratedRoom(allowPromptWriteIn: boolean) {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Linus' });
    const adaId = room.players[0]!.id;
    room.promptMode = 'curated';
    room.curatedPromptCount = 3;
    room.allowPromptWriteIn = allowPromptWriteIn;

    onStartGame(
      makeFakeSocket(),
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      vi.fn(),
    );
    return { store, room, adaId };
  }

  /** The book whose opening turn belongs to `playerId`. */
  function openingBookFor(room: Room, playerId: string) {
    return room.books.find((b) => b.originAuthorId === playerId)!;
  }

  it("accepts one of the submitting player's own dealt phrases", () => {
    const { store, room, adaId } = startedCuratedRoom(false);
    const book = openingBookFor(room, adaId);
    const mine = room.dealtPrompts[adaId]![0]!;

    const ack = vi.fn();
    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: book.id, content: mine },
      ack,
    );

    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ entry: expect.any(Object) }));
    expect(book.entries[0]!.content).toBe(mine);
  });

  it("rejects another player's dealt phrase", () => {
    const { store, room, adaId } = startedCuratedRoom(false);
    const graceId = room.players[1]!.id;
    const book = openingBookFor(room, adaId);
    const notMine = room.dealtPrompts[graceId]![0]!;

    const ack = vi.fn();
    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: book.id, content: notMine },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'prompt-not-dealt' });
    expect(book.entries).toHaveLength(0);
  });

  it('rejects arbitrary text when write-in is off', () => {
    const { store, room, adaId } = startedCuratedRoom(false);
    const book = openingBookFor(room, adaId);

    const ack = vi.fn();
    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: book.id, content: 'something I made up' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'prompt-not-dealt' });
    expect(book.entries).toHaveLength(0);
  });

  it('accepts arbitrary text when write-in is on', () => {
    const { store, room, adaId } = startedCuratedRoom(true);
    const book = openingBookFor(room, adaId);

    const ack = vi.fn();
    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: book.id, content: 'something I made up' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ entry: expect.any(Object) }));
    expect(book.entries[0]!.content).toBe('something I made up');
  });

  it('leaves position > 0 submissions unaffected by the curated check', () => {
    const { store, room, adaId } = startedCuratedRoom(false);
    const graceId = room.players[1]!.id;
    const linusId = room.players[2]!.id;

    // Every player submits their own opening phrase so the round advances.
    for (const playerId of [adaId, graceId, linusId]) {
      const book = openingBookFor(room, playerId);
      onSubmitEntry(
        makeFakeSocket(),
        store,
        logger,
        { roomId: room.id, playerId, bookId: book.id, content: room.dealtPrompts[playerId]![0]! },
        vi.fn(),
      );
    }

    // Position 1 is a drawing turn on someone else's book: free text, and not
    // drawn from anybody's hand, yet accepted.
    const next = computeNextEntries(room)[0]!;
    const ack = vi.fn();
    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        playerId: next.authorId,
        bookId: next.bookId,
        content: 'arbitrary later-turn content',
      },
      ack,
    );

    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ entry: expect.any(Object) }));
  });
});

/**
 * datamodel.md Room: `curatedPromptCount` is "null while
 * `promptMode === 'free-form'`" -- the coupling has to survive a host who
 * picks a count and then switches back.
 */
describe('onSetPromptMode keeps curatedPromptCount coupled to the mode', () => {
  it('clears curatedPromptCount when the host switches back to free-form', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    const adaId = room.players[0]!.id;
    const socket = makeFakeSocket();

    onSetPromptMode(socket, store, { roomId: room.id, playerId: adaId, promptMode: 'curated' }, vi.fn());
    onSetCuratedPromptCount(
      socket,
      store,
      { roomId: room.id, playerId: adaId, curatedPromptCount: 5 },
      vi.fn(),
    );
    expect(room.curatedPromptCount).toBe(5);

    onSetPromptMode(
      socket,
      store,
      { roomId: room.id, playerId: adaId, promptMode: 'free-form' },
      vi.fn(),
    );

    expect(room.promptMode).toBe('free-form');
    expect(room.curatedPromptCount).toBeNull();
  });
});
