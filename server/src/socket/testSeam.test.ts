import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeNextEntries, serializeDrawOps, type DrawOps } from '@exquisite-telephone/shared';
import { createRoomStore, type RoomStore } from '../domain/roomStore.js';
import { createCurationStore, curationEventsDirFor, type CurationStore } from '../domain/curationStore.js';
import { createLogger } from '../observability/logger.js';
import { createSocketServer } from './server.js';

/**
 * T004 — proves the test-traffic tag routes prompt-ratings away from the
 * configured Curation Store. A rating cast over a TAGGED connection (the
 * `x-e2e-test-signal` header matching the configured secret) writes NO
 * event file; an identical rating over an UNTAGGED connection writes one.
 */
const SECRET = 'unit-test-signal';
const DRAWING: DrawOps = [{ type: 'stroke', points: [{ x: 1, y: 1 }], color: '#000', width: 2 }];

describe('test-traffic curation-write isolation (T004)', () => {
  let httpServer: HttpServer;
  let store: RoomStore;
  let curationStore: CurationStore;
  let eventsDir: string;
  let dataDir: string;
  let port: number;
  let clients: ClientSocket[];

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'et-curation-'));
    const dataPath = join(dataDir, 'curation.json');
    eventsDir = curationEventsDirFor(dataPath);
    store = createRoomStore();
    curationStore = createCurationStore(dataPath, createLogger());
    httpServer = createServer();
    createSocketServer(httpServer, store, undefined, createLogger(), curationStore, {
      enabled: true,
      secret: SECRET,
    });
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    port = (httpServer.address() as AddressInfo).port;
    clients = [];
  });

  afterEach(async () => {
    for (const c of clients) c.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await rm(dataDir, { recursive: true, force: true });
  });

  function connect(tagged: boolean): ClientSocket {
    const socket = ioClient(`http://localhost:${port}`, {
      forceNew: true,
      extraHeaders: tagged ? { 'x-e2e-test-signal': SECRET } : undefined,
    });
    clients.push(socket);
    return socket;
  }

  /**
   * Runs a two-player game far enough for player A to draw the
   * position-1 turn on B's book and cast a thumbs-up on B's player-written
   * opening phrase — the single rated turn. `taggedA` decides whether A's
   * connection carries the test signal.
   */
  async function runRatedFlow(taggedA: boolean): Promise<void> {
    const a = connect(taggedA);
    const b = connect(false);
    await Promise.all([
      new Promise<void>((r) => a.on('connect', () => r())),
      new Promise<void>((r) => b.on('connect', () => r())),
    ]);

    const createAck = (await a.timeout(5000).emitWithAck('createRoom', { hostName: 'Aya' })) as {
      room: { id: string };
      player: { id: string };
    };
    const roomId = createAck.room.id;
    const aId = createAck.player.id;
    const joinAck = (await b.timeout(5000).emitWithAck('joinRoom', { roomId, playerName: 'Bo' })) as {
      player: { id: string };
    };
    const bId = joinAck.player.id;

    await a.timeout(5000).emitWithAck('startGame', { roomId, playerId: aId, acknowledgeSmallGame: true });

    async function due(playerId: string): Promise<ReturnType<typeof computeNextEntries>> {
      const room = store.getRoom(roomId)!;
      return computeNextEntries(room).filter((e) => e.authorId === playerId);
    }

    // Round 0: both opening text phrases.
    for (const next of await due(aId)) {
      await a.timeout(5000).emitWithAck('submitEntry', { roomId, playerId: aId, bookId: next.bookId, content: `A ${next.position}` });
    }
    for (const next of await due(bId)) {
      await b.timeout(5000).emitWithAck('submitEntry', { roomId, playerId: bId, bookId: next.bookId, content: `B-open-${taggedA}` });
    }

    // Round 1: A draws position 1 on B's book and rates the opening phrase.
    for (const next of await due(aId)) {
      const payload: Record<string, unknown> = {
        roomId,
        playerId: aId,
        bookId: next.bookId,
        content: next.type === 'drawing' ? serializeDrawOps(DRAWING) : `A ${next.position}`,
      };
      if (next.position === 1) payload.rating = 'up';
      await a.timeout(5000).emitWithAck('submitEntry', payload);
    }
    // B keeps the round moving where still due (not under assertion).
    for (const next of await due(bId)) {
      await b.timeout(5000).emitWithAck('submitEntry', { roomId, playerId: bId, bookId: next.bookId, content: next.type === 'drawing' ? serializeDrawOps(DRAWING) : `B ${next.position}` });
    }

    await curationStore.settled();
  }

  async function eventFileCount(): Promise<number> {
    try {
      return (await readdir(eventsDir)).filter((n) => n.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }

  it('writes an event file for an UNTAGGED rating', async () => {
    await runRatedFlow(false);
    expect(await eventFileCount()).toBe(1);
  });

  it('writes NO event file for a TAGGED (test-traffic) rating', async () => {
    await runRatedFlow(true);
    expect(await eventFileCount()).toBe(0);
  });
});
