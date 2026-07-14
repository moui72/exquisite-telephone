import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import { createRoomStore, type RoomStore } from './domain/roomStore.js';
import { startTimerSweep, type BroadcastServer } from './domain/timerSweep.js';

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
    };
    const grace = {
      id: 'grace',
      roomId: 'ROOM1',
      name: 'Grace',
      connected: true,
      sessionToken: 't2',
    };
    const bookA: Book = { id: 'bookA', roomId: 'ROOM1', originAuthorId: ada.id, entries: [] };
    const room: Room = {
      id: 'ROOM1',
      hostPlayerId: ada.id,
      players: [ada, grace],
      status: 'writing',
      books: [bookA],
      createdAt: Date.now(),
      turnTimerMinutes: 15,
      roundStartedAt: Date.now() - 60 * 60_000,
      timerExtensions: {},
      pendingTimeoutVote: null,
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
