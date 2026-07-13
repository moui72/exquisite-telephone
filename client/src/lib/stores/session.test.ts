import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import type { Room } from '@exquisite-telephone/shared';
import type { GameSocket } from '../socket/types.js';
import { createSessionStore } from './session.js';

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
};

describe('session store (client single source of state)', () => {
  it('starts with no room and no player', () => {
    const { socket } = makeFakeSocket();
    const session = createSessionStore(socket);

    expect(get(session)).toEqual({ room: null, player: null, error: null });
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
});
