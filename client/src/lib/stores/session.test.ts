import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Room } from '@exquisite-telephone/shared';
import type { GameSocket } from '../socket/types.js';
import { createSessionStore, SESSION_TOKEN_STORAGE_KEY } from './session.js';

function makeFakeSocket() {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  let lastEmit: { event: string; payload: unknown } | null = null;
  let nextAck: unknown = undefined;

  const socket: GameSocket = {
    emit(event, payload, ack) {
      lastEmit = { event, payload };
      ack(nextAck);
    },
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler);
    },
  };

  return {
    socket,
    setNextAck: (ack: unknown) => {
      nextAck = ack;
    },
    getLastEmit: () => lastEmit,
    trigger: (event: string, payload: unknown) => {
      handlers.get(event)?.forEach((h) => h(payload));
    },
  };
}

const sampleRoom: Room = {
  id: 'ABCDE',
  hostPlayerId: 'p1',
  players: [{ id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 'tok' }],
  status: 'lobby',
  books: [],
  createdAt: Date.now(),
  turnTimerMinutes: null,
  roundStartedAt: null,
  timerExtensions: {},
  pendingTimeoutVote: null,
};

describe('session store (client single source of state)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no room and no player', () => {
    const { socket } = makeFakeSocket();
    const session = createSessionStore(socket);

    expect(get(session)).toEqual({
      room: null,
      player: null,
      error: null,
      reconnecting: false,
    });
  });

  it('createRoom emits createRoom and stores the returned room/player on success', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);

    await session.createRoom('Ada');

    expect(fake.getLastEmit()?.event).toBe('createRoom');
    expect(get(session).room).toEqual(sampleRoom);
    expect(get(session).player).toEqual(sampleRoom.players[0]);
    expect(get(session).error).toBeNull();
  });

  it('joinRoom stores an error instead of a room when the ack contains one', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ error: 'room-not-found' });
    const session = createSessionStore(fake.socket);

    await session.joinRoom('NOPE1', 'Grace');

    expect(get(session).room).toBeNull();
    expect(get(session).error).toBe('room-not-found');
  });

  it('updates the room when a roomUpdated broadcast arrives', () => {
    const fake = makeFakeSocket();
    const session = createSessionStore(fake.socket);

    const updatedRoom: Room = { ...sampleRoom, status: 'writing' };
    fake.trigger('roomUpdated', { room: updatedRoom });

    expect(get(session).room).toEqual(updatedRoom);
  });

  it('submitEntry emits submitEntry with the current room/player and the given book/content', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);
    await session.createRoom('Ada');

    fake.setNextAck({ room: { ...sampleRoom, status: 'reveal' } });
    await session.submitEntry('book-1', 'a phrase');

    expect(fake.getLastEmit()).toEqual({
      event: 'submitEntry',
      payload: { roomId: 'ABCDE', playerId: 'p1', bookId: 'book-1', content: 'a phrase' },
    });
    expect(get(session).room?.status).toBe('reveal');
  });

  it('attempts an automatic rejoin on init when a token is already persisted', () => {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, 'saved-token');
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });

    createSessionStore(fake.socket);

    expect(fake.getLastEmit()).toEqual({ event: 'rejoin', payload: { token: 'saved-token' } });
  });

  it('is reconnecting while the automatic rejoin is in flight, then not', () => {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, 'saved-token');
    const handlers = new Map<string, Set<(payload: unknown) => void>>();
    let ackFn: ((response: unknown) => void) | null = null;
    const socket: GameSocket = {
      emit(_event, _payload, ack) {
        ackFn = ack;
      },
      on(event, handler) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event)!.add(handler);
      },
      off() {},
    };

    const session = createSessionStore(socket);
    expect(get(session).reconnecting).toBe(true);

    ackFn!({ room: sampleRoom, player: sampleRoom.players[0] });
    expect(get(session).reconnecting).toBe(false);
  });

  it('surfaces a distinct game-ended error from a rejected rejoin', () => {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, 'saved-token');
    const fake = makeFakeSocket();
    fake.setNextAck({ error: 'game-ended' });

    const session = createSessionStore(fake.socket);

    expect(get(session).error).toBe('game-ended');
    expect(get(session).reconnecting).toBe(false);
  });

  it('does not attempt a rejoin on init when no token is persisted', () => {
    const fake = makeFakeSocket();

    createSessionStore(fake.socket);

    expect(fake.getLastEmit()).toBeNull();
  });

  it('saves the returned session token to localStorage on a successful createRoom', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);

    await session.createRoom('Ada');

    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe('tok');
  });
});
