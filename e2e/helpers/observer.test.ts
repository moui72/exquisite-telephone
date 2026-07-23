import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  computeNextEntries,
  serializeDrawOps,
  type DrawOps,
  type Room,
} from '@exquisite-telephone/shared';
import { createRoomStore, type RoomStore } from '../../server/src/domain/roomStore.js';
import { createSocketServer } from '../../server/src/socket/server.js';
import { joinAsObserver } from './observer.js';

/**
 * T002 — drives the observer helper against a locally-started, real
 * server (the same `createSocketServer` production uses) and asserts it
 * observes a known submitted entry, including a drawing entry read back as
 * exact parsed `DrawOps`.
 */
describe('e2e observer helper', () => {
  let httpServer: HttpServer;
  let store: RoomStore;
  let host: ClientSocket;
  let observerClose: (() => void) | undefined;
  let port: number;
  let baseURL: string;

  beforeEach(async () => {
    store = createRoomStore();
    httpServer = createServer();
    createSocketServer(httpServer, store);
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    port = (httpServer.address() as AddressInfo).port;
    baseURL = `http://localhost:${port}`;
  });

  afterEach(async () => {
    observerClose?.();
    host?.removeAllListeners('roomUpdated');
    host?.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('observes a known submitted drawing entry as exact parsed DrawOps', async () => {
    const knownDrawing: DrawOps = [
      { type: 'stroke', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }], color: '#123456', width: 4 },
      { type: 'fill', point: { x: 5, y: 5 }, color: '#abcdef' },
    ];

    host = ioClient(baseURL, { forceNew: true });
    await new Promise<void>((resolve) => host.on('connect', () => resolve()));
    const createAck = (await host.timeout(5000).emitWithAck('createRoom', { hostName: 'Host' })) as {
      room: Room;
      player: { id: string };
    };
    const roomId = createAck.room.id;
    const hostId = createAck.player.id;

    // Observer joins as an extra seated player and auto-plays its own turns
    // so the round-gated flow can advance while the host drives its turns
    // (including the known drawing) under assertion.
    const observer = await joinAsObserver(roomId, { baseURL, name: 'Watcher', autoPlay: true });
    observerClose = observer.close;

    // Two active players (host + observer): override the recommended-3 floor.
    await host.timeout(5000).emitWithAck('startGame', { roomId, playerId: hostId, acknowledgeSmallGame: true });

    // Drive every turn currently due to the host, submitting the known
    // drawing for the host's drawing turn and a short phrase for text turns.
    async function driveHost(): Promise<void> {
      const room = store.getRoom(roomId);
      if (!room) return;
      for (const next of computeNextEntries(room)) {
        if (next.authorId !== hostId) continue;
        const content = next.type === 'drawing' ? serializeDrawOps(knownDrawing) : `host ${next.position}`;
        try {
          await host.timeout(5000).emitWithAck('submitEntry', { roomId, playerId: hostId, bookId: next.bookId, content });
        } catch {
          return;
        }
      }
    }
    host.on('roomUpdated', () => void driveHost());
    await driveHost();

    // The observer should broadcast-observe the host's drawing entry.
    const drawingEntry = await observer.waitForEntry(
      (e) => e.type === 'drawing' && e.authorId === hostId,
      15_000,
    );
    expect(observer.drawOpsFor(drawingEntry)).toEqual(knownDrawing);

    observer.close();
  }, 20_000);
});
