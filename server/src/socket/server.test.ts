import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoomStore, type RoomStore } from '../domain/roomStore.js';
import { createLogger } from '../observability/logger.js';
import { waitFor, waitForEvent } from '../test-support/waitFor.js';
import { createSocketServer } from './server.js';
import type {
  CreateRoomAck,
  EndGameAck,
  JoinRoomAck,
  PlayAgainAck,
  RejoinAck,
  StartGameAck,
  SubmitEntryAck,
} from './handlers.js';

describe('Socket.IO server bootstrap (onCreateRoom / onJoinRoom)', () => {
  let httpServer: HttpServer;
  let store: RoomStore;
  let clientA: ClientSocket;
  let clientB: ClientSocket;
  let port: number;

  beforeEach(async () => {
    store = createRoomStore();
    httpServer = createServer();
    createSocketServer(httpServer, store);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    clientA?.close();
    clientB?.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('onCreateRoom creates a room and returns it to the caller', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');

    const ack = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;

    expect(ack.error).toBeUndefined();
    expect(ack.room?.status).toBe('lobby');
    expect(ack.room?.players).toHaveLength(1);
    expect(ack.room?.players[0]?.name).toBe('Ada');
    expect(ack.player?.id).toBe(ack.room?.hostPlayerId);
  });

  it('onJoinRoom adds a player to an existing room and both clients are in the socket.io room', async () => {
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

    expect(joinAck.error).toBeUndefined();
    expect(joinAck.room?.players).toHaveLength(2);
    expect(joinAck.room?.players.map((p) => p.name)).toEqual(['Ada', 'Grace']);
  });

  it('onJoinRoom returns an error for an unknown room code', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');

    const ack = (await clientA
      .timeout(5000)
      .emitWithAck('joinRoom', { roomId: 'NOPE1', playerName: 'Grace' })) as JoinRoomAck;

    expect(ack.error).toBe('room-not-found');
    expect(ack.room).toBeUndefined();
  });

  it('onJoinRoom rejects a late join once the game has started (ui.md Error state)', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;

    await clientA.timeout(5000).emitWithAck('startGame', {
      roomId,
      playerId: createAck.room!.hostPlayerId,
      acknowledgeSmallGame: true,
    });

    clientB = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientB, 'connect');
    const joinAck = (await clientB
      .timeout(5000)
      .emitWithAck('joinRoom', { roomId, playerName: 'Grace' })) as JoinRoomAck;

    expect(joinAck.error).toBe('room-already-started');
    expect(joinAck.room).toBeUndefined();
    expect(joinAck.player).toBeUndefined();
  });

  it('onStartGame lets the host start the game, moving the room out of lobby', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;

    const ack = (await clientA.timeout(5000).emitWithAck('startGame', {
      roomId,
      playerId: createAck.room!.hostPlayerId,
      acknowledgeSmallGame: true,
    })) as StartGameAck;

    expect(ack.error).toBeUndefined();
    expect(ack.room?.status).toBe('writing');
  });

  it('onStartGame creates one empty Book per player, one per originAuthor', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;

    clientB = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientB, 'connect');
    await clientB.timeout(5000).emitWithAck('joinRoom', { roomId, playerName: 'Grace' });

    const ack = (await clientA.timeout(5000).emitWithAck('startGame', {
      roomId,
      playerId: createAck.room!.hostPlayerId,
      acknowledgeSmallGame: true,
    })) as StartGameAck;

    expect(ack.room?.books).toHaveLength(2);
    expect(ack.room?.books.every((book) => book.entries.length === 0)).toBe(true);
    expect(ack.room?.books.map((book) => book.originAuthorId).sort()).toEqual(
      ack.room?.players.map((p) => p.id).sort(),
    );
  });

  it('onStartGame rejects a non-host caller', async () => {
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
      .emitWithAck('startGame', { roomId, playerId: joinAck.player!.id })) as StartGameAck;

    expect(ack.error).toBe('not-host');
  });
});

describe('onSubmitEntry', () => {
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

  async function setUpTwoPlayerGame() {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;
    const adaId = createAck.room!.hostPlayerId;

    clientB = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientB, 'connect');
    const joinAck = (await clientB
      .timeout(5000)
      .emitWithAck('joinRoom', { roomId, playerName: 'Grace' })) as JoinRoomAck;
    const graceId = joinAck.player!.id;

    // Pin to a single lap: this helper is used by tests exercising
    // submission/completion/reconnect flows, not laps-per-book behavior.
    store.getRoom(roomId)!.lapsPerBook = 1;

    const startAck = (await clientA.timeout(5000).emitWithAck('startGame', {
      roomId,
      playerId: adaId,
      acknowledgeSmallGame: true,
    })) as StartGameAck;

    return { roomId, adaId, graceId, books: startAck.room!.books };
  }

  it('accepts the origin author submitting the first entry of their own book', async () => {
    const { roomId, adaId, books } = await setUpTwoPlayerGame();
    const adaBook = books.find((b) => b.originAuthorId === adaId)!;

    const ack = (await clientA.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: adaId,
      bookId: adaBook.id,
      content: 'a spoonful of sugar',
    })) as SubmitEntryAck;

    expect(ack.error).toBeUndefined();
    const updatedBook = ack.room?.books.find((b) => b.id === adaBook.id);
    expect(updatedBook?.entries).toHaveLength(1);
    expect(updatedBook?.entries[0]).toMatchObject({
      authorId: adaId,
      position: 0,
      type: 'text',
      content: 'a spoonful of sugar',
    });
  });

  it('rejects a submission from a player whose turn it is not', async () => {
    const { roomId, graceId, books } = await setUpTwoPlayerGame();
    const adaBook = books.find((b) => b.originAuthorId !== graceId)!;

    const ack = (await clientB.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: graceId,
      bookId: adaBook.id,
      content: 'wrong turn',
    })) as SubmitEntryAck;

    expect(ack.error).toBe('not-your-turn');
  });

  it('moves the room to reveal once every book is complete', async () => {
    const { roomId, adaId, graceId, books } = await setUpTwoPlayerGame();
    const adaBook = books.find((b) => b.originAuthorId === adaId)!;
    const graceBook = books.find((b) => b.originAuthorId === graceId)!;

    // Round 1: each player writes the origin prompt for their own book.
    (await clientA.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: adaId,
      bookId: adaBook.id,
      content: 'phrase one',
    })) as SubmitEntryAck;
    (await clientB.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: graceId,
      bookId: graceBook.id,
      content: 'phrase two',
    })) as SubmitEntryAck;

    // Round 2: each player draws the other's book (2-player rotation).
    (await clientB.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: graceId,
      bookId: adaBook.id,
      content: 'stroke-data-1',
    })) as SubmitEntryAck;
    const finalAck = (await clientA.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: adaId,
      bookId: graceBook.id,
      content: 'stroke-data-2',
    })) as SubmitEntryAck;

    expect(finalAck.room?.status).toBe('reveal');
  });
});

describe('reconnect tolerance (onRejoin / disconnect)', () => {
  let httpServer: HttpServer;
  let store: RoomStore;
  let clientA: ClientSocket;
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
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('a dropped connection can resume the same seat with its session token', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const token = createAck.player!.sessionToken;
    const roomId = createAck.room!.id;
    const playerId = createAck.player!.id;

    // Simulate a dropped connection: close and wait for the server to
    // actually process the disconnect (not a guessed sleep) before
    // reconnecting with a new socket.
    clientA.close();
    await waitFor(
      () => store.getRoom(roomId)?.players.find((p) => p.id === playerId)?.connected === false,
      { description: `player ${playerId} to be marked disconnected` },
    );

    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const rejoinAck = (await clientA.timeout(5000).emitWithAck('rejoin', { token })) as RejoinAck;

    expect(rejoinAck.error).toBeUndefined();
    expect(rejoinAck.player?.id).toBe(createAck.player!.id);
    expect(rejoinAck.room?.id).toBe(createAck.room!.id);
    expect(rejoinAck.player?.connected).toBe(true);
  });

  it('rejects an unknown or expired token as a new join (distinct error)', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');

    const ack = (await clientA
      .timeout(5000)
      .emitWithAck('rejoin', { token: 'never-issued' })) as RejoinAck;

    expect(ack.error).toBe('invalid-token');
    expect(ack.room).toBeUndefined();
  });

  it('marks a disconnected player as not connected without removing their seat', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;
    const playerId = createAck.player!.id;

    clientA.close();
    await waitFor(
      () => store.getRoom(roomId)?.players.find((p) => p.id === playerId)?.connected === false,
      { description: `player ${playerId} to be marked disconnected` },
    );

    const room = store.getRoom(roomId);
    expect(room?.players).toHaveLength(1);
    expect(room?.players.find((p) => p.id === playerId)?.connected).toBe(false);
  });
});

describe('rejoin-after-room-ended rejection', () => {
  let httpServer: HttpServer;
  let store: RoomStore;
  let clientA: ClientSocket;
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
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('onEndGame lets the host mark the room ended', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;

    // Put the room into 'reveal' directly — bypassing the full game flow,
    // matching how onPlayAgain's tests set up preconditions.
    store.getRoom(createAck.room!.id)!.status = 'reveal';

    const ack = (await clientA.timeout(5000).emitWithAck('endGame', {
      roomId: createAck.room!.id,
      playerId: createAck.room!.hostPlayerId,
    })) as EndGameAck;

    expect(ack.error).toBeUndefined();
    expect(ack.room?.status).toBe('ended');
  });

  it('onEndGame succeeds from lobby or writing, not just reveal (host-only-anytime, moderation plan)', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;

    const lobbyAck = (await clientA.timeout(5000).emitWithAck('endGame', {
      roomId: createAck.room!.id,
      playerId: createAck.room!.hostPlayerId,
    })) as EndGameAck;
    expect(lobbyAck.error).toBeUndefined();
    expect(store.getRoom(createAck.room!.id)?.status).toBe('ended');

    const createAck2 = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Grace' })) as CreateRoomAck;
    store.getRoom(createAck2.room!.id)!.status = 'writing';

    const writingAck = (await clientA.timeout(5000).emitWithAck('endGame', {
      roomId: createAck2.room!.id,
      playerId: createAck2.room!.hostPlayerId,
    })) as EndGameAck;
    expect(writingAck.error).toBeUndefined();
    expect(store.getRoom(createAck2.room!.id)?.status).toBe('ended');
  });

  it('a valid token against an ended room gets a clear "game has ended" response, not a silent no-op', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const token = createAck.player!.sessionToken;
    const roomId = createAck.room!.id;
    const playerId = createAck.player!.id;

    store.getRoom(createAck.room!.id)!.status = 'reveal';

    (await clientA.timeout(5000).emitWithAck('endGame', {
      roomId: createAck.room!.id,
      playerId: createAck.room!.hostPlayerId,
    })) as EndGameAck;

    clientA.close();
    await waitFor(
      () => store.getRoom(roomId)?.players.find((p) => p.id === playerId)?.connected === false,
      { description: `player ${playerId} to be marked disconnected` },
    );
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');

    const rejoinAck = (await clientA.timeout(5000).emitWithAck('rejoin', { token })) as RejoinAck;

    expect(rejoinAck.error).toBe('game-ended');
    expect(rejoinAck.room).toBeUndefined();
    expect(rejoinAck.player).toBeUndefined();
  });
});

describe('observability (structured log events)', () => {
  let httpServer: HttpServer;
  let store: RoomStore;
  let clientA: ClientSocket;
  let clientB: ClientSocket;
  let port: number;
  let lines: string[];

  beforeEach(async () => {
    store = createRoomStore();
    lines = [];
    const logger = createLogger((line) => lines.push(line));
    httpServer = createServer();
    createSocketServer(httpServer, store, undefined, logger);
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    clientA?.close();
    clientB?.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function parsedEvents(): Array<Record<string, unknown>> {
    return lines.map((line) => JSON.parse(line));
  }

  it('logs room creation, join, turn advance, and game completion with outcome and identifiers', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const roomId = createAck.room!.id;
    const adaId = createAck.room!.hostPlayerId;

    clientB = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientB, 'connect');
    const joinAck = (await clientB
      .timeout(5000)
      .emitWithAck('joinRoom', { roomId, playerName: 'Grace' })) as JoinRoomAck;
    const graceId = joinAck.player!.id;

    // Pin to a single lap: this test is about observability logging, not
    // laps-per-book behavior.
    store.getRoom(roomId)!.lapsPerBook = 1;

    const startAck = (await clientA.timeout(5000).emitWithAck('startGame', {
      roomId,
      playerId: adaId,
      acknowledgeSmallGame: true,
    })) as StartGameAck;
    const adaBook = startAck.room!.books.find((b) => b.originAuthorId === adaId)!;
    const graceBook = startAck.room!.books.find((b) => b.originAuthorId === graceId)!;

    await clientA.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: adaId,
      bookId: adaBook.id,
      content: 'phrase one',
    });
    await clientB.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: graceId,
      bookId: graceBook.id,
      content: 'phrase two',
    });
    await clientB.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: graceId,
      bookId: adaBook.id,
      content: 'stroke-1',
    });
    await clientA.timeout(5000).emitWithAck('submitEntry', {
      roomId,
      playerId: adaId,
      bookId: graceBook.id,
      content: 'stroke-2',
    });

    const events = parsedEvents();
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'room_created', outcome: 'success', roomId }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'player_joined',
        outcome: 'success',
        roomId,
        playerId: graceId,
      }),
    );
    expect(
      events.filter((e) => e.event === 'turn_advanced' && e.outcome === 'success'),
    ).toHaveLength(4);
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'game_completed', outcome: 'success', roomId }),
    );
  });

  it('logs a failed reconnect with the failure reason', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');

    await clientA.timeout(5000).emitWithAck('rejoin', { token: 'never-issued' });

    const events = parsedEvents();
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'player_reconnected',
        outcome: 'failure',
        reason: 'invalid-token',
      }),
    );
  });

  it('logs a successful reconnect and a player leaving (disconnect)', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const token = createAck.player!.sessionToken;
    const roomId = createAck.room!.id;
    const playerId = createAck.player!.id;

    clientA.close();
    await waitFor(
      () => store.getRoom(roomId)?.players.find((p) => p.id === playerId)?.connected === false,
      { description: `player ${playerId} to be marked disconnected` },
    );

    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    await clientA.timeout(5000).emitWithAck('rejoin', { token });

    const events = parsedEvents();
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'player_reconnected',
        outcome: 'success',
        roomId,
        playerId,
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'player_left', outcome: 'success', roomId, playerId }),
    );
  });
});

/**
 * onPlayAgain: host-only, reveal-only "play again" (datamodel.md
 * Normalization Rules — End-of-game controls; infrastructure.md's one
 * exception to the broadcast-one-shared-payload pattern). Uses a
 * local-socket-lookup approach (io.sockets.adapter.rooms.get /
 * io.sockets.sockets.get), not Socket.IO's cross-process fetchSockets()
 * API, since this is a single-process app (Principle I).
 */
describe('onPlayAgain', () => {
  let httpServer: HttpServer;
  let store: RoomStore;
  let clientA: ClientSocket;
  let clientB: ClientSocket;
  let port: number;
  let lines: string[];

  beforeEach(async () => {
    store = createRoomStore();
    lines = [];
    const logger = createLogger((line) => lines.push(line));
    httpServer = createServer();
    createSocketServer(httpServer, store, undefined, logger);
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    clientA?.close();
    clientB?.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function parsedEvents(): Array<Record<string, unknown>> {
    return lines.map((line) => JSON.parse(line));
  }

  it('gives the host a new room/player, pushes the other client its own new roomChanged, and logs room_created with reason play-again', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const oldRoomId = createAck.room!.id;
    const hostId = createAck.room!.hostPlayerId;

    clientB = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientB, 'connect');
    const joinAck = (await clientB
      .timeout(5000)
      .emitWithAck('joinRoom', { roomId: oldRoomId, playerName: 'Grace' })) as JoinRoomAck;
    const graceId = joinAck.player!.id;

    // Put the room into 'reveal' directly — bypassing the full game flow,
    // matching how onEndGame/onSetMonochrome tests set up preconditions.
    store.getRoom(oldRoomId)!.status = 'reveal';

    const roomChangedPromise = waitForEvent<{
      room: PlayAgainAck['room'];
      player: PlayAgainAck['player'];
    }>(clientB, 'roomChanged');

    const ack = (await clientA
      .timeout(5000)
      .emitWithAck('playAgain', { roomId: oldRoomId, playerId: hostId })) as PlayAgainAck;

    expect(ack.error).toBeUndefined();
    expect(ack.room).toBeDefined();
    expect(ack.player).toBeDefined();
    expect(ack.room!.id).not.toBe(oldRoomId);
    expect(ack.player!.id).not.toBe(hostId);

    const changed = await roomChangedPromise;
    expect(changed.room!.id).toBe(ack.room!.id);
    expect(changed.player!.id).not.toBe(hostId);
    expect(changed.player!.id).not.toBe(graceId);
    expect(changed.player!.id).not.toBe(ack.player!.id);

    const events = parsedEvents();
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'room_created',
        outcome: 'success',
        reason: 'play-again',
        previousRoomId: oldRoomId,
      }),
    );
  });

  it('rejects a non-host caller', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const oldRoomId = createAck.room!.id;

    clientB = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientB, 'connect');
    const joinAck = (await clientB
      .timeout(5000)
      .emitWithAck('joinRoom', { roomId: oldRoomId, playerName: 'Grace' })) as JoinRoomAck;

    store.getRoom(oldRoomId)!.status = 'reveal';

    const ack = (await clientB.timeout(5000).emitWithAck('playAgain', {
      roomId: oldRoomId,
      playerId: joinAck.player!.id,
    })) as PlayAgainAck;

    expect(ack.error).toBe('not-host');
  });

  it('rejects when the room is not in reveal', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await waitForEvent(clientA, 'connect');
    const createAck = (await clientA
      .timeout(5000)
      .emitWithAck('createRoom', { hostName: 'Ada' })) as CreateRoomAck;
    const oldRoomId = createAck.room!.id;
    const hostId = createAck.room!.hostPlayerId;

    const ack = (await clientA
      .timeout(5000)
      .emitWithAck('playAgain', { roomId: oldRoomId, playerId: hostId })) as PlayAgainAck;

    expect(ack.error).toBe('room-not-in-reveal');
  });
});
