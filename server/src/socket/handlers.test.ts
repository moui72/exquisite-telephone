import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoomStore, type RoomStore } from '../domain/roomStore.js';
import { createSocketServer } from './server.js';
import type { CreateRoomAck, JoinRoomAck, SetMonochromeAck, StartGameAck } from './handlers.js';

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
      clientA.emit('startGame', { roomId, playerId: hostId }, resolve);
    });

    const ack = await new Promise<SetMonochromeAck>((resolve) => {
      clientA.emit('set_monochrome', { roomId, playerId: hostId, monochromeOnly: true }, resolve);
    });

    expect(ack.error).toBe('room-not-in-lobby');
  });
});
