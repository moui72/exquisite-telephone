import { beforeEach, describe, expect, it } from 'vitest';
import { createRoom, createRoomStore, joinRoom, type RoomStore } from './roomStore.js';

describe('room store (in-memory, datamodel.md Room/Player)', () => {
  let store: RoomStore;

  beforeEach(() => {
    store = createRoomStore();
  });

  it('create room returns a valid unique code', () => {
    const roomA = createRoom(store, { hostName: 'Ada' });
    const roomB = createRoom(store, { hostName: 'Grace' });

    // Short, unambiguous, human-shareable code (datamodel Normalization Rules).
    expect(roomA.id).toMatch(/^[A-Z2-9]{4,6}$/);
    expect(roomA.id).not.toBe(roomB.id);
    expect(roomA.status).toBe('lobby');
    expect(roomA.hostPlayerId).toBe(roomA.players[0]?.id);
    expect(roomA.books).toEqual([]);
  });

  it('player join adds to room.players', () => {
    const room = createRoom(store, { hostName: 'Ada' });

    const result = joinRoom(store, { roomId: room.id, playerName: 'Grace' });

    expect(result.player).toBeDefined();
    expect(result.error).toBeUndefined();
    const updatedRoom = store.getRoom(room.id);
    expect(updatedRoom?.players).toHaveLength(2);
    expect(updatedRoom?.players.map((p) => p.name)).toEqual(['Ada', 'Grace']);
  });

  it('joining a room that does not exist returns a room-not-found error', () => {
    const result = joinRoom(store, { roomId: 'NOPE', playerName: 'Grace' });

    expect(result.player).toBeUndefined();
    expect(result.error).toBe('room-not-found');
  });

  it('joining a room that has already started returns a room-already-started error (ui.md Error state)', () => {
    const room = createRoom(store, { hostName: 'Ada' });
    room.status = 'writing';

    const result = joinRoom(store, { roomId: room.id, playerName: 'Grace' });

    expect(result.player).toBeUndefined();
    expect(result.error).toBe('room-already-started');
    expect(store.getRoom(room.id)?.players).toHaveLength(1);
  });

  it('looks up a room by Room.id', () => {
    const room = createRoom(store, { hostName: 'Ada' });

    expect(store.getRoom(room.id)?.id).toBe(room.id);
    expect(store.getRoom('MISSING')).toBeUndefined();
  });
});
