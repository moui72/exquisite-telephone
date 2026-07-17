import { beforeEach, describe, expect, it } from 'vitest';
import type { Player, Room } from '@exquisite-telephone/shared';
import {
  createBooksForRoom,
  createRoom,
  createRoomStore,
  joinRoom,
  replayRoom,
  type RoomStore,
} from './roomStore.js';

function makePlayer(id: string, roomId: string, kicked = false): Player {
  return {
    id,
    roomId,
    name: id,
    connected: true,
    sessionToken: `${id}-token`,
    kicked,
  };
}

function makeRoomWithPlayers(players: Player[]): Room {
  return {
    id: 'ROOM1',
    hostPlayerId: players[0]?.id ?? 'host',
    players,
    status: 'writing',
    books: [],
    createdAt: Date.now(),
    monochromeOnly: false,
    turnTimerMinutes: null,
    roundStartedAt: null,
    timerExtensions: {},
    pendingTimeoutVote: null,
    playAgainVotes: [],
    nonContinuable: false,
    revealStartedAt: null,
  };
}

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

  it('create room defaults monochromeOnly to false', () => {
    const room = createRoom(store, { hostName: 'Ada' });

    expect(room.monochromeOnly).toBe(false);
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

describe('replayRoom (host-only "Play again" — datamodel.md Normalization Rules)', () => {
  let store: RoomStore;

  beforeEach(() => {
    store = createRoomStore();
  });

  it('returns a new room with a fresh id, lobby status, empty playAgainVotes, and createRoom-style defaults', () => {
    const oldRoom = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: oldRoom.id, playerName: 'Grace' });
    const oldRoomWithGrace = store.getRoom(oldRoom.id)!;

    const { room } = replayRoom(store, oldRoomWithGrace);

    expect(room.id).not.toBe(oldRoomWithGrace.id);
    expect(room.status).toBe('lobby');
    expect(room.playAgainVotes).toEqual([]);
    expect(room.monochromeOnly).toBe(false);
    expect(room.turnTimerMinutes).toBeNull();
    expect(room.roundStartedAt).toBeNull();
    expect(room.timerExtensions).toEqual({});
    expect(room.pendingTimeoutVote).toBeNull();
    expect(room.books).toEqual([]);
  });

  it('creates exactly one new Player per old player, preserving name and connected, with new id/sessionToken', () => {
    const oldRoom = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: oldRoom.id, playerName: 'Grace' });
    const oldRoomWithGrace = store.getRoom(oldRoom.id)!;
    const oldAda = oldRoomWithGrace.players[0]!;
    const oldGrace = oldRoomWithGrace.players[1]!;
    oldGrace.connected = false;

    const { room, playerIdMap } = replayRoom(store, oldRoomWithGrace);

    expect(room.players).toHaveLength(2);
    const newAda = room.players.find((p) => p.name === 'Ada')!;
    const newGrace = room.players.find((p) => p.name === 'Grace')!;
    expect(newAda.id).not.toBe(oldAda.id);
    expect(newAda.sessionToken).not.toBe(oldAda.sessionToken);
    expect(newAda.connected).toBe(oldAda.connected);
    expect(newGrace.connected).toBe(false);
    expect(playerIdMap.get(oldAda.id)).toBe(newAda);
    expect(playerIdMap.get(oldGrace.id)).toBe(newGrace);
  });

  it("the new room's hostPlayerId equals the new player mapped from the old host", () => {
    const oldRoom = createRoom(store, { hostName: 'Ada' });
    joinRoom(store, { roomId: oldRoom.id, playerName: 'Grace' });
    const oldRoomWithGrace = store.getRoom(oldRoom.id)!;
    const oldAda = oldRoomWithGrace.players[0]!;

    const { room, playerIdMap } = replayRoom(store, oldRoomWithGrace);

    const newAda = playerIdMap.get(oldAda.id)!;
    expect(room.hostPlayerId).toBe(newAda.id);
  });
});

describe('createBooksForRoom (excludes kicked players — moderation plan)', () => {
  it('creates one book per player when no one is kicked (same output as today)', () => {
    const ada = makePlayer('ada', 'ROOM1');
    const grace = makePlayer('grace', 'ROOM1');
    const room = makeRoomWithPlayers([ada, grace]);

    const books = createBooksForRoom(room);

    expect(books).toHaveLength(2);
    expect(books.map((b) => b.originAuthorId).sort()).toEqual(['ada', 'grace']);
  });

  it('excludes a kicked player from the generated books', () => {
    const ada = makePlayer('ada', 'ROOM1');
    const grace = makePlayer('grace', 'ROOM1', true);
    const room = makeRoomWithPlayers([ada, grace]);

    const books = createBooksForRoom(room);

    expect(books).toHaveLength(1);
    expect(books[0]?.originAuthorId).toBe('ada');
  });

  it('does not throw when every player is kicked (edge case, not reachable in practice)', () => {
    const ada = makePlayer('ada', 'ROOM1', true);
    const grace = makePlayer('grace', 'ROOM1', true);
    const room = makeRoomWithPlayers([ada, grace]);

    expect(() => createBooksForRoom(room)).not.toThrow();
    expect(createBooksForRoom(room)).toEqual([]);
  });
});
