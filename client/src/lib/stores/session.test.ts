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
  players: [{ id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 'tok', kicked: false }],
  status: 'lobby',
  books: [],
  createdAt: Date.now(),
  monochromeOnly: false,
  turnTimerMinutes: null,
  lapsPerBook: null,
  roundStartedAt: null,
  timerExtensions: {},
  pendingTimeoutVote: null,
  playAgainVotes: [],
  nonContinuable: false,
  revealStartedAt: null,
  promptMode: 'free-form',
  curatedPromptCount: null,
  allowPromptWriteIn: true,
  dealtPrompts: {},
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

  it('endGame emits endGame with roomId/playerId, mirroring setMonochrome shape', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);
    await session.createRoom('Ada');

    fake.setNextAck({ room: { ...sampleRoom, status: 'ended' } });
    await session.endGame();

    expect(fake.getLastEmit()).toEqual({
      event: 'endGame',
      payload: { roomId: 'ABCDE', playerId: 'p1' },
    });
    expect(get(session).room?.status).toBe('ended');
  });

  it('setLapsPerBook emits set_laps_per_book with roomId/playerId/lapsPerBook', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);
    await session.createRoom('Ada');

    fake.setNextAck({ room: { ...sampleRoom, lapsPerBook: 3 } });
    await session.setLapsPerBook(3);

    expect(fake.getLastEmit()).toEqual({
      event: 'set_laps_per_book',
      payload: { roomId: 'ABCDE', playerId: 'p1', lapsPerBook: 3 },
    });
    expect(get(session).room?.lapsPerBook).toBe(3);
  });

  it('voteToPlayAgain emits voteToPlayAgain with roomId/playerId', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);
    await session.createRoom('Ada');

    fake.setNextAck({ room: { ...sampleRoom, playAgainVotes: ['p1'] } });
    await session.voteToPlayAgain();

    expect(fake.getLastEmit()).toEqual({
      event: 'voteToPlayAgain',
      payload: { roomId: 'ABCDE', playerId: 'p1' },
    });
  });

  it('playAgain emits playAgain with roomId/playerId and applies the ack like createRoom', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);
    await session.createRoom('Ada');

    const newRoom: Room = { ...sampleRoom, id: 'NEWRM', status: 'lobby' };
    const newPlayer = { ...sampleRoom.players[0]!, id: 'p1-new', sessionToken: 'new-tok' };
    fake.setNextAck({ room: newRoom, player: newPlayer });
    await session.playAgain();

    expect(fake.getLastEmit()).toEqual({
      event: 'playAgain',
      payload: { roomId: 'ABCDE', playerId: 'p1' },
    });
    expect(get(session).room).toEqual(newRoom);
    expect(get(session).player).toEqual(newPlayer);
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe('new-tok');
  });

  it('kickPlayer emits kickPlayer with roomId/playerId/targetPlayerId, mirroring endGame shape', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);
    await session.createRoom('Ada');

    fake.setNextAck({ room: { ...sampleRoom, nonContinuable: true } });
    await session.kickPlayer('p2');

    expect(fake.getLastEmit()).toEqual({
      event: 'kickPlayer',
      payload: { roomId: 'ABCDE', playerId: 'p1', targetPlayerId: 'p2' },
    });
    expect(get(session).room?.nonContinuable).toBe(true);
  });

  it('restartGame emits restartGame with roomId/playerId, mirroring endGame shape', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);
    await session.createRoom('Ada');

    fake.setNextAck({ room: { ...sampleRoom, status: 'writing', nonContinuable: false } });
    await session.restartGame();

    expect(fake.getLastEmit()).toEqual({
      event: 'restartGame',
      payload: { roomId: 'ABCDE', playerId: 'p1' },
    });
    expect(get(session).room?.status).toBe('writing');
  });

  it('leaveGame clears the stored session token and resets state without emitting any socket event', async () => {
    const fake = makeFakeSocket();
    fake.setNextAck({ room: sampleRoom, player: sampleRoom.players[0] });
    const session = createSessionStore(fake.socket);
    await session.createRoom('Ada');
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe('tok');

    session.leaveGame();

    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBeNull();
    expect(get(session)).toEqual({
      room: null,
      player: null,
      error: null,
      reconnecting: false,
    });
    expect(fake.getLastEmit()?.event).toBe('createRoom');
  });

  it('a roomChanged broadcast updates both room and player (unlike roomUpdated) and stores the new token', () => {
    const fake = makeFakeSocket();
    const session = createSessionStore(fake.socket);

    const newRoom: Room = { ...sampleRoom, id: 'NEWRM', status: 'lobby' };
    const newPlayer = { ...sampleRoom.players[0]!, id: 'p1-new', sessionToken: 'roomchanged-tok' };
    fake.trigger('roomChanged', { room: newRoom, player: newPlayer });

    expect(get(session).room).toEqual(newRoom);
    expect(get(session).player).toEqual(newPlayer);
    expect(localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)).toBe('roomchanged-tok');
  });
});
