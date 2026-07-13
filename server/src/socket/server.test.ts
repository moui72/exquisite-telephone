import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoomStore, type RoomStore } from '../domain/roomStore.js';
import { createSocketServer } from './server.js';
import type { CreateRoomAck, JoinRoomAck, StartGameAck } from './handlers.js';

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

  it('onStartGame lets the host start the game, moving the room out of lobby', async () => {
    clientA = ioClient(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));
    const createAck = await new Promise<CreateRoomAck>((resolve) => {
      clientA.emit('createRoom', { hostName: 'Ada' }, resolve);
    });
    const roomId = createAck.room!.id;

    const ack = await new Promise<StartGameAck>((resolve) => {
      clientA.emit('startGame', { roomId, playerId: createAck.room!.hostPlayerId }, resolve);
    });

    expect(ack.error).toBeUndefined();
    expect(ack.room?.status).toBe('writing');
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
