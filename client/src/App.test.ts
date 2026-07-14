import { cleanup, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Room } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from './lib/stores/session.js';
import App from './App.svelte';

afterEach(() => cleanup());

function makeFakeSession(initial: SessionState): SessionStore {
  const store = writable<SessionState>(initial);
  return {
    subscribe: store.subscribe,
    createRoom: vi.fn(async () => {}),
    joinRoom: vi.fn(async () => {}),
    startGame: vi.fn(async () => {}),
    submitEntry: vi.fn(async () => {}),
    setTurnTimer: vi.fn(async () => {}),
    castTimeoutVote: vi.fn(async () => {}),
  };
}

const roomId = 'ABCDE';
const ada = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1' };

function makeRoom(status: Room['status']): Room {
  return {
    id: roomId,
    hostPlayerId: ada.id,
    players: [ada],
    status,
    books: [],
    createdAt: Date.now(),
    turnTimerMinutes: null,
    roundStartedAt: null,
    timerExtensions: {},
    pendingTimeoutVote: null,
  };
}

describe('App (top-level state routing per ui.md States)', () => {
  it('shows a distinct "reconnecting…" state while an automatic rejoin is in flight', () => {
    const session = makeFakeSession({
      room: null,
      player: null,
      error: null,
      reconnecting: true,
    });

    render(App, { props: { session } });

    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
  });

  it('shows a "this game has ended" state distinct from a generic error', () => {
    const session = makeFakeSession({
      room: null,
      player: null,
      error: 'game-ended',
      reconnecting: false,
    });

    render(App, { props: { session } });

    expect(screen.getByText(/this game has ended/i)).toBeInTheDocument();
  });

  it('shows the Lobby when there is no room and no reconnect/ended state', () => {
    const session = makeFakeSession({
      room: null,
      player: null,
      error: null,
      reconnecting: false,
    });

    render(App, { props: { session } });

    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
  });

  it('shows the Writing/Drawing view once the room is in progress', () => {
    const session = makeFakeSession({
      room: makeRoom('writing'),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(App, { props: { session } });

    expect(screen.queryByRole('button', { name: /create room/i })).not.toBeInTheDocument();
  });
});
