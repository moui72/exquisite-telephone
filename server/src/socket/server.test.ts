import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoomStore, type RoomStore } from '../domain/roomStore.js';
import { createLogger } from '../observability/logger.js';
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
    await new Promise<void>((resolve) => clientA.on('connect', resolve));

    const ack = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });

    expect(ack.error).toBeUndefined();
    expect(ack.room?.status).toBe('lobby');
    expect(ack.room?.players).toHaveLength(1);
    expect(ack.room?.players[0]?.name).toBe('Ada');
    expect(ack.player?.id).toBe(ack.room?.hostPlayerId);
  });

  it('onJoinRoom adds a player to an existing room and both clients are in the socket.io room', async () => {
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

    expect(joinAck.error).toBeUndefined();
    expect(joinAck.room?.players).toHaveLength(2);
    expect(joinAck.room?.players.map((p) => p.name)).toEqual(['Ada', 'Grace']);
  });

  it('onJoinRoom returns an error for an unknown room code', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));

    const ack = await new Promise<JoinRoomAck>((resolve) => {
      clientA.emit('joinRoom', { roomId: 'NOPE1', playerName: 'Grace' }, resolve);
    });

    expect(ack.error).toBe('room-not-found');
    expect(ack.room).toBeUndefined();
  });

  it('onJoinRoom rejects a late join once the game has started (ui.md Error state)', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;

    await new Promise<void>((resolve) => {
      clientA.emit(
        'startGame',
        { roomId, playerId: createAck.room!.hostPlayerId, acknowledgeSmallGame: true },
        () => resolve(),
      );
    });

    clientB = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));
    const joinAck = await new Promise<JoinRoomAck>((resolve) => {
      clientB.emit('joinRoom', { roomId, playerName: 'Grace' }, resolve);
    });

    expect(joinAck.error).toBe('room-already-started');
    expect(joinAck.room).toBeUndefined();
    expect(joinAck.player).toBeUndefined();
  });

  it('onStartGame lets the host start the game, moving the room out of lobby', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;

    const ack = await new Promise<StartGameAck>((resolve) => {
      clientA.emit(
        'startGame',
        { roomId, playerId: createAck.room!.hostPlayerId, acknowledgeSmallGame: true },
        resolve,
      );
    });

    expect(ack.error).toBeUndefined();
    expect(ack.room?.status).toBe('writing');
  });

  it('onStartGame creates one empty Book per player, one per originAuthor', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;

    clientB = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));
    await new Promise<void>((resolve) => {
      clientB.emit('joinRoom', { roomId, playerName: 'Grace' }, () => resolve());
    });

    const ack = await new Promise<StartGameAck>((resolve) => {
      clientA.emit(
        'startGame',
        { roomId, playerId: createAck.room!.hostPlayerId, acknowledgeSmallGame: true },
        resolve,
      );
    });

    expect(ack.room?.books).toHaveLength(2);
    expect(ack.room?.books.every((book) => book.entries.length === 0)).toBe(true);
    expect(ack.room?.books.map((book) => book.originAuthorId).sort()).toEqual(
      ack.room?.players.map((p) => p.id).sort(),
    );
  });

  it('onStartGame rejects a non-host caller', async () => {
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

    const ack = await new Promise<StartGameAck>((resolve) => {
      clientB.emit('startGame', { roomId, playerId: joinAck.player!.id }, resolve);
    });

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
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;
    const adaId = createAck.room!.hostPlayerId;

    clientB = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));
    const joinAck = await new Promise<JoinRoomAck>((resolve) => {
      clientB.emit('joinRoom', { roomId, playerName: 'Grace' }, resolve);
    });
    const graceId = joinAck.player!.id;

    const startAck = await new Promise<StartGameAck>((resolve) => {
      clientA.emit(
        'startGame',
        { roomId, playerId: adaId, acknowledgeSmallGame: true },
        resolve,
      );
    });

    return { roomId, adaId, graceId, books: startAck.room!.books };
  }

  it('accepts the origin author submitting the first entry of their own book', async () => {
    const { roomId, adaId, books } = await setUpTwoPlayerGame();
    const adaBook = books.find((b) => b.originAuthorId === adaId)!;

    const ack = await new Promise<SubmitEntryAck>((resolve) => {
      clientA.emit(
        'submitEntry',
        { roomId, playerId: adaId, bookId: adaBook.id, content: 'a spoonful of sugar' },
        resolve,
      );
    });

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

    const ack = await new Promise<SubmitEntryAck>((resolve) => {
      clientB.emit(
        'submitEntry',
        { roomId, playerId: graceId, bookId: adaBook.id, content: 'wrong turn' },
        resolve,
      );
    });

    expect(ack.error).toBe('not-your-turn');
  });

  it('moves the room to reveal once every book is complete', async () => {
    const { roomId, adaId, graceId, books } = await setUpTwoPlayerGame();
    const adaBook = books.find((b) => b.originAuthorId === adaId)!;
    const graceBook = books.find((b) => b.originAuthorId === graceId)!;

    // Round 1: each player writes the origin prompt for their own book.
    await new Promise<SubmitEntryAck>((resolve) => {
      clientA.emit(
        'submitEntry',
        { roomId, playerId: adaId, bookId: adaBook.id, content: 'phrase one' },
        resolve,
      );
    });
    await new Promise<SubmitEntryAck>((resolve) => {
      clientB.emit(
        'submitEntry',
        { roomId, playerId: graceId, bookId: graceBook.id, content: 'phrase two' },
        resolve,
      );
    });

    // Round 2: each player draws the other's book (2-player rotation).
    await new Promise<SubmitEntryAck>((resolve) => {
      clientB.emit(
        'submitEntry',
        { roomId, playerId: graceId, bookId: adaBook.id, content: 'stroke-data-1' },
        resolve,
      );
    });
    const finalAck = await new Promise<SubmitEntryAck>((resolve) => {
      clientA.emit(
        'submitEntry',
        { roomId, playerId: adaId, bookId: graceBook.id, content: 'stroke-data-2' },
        resolve,
      );
    });

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
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const token = createAck.player!.sessionToken;

    // Simulate a dropped connection: close and reconnect with a new socket.
    clientA.close();
    await new Promise((resolve) => setTimeout(resolve, 20));

    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const rejoinAck = await new Promise<RejoinAck>((resolve) => {
      clientA.emit('rejoin', { token }, resolve);
    });

    expect(rejoinAck.error).toBeUndefined();
    expect(rejoinAck.player?.id).toBe(createAck.player!.id);
    expect(rejoinAck.room?.id).toBe(createAck.room!.id);
    expect(rejoinAck.player?.connected).toBe(true);
  });

  it('rejects an unknown or expired token as a new join (distinct error)', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));

    const ack = await new Promise<RejoinAck>((resolve) => {
      clientA.emit('rejoin', { token: 'never-issued' }, resolve);
    });

    expect(ack.error).toBe('invalid-token');
    expect(ack.room).toBeUndefined();
  });

  it('marks a disconnected player as not connected without removing their seat', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;
    const playerId = createAck.player!.id;

    clientA.close();
    await new Promise((resolve) => setTimeout(resolve, 20));

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
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });

    // Put the room into 'reveal' directly — bypassing the full game flow,
    // matching how onPlayAgain's tests set up preconditions.
    store.getRoom(createAck.room!.id)!.status = 'reveal';

    const ack = await new Promise<EndGameAck>((resolve) => {
      clientA.emit(
        'endGame',
        { roomId: createAck.room!.id, playerId: createAck.room!.hostPlayerId },
        resolve,
      );
    });

    expect(ack.error).toBeUndefined();
    expect(ack.room?.status).toBe('ended');
  });

  it('onEndGame rejects when the room is not in reveal', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });

    const lobbyAck = await new Promise<EndGameAck>((resolve) => {
      clientA.emit(
        'endGame',
        { roomId: createAck.room!.id, playerId: createAck.room!.hostPlayerId },
        resolve,
      );
    });
    expect(lobbyAck.error).toBe('room-not-in-reveal');
    expect(store.getRoom(createAck.room!.id)?.status).toBe('lobby');

    store.getRoom(createAck.room!.id)!.status = 'writing';

    const writingAck = await new Promise<EndGameAck>((resolve) => {
      clientA.emit(
        'endGame',
        { roomId: createAck.room!.id, playerId: createAck.room!.hostPlayerId },
        resolve,
      );
    });
    expect(writingAck.error).toBe('room-not-in-reveal');
    expect(store.getRoom(createAck.room!.id)?.status).toBe('writing');
  });

  it('a valid token against an ended room gets a clear "game has ended" response, not a silent no-op', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const token = createAck.player!.sessionToken;

    store.getRoom(createAck.room!.id)!.status = 'reveal';

    await new Promise<EndGameAck>((resolve) => {
      clientA.emit(
        'endGame',
        { roomId: createAck.room!.id, playerId: createAck.room!.hostPlayerId },
        resolve,
      );
    });

    clientA.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));

    const rejoinAck = await new Promise<RejoinAck>((resolve) => {
      clientA.emit('rejoin', { token }, resolve);
    });

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
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;
    const adaId = createAck.room!.hostPlayerId;

    clientB = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));
    const joinAck = await new Promise<JoinRoomAck>((resolve) => {
      clientB.emit('joinRoom', { roomId, playerName: 'Grace' }, resolve);
    });
    const graceId = joinAck.player!.id;

    const startAck = await new Promise<StartGameAck>((resolve) => {
      clientA.emit('startGame', { roomId, playerId: adaId, acknowledgeSmallGame: true }, resolve);
    });
    const adaBook = startAck.room!.books.find((b) => b.originAuthorId === adaId)!;
    const graceBook = startAck.room!.books.find((b) => b.originAuthorId === graceId)!;

    await new Promise((resolve) => {
      clientA.emit(
        'submitEntry',
        { roomId, playerId: adaId, bookId: adaBook.id, content: 'phrase one' },
        resolve,
      );
    });
    await new Promise((resolve) => {
      clientB.emit(
        'submitEntry',
        { roomId, playerId: graceId, bookId: graceBook.id, content: 'phrase two' },
        resolve,
      );
    });
    await new Promise((resolve) => {
      clientB.emit(
        'submitEntry',
        { roomId, playerId: graceId, bookId: adaBook.id, content: 'stroke-1' },
        resolve,
      );
    });
    await new Promise((resolve) => {
      clientA.emit(
        'submitEntry',
        { roomId, playerId: adaId, bookId: graceBook.id, content: 'stroke-2' },
        resolve,
      );
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
    await new Promise<void>((resolve) => clientA.on('connect', resolve));

    await new Promise((resolve) => {
      clientA.emit('rejoin', { token: 'never-issued' }, resolve);
    });

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
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const token = createAck.player!.sessionToken;
    const roomId = createAck.room!.id;
    const playerId = createAck.player!.id;

    clientA.close();
    await new Promise((resolve) => setTimeout(resolve, 20));

    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    await new Promise((resolve) => {
      clientA.emit('rejoin', { token }, resolve);
    });

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

  it("gives the host a new room/player, pushes the other client its own new roomChanged, and logs room_created with reason play-again", async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const oldRoomId = createAck.room!.id;
    const hostId = createAck.room!.hostPlayerId;

    clientB = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));
    const joinAck = await new Promise<JoinRoomAck>((resolve) => {
      clientB.emit('joinRoom', { roomId: oldRoomId, playerName: 'Grace' }, resolve);
    });
    const graceId = joinAck.player!.id;

    // Put the room into 'reveal' directly — bypassing the full game flow,
    // matching how onEndGame/onSetMonochrome tests set up preconditions.
    store.getRoom(oldRoomId)!.status = 'reveal';

    const roomChangedPromise = new Promise<{ room: PlayAgainAck['room']; player: PlayAgainAck['player'] }>(
      (resolve) => {
        clientB.once('roomChanged', resolve);
      },
    );

    const ack = await new Promise<PlayAgainAck>((resolve) => {
      clientA.emit('playAgain', { roomId: oldRoomId, playerId: hostId }, resolve);
    });

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
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const oldRoomId = createAck.room!.id;

    clientB = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));
    const joinAck = await new Promise<JoinRoomAck>((resolve) => {
      clientB.emit('joinRoom', { roomId: oldRoomId, playerName: 'Grace' }, resolve);
    });

    store.getRoom(oldRoomId)!.status = 'reveal';

    const ack = await new Promise<PlayAgainAck>((resolve) => {
      clientB.emit('playAgain', { roomId: oldRoomId, playerId: joinAck.player!.id }, resolve);
    });

    expect(ack.error).toBe('not-host');
  });

  it('rejects when the room is not in reveal', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const oldRoomId = createAck.room!.id;
    const hostId = createAck.room!.hostPlayerId;

    const ack = await new Promise<PlayAgainAck>((resolve) => {
      clientA.emit('playAgain', { roomId: oldRoomId, playerId: hostId }, resolve);
    });

    expect(ack.error).toBe('room-not-in-reveal');
  });
});
