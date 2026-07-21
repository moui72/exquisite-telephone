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
import {
  computeNextEntries,
  computeNextEntry,
  CURATED_PHRASE_BANK,
  entryContentBytes,
  MAX_DRAWING_ENTRY_BYTES,
  MAX_TEXT_ENTRY_BYTES,
  serializeDrawOps,
  type DrawOps,
  type Player,
  type PromptRatingValue,
  type Room,
} from '@exquisite-telephone/shared';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCurationStore, type CurationStore } from '../domain/curationStore.js';
import { createLogger } from '../observability/logger.js';
import { waitForEvent } from '../test-support/waitFor.js';
import { createSocketServer } from './server.js';
import {
  onCastTimeoutVote,
  onDisconnect,
  onEndGame,
  onKickPlayer,
  onRestartGame,
  onSetAllowPromptWriteIn,
  onSetCuratedPromptCount,
  onSetLapsPerBook,
  onSetPromptMode,
  onSetReadingBook,
  onSetTurnTimer,
  onStartGame,
  onSubmitCover,
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
    // Pin to a single lap: this test asserts book-complete after one full
    // rotation. With lapsPerBook left null, defaultLapsPerBook(1) === 2
    // would (correctly) require 2 entries — that laps-aware behavior is
    // covered by the multi-lap tests below.
    room.lapsPerBook = 1;
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

describe('onSubmitEntry book-complete guard is laps-aware (defect d27f4eea)', () => {
  it('a 3-player defaulted-2-laps game accepts the first lap-2 submission and only completes after players.length * 2 entries', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});

    // onStartGame resolves the still-null lapsPerBook to
    // defaultLapsPerBook(3) === 2 and lays out one book per player.
    onStartGame(socket, store, { roomId: room.id, playerId: adaId }, vi.fn());
    expect(room.lapsPerBook).toBe(2);

    const playerCount = room.players.length; // 3
    const totalPositions = playerCount * (room.lapsPerBook as number); // 6

    // Drive the whole game through onSubmitEntry in lockstep rounds (turns
    // are round-gated, so every book must reach position p before any book
    // advances to p+1). Capture the ack of the FIRST lap-2 submission — the
    // position-3 entry, submitted when entries.length === 3 === playerCount,
    // the exact spot the old `entries.length >= players.length` guard
    // wrongly rejected as book-complete.
    let firstLapTwoAck: unknown;
    for (let position = 0; position < totalPositions; position++) {
      for (const book of room.books) {
        const next = computeNextEntry(room, book);
        expect(next).not.toBeNull();
        expect(next!.position).toBe(position);
        const ack = vi.fn();
        onSubmitEntry(
          socket,
          store,
          logger,
          { roomId: room.id, playerId: next!.authorId, bookId: book.id, content: `p${position}-${book.id}` },
          ack,
        );
        if (position === playerCount && firstLapTwoAck === undefined) {
          firstLapTwoAck = ack.mock.calls[0]?.[0];
        }
      }
    }

    // The first lap-2 submission was accepted, not rejected as complete.
    expect(firstLapTwoAck).toBeDefined();
    expect(firstLapTwoAck).not.toEqual({ error: 'book-complete' });

    // Now every book has playerCount * 2 === 6 entries: a further submit
    // returns book-complete, and the game has flipped to decorating (the
    // cover-decoration window now gates reveal — T004).
    expect(room.books.every((b) => b.entries.length === totalPositions)).toBe(true);
    expect(room.status).toBe('decorating');
    const ack = vi.fn();
    onSubmitEntry(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: room.books[0]!.id, content: 'too late' },
      ack,
    );
    expect(ack).toHaveBeenCalledWith({ error: 'book-complete' });
  });

  it('a lapsPerBook=1 game still returns book-complete after one full rotation (regression guard)', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    room.lapsPerBook = 1;
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const adaId = room.players[0]!.id;

    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const playerCount = room.players.length; // 3

    // One full rotation: every book reaches position playerCount - 1.
    for (let position = 0; position < playerCount; position++) {
      for (const book of room.books) {
        const next = computeNextEntry(room, book);
        expect(next).not.toBeNull();
        onSubmitEntry(
          socket,
          store,
          logger,
          { roomId: room.id, playerId: next!.authorId, bookId: book.id, content: `p${position}-${book.id}` },
          vi.fn(),
        );
      }
    }

    // Book is full at playerCount entries with a single lap.
    const ack = vi.fn();
    onSubmitEntry(
      socket,
      store,
      logger,
      { roomId: room.id, playerId: adaId, bookId: room.books[0]!.id, content: 'too late' },
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

describe("onSubmitEntry transition on completion", () => {
  it("flips status to 'decorating' when the last entry completes the game (T004)", () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'writing';
    // Pin to a single lap: this test is about the completion transition,
    // not laps-per-book behavior.
    room.lapsPerBook = 1;
    room.books = createBooksForRoom(room);
    const adaId = room.players[0]!.id;
    const adaBook = room.books[0]!;

    onSubmitEntry(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, content: 'final phrase' },
      vi.fn(),
    );

    expect(room.status).toBe('decorating');
  });

  it('leaves status writing when the submission does not complete the game', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const adaId = room.players[0]!.id;
    const adaBook = room.books.find((b) => b.originAuthorId === adaId)!;

    onSubmitEntry(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, content: 'not last' },
      vi.fn(),
    );

    expect(room.status).toBe('writing');
  });
});

describe("onSubmitEntry transition to 'decorating' (T003/T004 — cover decoration window)", () => {
  it(
    "transitions to 'decorating' (not reveal), stamps decorationWindowStartedAt, and leaves reveal-only records empty",
    () => {
      const store = createRoomStore();
      const room = createRoom(store, { hostName: 'Ada' });
      room.status = 'writing';
      room.lapsPerBook = 1;
      room.books = createBooksForRoom(room);
      const adaId = room.players[0]!.id;
      const adaBook = room.books[0]!;

      const before = Date.now();
      onSubmitEntry(
        makeFakeSocket(),
        store,
        createLogger(() => {}),
        { roomId: room.id, playerId: adaId, bookId: adaBook.id, content: 'final phrase' },
        vi.fn(),
      );
      const after = Date.now();

      expect(room.status).toBe('decorating');
      expect(room.decorationWindowStartedAt).not.toBeNull();
      expect(room.decorationWindowStartedAt!).toBeGreaterThanOrEqual(before);
      expect(room.decorationWindowStartedAt!).toBeLessThanOrEqual(after);
      // Reveal-only records stay empty — reveal hasn't happened yet.
      expect(room.bookReads).toEqual({});
      expect(room.currentlyReading).toEqual({});
    },
  );
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

describe('onStartGame counts active (non-kicked) players (datamodel.md Normalization Rules)', () => {
  it('resolves lapsPerBook from the active count: 5-player lobby with 1 kicked (4 active) -> 2 laps, not 1', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    joinRoom(store, { roomId: room.id, playerName: 'Kay' });
    joinRoom(store, { roomId: room.id, playerName: 'Mae' });
    const adaId = room.players[0]!.id;
    room.players[4]!.kicked = true; // 5 players, 1 kicked -> 4 active
    expect(room.lapsPerBook).toBeNull();

    const socket = makeFakeSocket();
    const ack = vi.fn();
    onStartGame(
      socket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      ack,
    );

    // 4 active -> defaultLapsPerBook(4) === 2. Raw players.length (5) would give 1.
    expect(room.lapsPerBook).toBe(2);
  });

  it('measures the minimum-player gate against the active roster: 3-player lobby with 1 kicked (2 active)', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    const adaId = room.players[0]!.id;
    room.players[2]!.kicked = true; // 3 players, 1 kicked -> 2 active

    // Without the acknowledgement, 2 active < 3 is rejected — even though
    // raw players.length (3) would clear the floor.
    const rejectSocket = makeFakeSocket();
    const rejectAck = vi.fn();
    onStartGame(rejectSocket, store, { roomId: room.id, playerId: adaId }, rejectAck);
    expect(rejectAck).toHaveBeenCalledWith({ error: 'too-few-players' });
    expect(room.status).toBe('lobby');

    // With the acknowledgement, the small game starts.
    const startSocket = makeFakeSocket();
    const startAck = vi.fn();
    onStartGame(
      startSocket,
      store,
      { roomId: room.id, playerId: adaId, acknowledgeSmallGame: true },
      startAck,
    );
    expect(room.status).toBe('writing');
    expect(startAck).toHaveBeenCalledWith(expect.objectContaining({ room: expect.any(Object) }));
  });

  it('regression: an all-present 5-player lobby resolves gate and laps exactly as before (5 active -> 1 lap)', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Lin' });
    joinRoom(store, { roomId: room.id, playerName: 'Kay' });
    joinRoom(store, { roomId: room.id, playerName: 'Mae' });
    const adaId = room.players[0]!.id;
    expect(room.lapsPerBook).toBeNull();

    // No acknowledgement needed: 5 active clears the floor.
    const socket = makeFakeSocket();
    const ack = vi.fn();
    onStartGame(socket, store, { roomId: room.id, playerId: adaId }, ack);

    expect(room.status).toBe('writing');
    // 5 active -> defaultLapsPerBook(5) === 1.
    expect(room.lapsPerBook).toBe(1);
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

/**
 * Prompt rating (datamodel.md Normalization Rules — Prompt rating).
 *
 * Three of these assert that NOTHING happens. They are written that way
 * on purpose: "the rating is ignored" is exactly the behavior a later
 * refactor breaks silently, and none of the positive-path tests would
 * notice.
 */
describe('onSubmitEntry prompt rating', () => {
  const logger = createLogger(() => {});
  const OPENING_PHRASE = CURATED_PHRASE_BANK[0]!;
  // Deliberately different from the opening phrase, and shaped like what
  // a drawing turn actually submits. If the handler ever records
  // `input.content` instead of the book's opening phrase, these tests
  // fail loudly rather than tallying stroke data against the bank.
  const STROKE_DATA = '{"ops":[{"type":"stroke","points":[[1,2],[3,4]]}]}';

  function fakeCurationStore() {
    const calls: Array<[string, string, boolean]> = [];
    const store = {
      recordRating: (phrase: string, value: PromptRatingValue, isBank: boolean) => {
        calls.push([phrase, value, isBank]);
      },
      aggregate: async () => ({ ratings: {}, candidates: [] }),
      settled: async () => {},
    } as CurationStore;
    return { store, calls };
  }

  /** A three-player room whose first book already has its opening phrase in. */
  function roomAtPositionOne(openingContent: string) {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Linus' });
    const [ada, grace, linus] = room.players as [Player, Player, Player];

    onStartGame(
      makeFakeSocket(),
      store,
      { roomId: room.id, playerId: ada.id, acknowledgeSmallGame: true },
      vi.fn(),
    );

    // Every player submits their opening phrase, so the round advances and
    // position 1 opens on each book.
    for (const player of [ada, grace, linus]) {
      const book = room.books.find((b) => b.originAuthorId === player.id)!;
      onSubmitEntry(
        makeFakeSocket(),
        store,
        logger,
        {
          roomId: room.id,
          playerId: player.id,
          bookId: book.id,
          content: player.id === ada.id ? openingContent : 'some other opening phrase',
        },
        vi.fn(),
      );
    }

    const adasBook = room.books.find((b) => b.originAuthorId === ada.id)!;
    const drawerId = computeNextEntry(room, adasBook)!.authorId;
    return { store, room, adasBook, drawerId };
  }

  it('records a rating cast on a position-1 submission', () => {
    const { store, room, adasBook, drawerId } = roomAtPositionOne(OPENING_PHRASE);
    const { store: curation, calls } = fakeCurationStore();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        playerId: drawerId,
        bookId: adasBook.id,
        content: STROKE_DATA,
        rating: 'up',
      },
      vi.fn(),
      curation,
    );

    expect(calls).toHaveLength(1);
  });

  it('rates the OPENING PHRASE, not the drawing that was submitted', () => {
    const { store, room, adasBook, drawerId } = roomAtPositionOne(OPENING_PHRASE);
    const { store: curation, calls } = fakeCurationStore();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        playerId: drawerId,
        bookId: adasBook.id,
        content: STROKE_DATA,
        rating: 'up',
      },
      vi.fn(),
      curation,
    );

    // The phrase recorded is the book's position-0 content — the thing
    // that was drawn — never the position-1 stroke payload.
    expect(calls[0]).toEqual([OPENING_PHRASE, 'up', true]);
    expect(calls[0]![0]).not.toBe(STROKE_DATA);
  });

  it('routes a player-written opening phrase to the candidate pool', async () => {
    const written = 'a moose reading the evening news aloud to nobody';
    const { store, room, adasBook, drawerId } = roomAtPositionOne(written);
    const { store: curation, calls } = fakeCurationStore();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        playerId: drawerId,
        bookId: adasBook.id,
        content: STROKE_DATA,
        rating: 'up',
      },
      vi.fn(),
      curation,
    );

    expect(calls[0]).toEqual([written, 'up', false]);
  });

  it('records nothing when no rating is present, and the turn submits normally', () => {
    const { store, room, adasBook, drawerId } = roomAtPositionOne(OPENING_PHRASE);
    const { store: curation, calls } = fakeCurationStore();
    const ack = vi.fn();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      { roomId: room.id, playerId: drawerId, bookId: adasBook.id, content: STROKE_DATA },
      ack,
      curation,
    );

    expect(calls).toEqual([]);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ entry: expect.any(Object) }));
  });

  it('IGNORES a rating sent on a position-0 submission', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Linus' });
    const ada = room.players[0]!;
    onStartGame(
      makeFakeSocket(),
      store,
      { roomId: room.id, playerId: ada.id, acknowledgeSmallGame: true },
      vi.fn(),
    );
    const book = room.books.find((b) => b.originAuthorId === ada.id)!;
    const { store: curation, calls } = fakeCurationStore();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        playerId: ada.id,
        bookId: book.id,
        content: OPENING_PHRASE,
        rating: 'up',
      },
      vi.fn(),
      curation,
    );

    // Position 0 IS the prompt; there is nothing above it to rate.
    expect(calls).toEqual([]);
  });

  it('IGNORES a rating sent on a position-2 submission', () => {
    const { store, room, adasBook, drawerId } = roomAtPositionOne(OPENING_PHRASE);
    // Advance every book past position 1 so position 2 opens.
    for (const book of room.books) {
      const next = computeNextEntry(room, book)!;
      onSubmitEntry(
        makeFakeSocket(),
        store,
        logger,
        { roomId: room.id, playerId: next.authorId, bookId: book.id, content: STROKE_DATA },
        vi.fn(),
      );
    }
    const nextAt2 = computeNextEntry(room, adasBook)!;
    expect(nextAt2.position).toBe(2);
    const { store: curation, calls } = fakeCurationStore();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        playerId: nextAt2.authorId,
        bookId: adasBook.id,
        content: 'a guess about the drawing',
        rating: 'down',
      },
      vi.fn(),
      curation,
    );

    // Position 2 describes a DRAWING, not a prompt — nothing to curate.
    expect(calls).toEqual([]);
    expect(drawerId).toBeDefined();
  });

  it('never gates or fails a submission — a rating with no curation store still submits', () => {
    const { store, room, adasBook, drawerId } = roomAtPositionOne(OPENING_PHRASE);
    const ack = vi.fn();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        playerId: drawerId,
        bookId: adasBook.id,
        content: STROKE_DATA,
        rating: 'up',
      },
      ack,
      // No curation store injected at all.
    );

    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ entry: expect.any(Object) }));
    expect(ack).not.toHaveBeenCalledWith(expect.objectContaining({ error: expect.anything() }));
  });
});

/**
 * The integration point between T013's origin resolution and T006's
 * routing, exercised through the REAL curation store rather than a fake —
 * so a mismatch between what the handler passes and what the store does
 * with it cannot hide behind a stub.
 *
 * Note what is NOT asserted here: `Room.promptMode`. Mode correlates with
 * origin but never determines it — the destination is decided by set
 * membership alone, which is why a free-form phrase that happens to be in
 * the bank lands in the bank tally.
 */
describe('onSubmitEntry rating routing (real curation store)', () => {
  const logger = createLogger(() => {});
  const STROKE_DATA = '{"ops":[{"type":"stroke","points":[[0,0],[9,9]]}]}';
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'curation-e2e-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function submitRatedDrawing(
    openingContent: string,
    rating: PromptRatingValue,
    options: { maxEvents?: number } = {},
  ) {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    joinRoom(store, { roomId: room.id, playerName: 'Linus' });
    const players = room.players as [Player, Player, Player];
    onStartGame(
      makeFakeSocket(),
      store,
      { roomId: room.id, playerId: players[0].id, acknowledgeSmallGame: true },
      vi.fn(),
    );

    for (const player of players) {
      const book = room.books.find((b) => b.originAuthorId === player.id)!;
      onSubmitEntry(
        makeFakeSocket(),
        store,
        logger,
        {
          roomId: room.id,
          playerId: player.id,
          bookId: book.id,
          content: player.id === players[0].id ? openingContent : 'another opening phrase',
        },
        vi.fn(),
      );
    }

    const adasBook = room.books.find((b) => b.originAuthorId === players[0].id)!;
    const drawer = computeNextEntry(room, adasBook)!;
    const curation = createCurationStore(join(dir, 'c.json'), logger, options);
    const ack = vi.fn();

    onSubmitEntry(
      makeFakeSocket(),
      store,
      logger,
      {
        roomId: room.id,
        playerId: drawer.authorId,
        bookId: adasBook.id,
        content: STROKE_DATA,
        rating,
      },
      ack,
      curation,
    );

    return { curation, ack };
  }

  it('routes a curated-bank opening phrase to the bank tally', async () => {
    const phrase = CURATED_PHRASE_BANK[0]!;

    const { curation } = submitRatedDrawing(phrase, 'up');

    await curation.settled();
    const aggregate = await curation.aggregate();

    expect(aggregate.ratings[phrase]).toEqual({ phrase, up: 1, down: 0 });
    expect(aggregate.candidates).toEqual([]);
  });

  it('routes a player-written opening phrase to the candidate pool', async () => {
    const written = 'a moose reading the evening news aloud to nobody';

    const { curation } = submitRatedDrawing(written, 'up');

    await curation.settled();
    const aggregate = await curation.aggregate();

    expect(aggregate.candidates).toEqual([
      { phrase: written, votes: 1, firstLoggedAt: expect.any(Number) },
    ]);
    expect(aggregate.ratings).toEqual({});
  });

  it('records a thumbs-down on a bank phrase against the bank tally', async () => {
    const phrase = CURATED_PHRASE_BANK[1]!;

    const { curation } = submitRatedDrawing(phrase, 'down');

    await curation.settled();
    const aggregate = await curation.aggregate();

    expect(aggregate.ratings[phrase]).toEqual({ phrase, up: 0, down: 1 });
  });

  it('records a thumbs-down on a player-written phrase NOWHERE', async () => {
    const written = 'a moose reading the evening news aloud to nobody';

    const { curation } = submitRatedDrawing(written, 'down');

    await curation.settled();
    const aggregate = await curation.aggregate();

    expect(aggregate).toEqual({ ratings: {}, candidates: [] });
  });

  it('a turn still submits successfully with the curation store at its limit', async () => {
    // T016 / plan Open Question 2 -- curation is TELEMETRY. Reaching the
    // accumulation bound must degrade curation and nothing else; it must
    // never block, fail, or slow a game turn. Without this test the bound
    // could be made blocking and every other curation test would still pass.
    const phrase = CURATED_PHRASE_BANK[0]!;

    // maxEvents: 0 -- the store is full before it has written anything.
    const { curation, ack } = submitRatedDrawing(phrase, 'up', { maxEvents: 0 });

    await curation.settled();
    const aggregate = await curation.aggregate();

    // The rating was silently discarded...
    expect(aggregate).toEqual({ ratings: {}, candidates: [] });
    // ...but the turn itself landed: the drawing is in the book.
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ entry: expect.objectContaining({ content: STROKE_DATA }) }),
    );
  });

  it('never tallies stroke data — nothing in the store resembles the drawing payload', async () => {
    const phrase = CURATED_PHRASE_BANK[0]!;

    const { curation } = submitRatedDrawing(phrase, 'up');

    await curation.settled();
    const aggregate = await curation.aggregate();

    const serialized = JSON.stringify(aggregate);
    expect(serialized).not.toContain('ops');
    expect(serialized).not.toContain('stroke');
  });
});

describe('onSubmitEntry content length cap (datamodel.md Normalization Rules)', () => {
  /**
   * Builds a drawing payload of roughly the shape DrawingCanvas.svelte
   * actually produces: full-precision float coordinates, ~47 bytes per
   * point, no rounding or simplification. See shared/src/entryLimits.ts
   * for the measurements these tests are calibrated against.
   */
  function drawingPayload(strokes: number, pointsPerStroke: number, fills: number): string {
    const scale = 800 / 393.3333333333333;
    const pt = (i: number, j: number) => ({
      x: (120 + Math.sin(i * 0.3 + j) * 90 - 12.5) * scale,
      y: (200 + Math.cos(i * 0.2 + j) * 70 - 63.75) * scale,
    });
    const ops: unknown[] = [];
    for (let s = 0; s < strokes; s += 1) {
      const points = [];
      for (let p = 0; p < pointsPerStroke; p += 1) points.push(pt(p, s));
      ops.push({ type: 'stroke', points, color: '#3355aa', width: 3 });
    }
    for (let f = 0; f < fills; f += 1) ops.push({ type: 'fill', point: pt(f, 1), color: '#ffee00' });
    return JSON.stringify(ops);
  }

  /** A room mid-game whose next expected entry is a drawing at position 1. */
  function roomAwaitingDrawing() {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const [adaId, graceId] = room.players.map((p) => p.id);
    const adaBook = room.books.find((b) => b.originAuthorId === adaId)!;
    adaBook.entries.push({
      id: 'e0',
      bookId: adaBook.id,
      authorId: adaId!,
      position: 0,
      type: 'text',
      content: 'a phrase',
    });
    // Both books must sit at the same round, or the submission is
    // refused as round-not-open before the size check is ever reached.
    const graceBook = room.books.find((b) => b.originAuthorId === graceId)!;
    graceBook.entries.push({
      id: 'g0',
      bookId: graceBook.id,
      authorId: graceId!,
      position: 0,
      type: 'text',
      content: 'another phrase',
    });
    return { store, room, adaBook, graceId: graceId! };
  }

  it('rejects an oversize TEXT entry rather than truncating it', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const adaId = room.players[0]!.id;
    const adaBook = room.books[0]!;
    const ack = vi.fn();

    const oversize = 'x'.repeat(MAX_TEXT_ENTRY_BYTES + 1);
    onSubmitEntry(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, content: oversize },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'entry-too-large' });
    // Never truncated, and never reaches in-memory game state.
    expect(adaBook.entries).toHaveLength(0);
  });

  it('rejects an oversize DRAWING payload rather than truncating it', () => {
    const { store, room, adaBook, graceId } = roomAwaitingDrawing();
    const ack = vi.fn();

    // ~3.6 MB: the "extreme" row in entryLimits.ts, deliberately above the cap.
    const oversize = drawingPayload(200, 400, 20);
    expect(entryContentBytes(oversize)).toBeGreaterThan(MAX_DRAWING_ENTRY_BYTES);

    onSubmitEntry(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: graceId, bookId: adaBook.id, content: oversize },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'entry-too-large' });
    expect(adaBook.entries).toHaveLength(1);
  });

  it('ACCEPTS a realistic very-dense drawing near the limit', () => {
    // The regression guard that matters most (plan Complexity Tracking):
    // without it, a cap set far too low still passes both rejection tests
    // above while silently breaking real gameplay. This is the measured
    // "very dense" payload -- 120 strokes, 30,000 points, ~1.4 MB -- an
    // already-elaborate drawing that MUST go through.
    const { store, room, adaBook, graceId } = roomAwaitingDrawing();
    const ack = vi.fn();

    const dense = drawingPayload(120, 250, 15);
    const bytes = entryContentBytes(dense);
    expect(bytes).toBeGreaterThan(1_000_000);
    expect(bytes).toBeLessThan(MAX_DRAWING_ENTRY_BYTES);

    onSubmitEntry(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: graceId, bookId: adaBook.id, content: dense },
      ack,
    );

    expect(ack).not.toHaveBeenCalledWith({ error: 'entry-too-large' });
    expect(adaBook.entries).toHaveLength(2);
    expect(adaBook.entries[1]!.content).toBe(dense);
  });
});

describe('onSetReadingBook (reveal read-state, datamodel.md / infrastructure.md)', () => {
  function revealRoomWithBook() {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    room.status = 'reveal';
    room.books = createBooksForRoom(room);
    return { store, room, bookId: room.books[0]!.id, playerId: room.players[0]!.id };
  }

  it('opening a book sets currentlyReading for that player', () => {
    const { store, room, bookId, playerId } = revealRoomWithBook();
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});
    const ack = vi.fn();

    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId }, ack);

    expect(room.currentlyReading[playerId]).toBe(bookId);
    expect(room.bookReads).toEqual({});
    expect(ack).toHaveBeenCalledWith({ room });
  });

  it('closing (null) appends the player to bookReads deduped and clears currentlyReading', () => {
    const { store, room, bookId, playerId } = revealRoomWithBook();
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});

    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId }, vi.fn());
    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId: null }, vi.fn());

    expect(room.bookReads[bookId]).toEqual([playerId]);
    expect(room.currentlyReading[playerId]).toBeUndefined();
  });

  it('a second close for an already-recorded player does not duplicate', () => {
    const { store, room, bookId, playerId } = revealRoomWithBook();
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});

    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId }, vi.fn());
    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId: null }, vi.fn());
    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId }, vi.fn());
    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId: null }, vi.fn());

    expect(room.bookReads[bookId]).toEqual([playerId]);
  });

  it('switching directly to another book credits the prior book as a completed read', () => {
    const { store, room, playerId } = revealRoomWithBook();
    const [bookA, bookB] = [room.books[0]!.id, room.books[1]!.id];
    const socket = makeFakeSocket();
    const logger = createLogger(() => {});

    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId: bookA }, vi.fn());
    onSetReadingBook(socket, store, logger, { roomId: room.id, playerId, bookId: bookB }, vi.fn());

    expect(room.bookReads[bookA]).toEqual([playerId]);
    expect(room.currentlyReading[playerId]).toBe(bookB);
  });

  it('rejects when the room status is not reveal', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'writing';
    room.books = createBooksForRoom(room);
    const ack = vi.fn();

    onSetReadingBook(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: room.players[0]!.id, bookId: room.books[0]?.id ?? 'x' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'room-not-in-reveal' });
  });

  it('rejects an unknown book id', () => {
    const { store, room, playerId } = revealRoomWithBook();
    const ack = vi.fn();

    onSetReadingBook(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId, bookId: 'no-such-book' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'book-not-found' });
    expect(room.currentlyReading[playerId]).toBeUndefined();
  });

  it('rejects an unknown room', () => {
    const ack = vi.fn();
    onSetReadingBook(
      makeFakeSocket(),
      createRoomStore(),
      createLogger(() => {}),
      { roomId: 'NOPE', playerId: 'p', bookId: null },
      ack,
    );
    expect(ack).toHaveBeenCalledWith({ error: 'room-not-found' });
  });
});

describe('onDisconnect reveal read-state cleanup (datamodel.md)', () => {
  it('removes a mid-read player from currentlyReading without crediting a completed read', () => {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'reveal';
    room.books = createBooksForRoom(room);
    const playerId = room.players[0]!.id;
    const bookId = room.books[0]!.id;
    room.currentlyReading[playerId] = bookId;

    const socket = makeFakeSocket();
    socket.data.playerId = playerId;
    socket.data.roomId = room.id;

    onDisconnect(socket, store, createLogger(() => {}));

    expect(room.currentlyReading[playerId]).toBeUndefined();
    expect(room.bookReads[bookId]).toBeUndefined();
    expect(room.players[0]!.connected).toBe(false);
  });
});

describe('onSubmitCover (T005/T006 — cover-decoration finalize)', () => {
  // Builds a 2-player room in the `decorating` window with fresh books.
  function setUpDecoratingRoom() {
    const store = createRoomStore();
    const room = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: room.id, playerName: 'Grace' });
    room.status = 'decorating';
    room.decorationWindowStartedAt = Date.now();
    room.coverSubmissions = [];
    room.books = createBooksForRoom(room);
    const [adaId, graceId] = room.players.map((p) => p.id);
    const adaBook = room.books.find((b) => b.originAuthorId === adaId)!;
    const graceBook = room.books.find((b) => b.originAuthorId === graceId)!;
    return { store, room, adaId: adaId!, graceId: graceId!, adaBook, graceBook };
  }

  const sampleCover: DrawOps = [
    { type: 'stroke', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: '#ff6f91', width: 3 },
  ];

  it('stores cover + coverTemplate on the caller OWN book and appends to coverSubmissions', () => {
    const { store, room, adaId, adaBook } = setUpDecoratingRoom();
    const ack = vi.fn();
    onSubmitCover(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, cover: sampleCover, coverTemplate: 'fan-deco' },
      ack,
    );

    expect(adaBook.cover).toEqual(sampleCover);
    expect(adaBook.coverTemplate).toBe('fan-deco');
    expect(room.coverSubmissions).toContain(adaId);
    // Not everyone has submitted yet — still decorating.
    expect(room.status).toBe('decorating');
  });

  it('rejects finalizing a book the caller does not own (originAuthorId mismatch)', () => {
    const { store, room, adaId, graceBook } = setUpDecoratingRoom();
    const ack = vi.fn();
    onSubmitCover(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: adaId, bookId: graceBook.id, cover: sampleCover, coverTemplate: null },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'not-your-book' });
    expect(graceBook.cover ?? null).toBeNull();
    expect(room.coverSubmissions).not.toContain(adaId);
  });

  it('rejects an oversize cover payload with the same drawing cap as onSubmitEntry', () => {
    const { store, room, adaId, adaBook } = setUpDecoratingRoom();
    // A single stroke whose serialized form exceeds MAX_DRAWING_ENTRY_BYTES.
    const points = Array.from({ length: 200_000 }, (_, i) => ({ x: i, y: i }));
    const huge: DrawOps = [{ type: 'stroke', points, color: '#000000', width: 3 }];
    expect(serializeDrawOps(huge).length).toBeGreaterThan(MAX_DRAWING_ENTRY_BYTES);

    const ack = vi.fn();
    onSubmitCover(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, cover: huge, coverTemplate: null },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ error: 'cover-too-large' });
    expect(adaBook.cover ?? null).toBeNull();
    expect(room.coverSubmissions).not.toContain(adaId);
  });

  it('dedupes coverSubmissions when a player finalizes twice', () => {
    const { store, room, adaId, adaBook } = setUpDecoratingRoom();
    for (let i = 0; i < 2; i++) {
      onSubmitCover(
        makeFakeSocket(),
        store,
        createLogger(() => {}),
        { roomId: room.id, playerId: adaId, bookId: adaBook.id, cover: sampleCover, coverTemplate: null },
        vi.fn(),
      );
    }
    expect(room.coverSubmissions!.filter((id) => id === adaId)).toHaveLength(1);
  });

  it('synchronously transitions to reveal once every active player has submitted', () => {
    const { store, room, adaId, graceId, adaBook, graceBook } = setUpDecoratingRoom();
    onSubmitCover(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: adaId, bookId: adaBook.id, cover: sampleCover, coverTemplate: null },
      vi.fn(),
    );
    expect(room.status).toBe('decorating');

    onSubmitCover(
      makeFakeSocket(),
      store,
      createLogger(() => {}),
      { roomId: room.id, playerId: graceId, bookId: graceBook.id, cover: [], coverTemplate: null },
      vi.fn(),
    );

    expect(room.status).toBe('reveal');
    expect(room.decorationWindowStartedAt).toBeNull();
  });
});
