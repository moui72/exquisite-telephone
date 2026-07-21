import { createServer } from 'node:http';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import { createRoomStore, type RoomStore } from './domain/roomStore.js';
import { startTimerSweep, type BroadcastServer } from './domain/timerSweep.js';
import { createCurationStore } from './domain/curationStore.js';
import { createSessionTokenStore } from './domain/sessionTokenStore.js';
import { createLogger } from './observability/logger.js';
import { createSocketServer } from './socket/server.js';

/**
 * Bootstrap-level coverage for the 30-second background timer sweep
 * (infrastructure.md Turn Timer Sweep): the server entry point
 * (`index.ts`) only calls `startTimerSweep(store, io)` — the interval
 * itself, and the decision of which rooms to sweep and when to
 * broadcast, lives in `timerSweep.ts` (constitution Principle X).
 */
describe('startTimerSweep (30s background sweep)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeStoreWithStalledRoom(): { store: RoomStore; room: Room } {
    const store = createRoomStore();
    const ada = {
      id: 'ada',
      roomId: 'ROOM1',
      name: 'Ada',
      connected: true,
      sessionToken: 't1',
      kicked: false,
    };
    const grace = {
      id: 'grace',
      roomId: 'ROOM1',
      name: 'Grace',
      connected: true,
      sessionToken: 't2',
      kicked: false,
    };
    const bookA: Book = { id: 'bookA', roomId: 'ROOM1', originAuthorId: ada.id, entries: [] };
    const room: Room = {
      id: 'ROOM1',
      hostPlayerId: ada.id,
      players: [ada, grace],
      status: 'writing',
      books: [bookA],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: 15,
      lapsPerBook: null,
      roundStartedAt: Date.now() - 60 * 60_000,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
      nonContinuable: false,
      bookReads: {},
      currentlyReading: {},
      promptMode: 'free-form',
      curatedPromptCount: null,
      allowPromptWriteIn: true,
      dealtPrompts: {},
    };
    store.rooms.set(room.id, room);
    return { store, room };
  }

  it('sweeps every writing room with a timer set every 30 seconds and broadcasts a changed room', () => {
    const { store, room } = makeStoreWithStalledRoom();
    const emit = vi.fn();
    const io: BroadcastServer = { to: vi.fn().mockReturnValue({ emit }) };

    startTimerSweep(store, io);
    vi.advanceTimersByTime(30_000);

    expect(room.pendingTimeoutVote).not.toBeNull();
    expect(io.to).toHaveBeenCalledWith(room.id);
    expect(emit).toHaveBeenCalledWith('roomUpdated', { room });
  });

  it('does not broadcast a room the sweep left unchanged', () => {
    const { store, room } = makeStoreWithStalledRoom();
    // Not yet stalled: round just started.
    room.roundStartedAt = Date.now();
    const emit = vi.fn();
    const io: BroadcastServer = { to: vi.fn().mockReturnValue({ emit }) };

    startTimerSweep(store, io);
    vi.advanceTimersByTime(30_000);

    expect(room.pendingTimeoutVote).toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });

  it('skips rooms with no turn timer set', () => {
    const { store, room } = makeStoreWithStalledRoom();
    room.turnTimerMinutes = null;
    const emit = vi.fn();
    const io: BroadcastServer = { to: vi.fn().mockReturnValue({ emit }) };

    startTimerSweep(store, io);
    vi.advanceTimersByTime(30_000);

    expect(emit).not.toHaveBeenCalled();
  });

  it('skips rooms that are not in the writing status', () => {
    const { store, room } = makeStoreWithStalledRoom();
    room.status = 'lobby';
    const emit = vi.fn();
    const io: BroadcastServer = { to: vi.fn().mockReturnValue({ emit }) };

    startTimerSweep(store, io);
    vi.advanceTimersByTime(30_000);

    expect(emit).not.toHaveBeenCalled();
  });
});

/**
 * Wiring-level coverage for the Curation Store (constitution Principle X
 * — the entry point wires dependencies, it never defines them). The
 * store's behavior is covered in `domain/curationStore.test.ts`; what
 * matters here is that `index.ts` constructs it from config and hands it
 * to the socket layer without doing any file I/O of its own.
 */
describe('curation store wiring (index.ts)', () => {
  const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

  it('constructs the curation store from config and injects it into the socket layer', () => {
    expect(indexSource).toMatch(/createCurationStore\(\s*config\.curationDataPath/);
    expect(indexSource).toMatch(/createSocketServer\([^)]*curationStore/s);
  });

  it('performs no file I/O of its own — the store owns its persistence', () => {
    expect(indexSource).not.toMatch(/\bfrom 'node:fs'/);
    expect(indexSource).not.toMatch(/\bfrom 'node:fs\/promises'/);
    expect(indexSource).not.toMatch(/readFileSync|writeFileSync|\bopen\(|\brename\(/);
  });

  it('createSocketServer accepts a curation store and starts with one injected', () => {
    const httpServer = createServer();
    const { logger } = { logger: createLogger(() => {}) };
    const curationStore = createCurationStore(
      join(mkdtempSync(join(tmpdir(), 'curation-wire-')), 'c.json'),
      logger,
    );

    const io = createSocketServer(
      httpServer,
      createRoomStore(),
      createSessionTokenStore(),
      logger,
      curationStore,
    );

    expect(io).toBeDefined();
    io.close();
    httpServer.close();
  });
});
