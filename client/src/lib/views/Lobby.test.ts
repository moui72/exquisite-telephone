import { render, screen, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import type { Room } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from '../stores/session.js';
import Lobby from './Lobby.svelte';

function makeFakeSession(initial: Omit<SessionState, 'reconnecting'>): SessionStore & {
  setState: (s: SessionState) => void;
} {
  const store = writable<SessionState>({ reconnecting: false, ...initial });
  return {
    subscribe: store.subscribe,
    setState: store.set,
    createRoom: vi.fn(async (hostName: string) => {
      store.set({
        room: {
          id: 'ABCDE',
          hostPlayerId: 'p1',
          players: [
            { id: 'p1', roomId: 'ABCDE', name: hostName, connected: true, sessionToken: 't' },
          ],
          status: 'lobby',
          books: [],
          createdAt: Date.now(),
          monochromeOnly: false,
          turnTimerMinutes: null,
          roundStartedAt: null,
          timerExtensions: {},
          pendingTimeoutVote: null,
          playAgainVotes: [],
        },
        player: { id: 'p1', roomId: 'ABCDE', name: hostName, connected: true, sessionToken: 't' },
        error: null,
        reconnecting: false,
      });
    }),
    joinRoom: vi.fn(async () => {}),
    startGame: vi.fn(async () => {}),
    submitEntry: vi.fn(async () => {}),
    setMonochrome: vi.fn(async () => {}),
    setTurnTimer: vi.fn(async () => {}),
    castTimeoutVote: vi.fn(async () => {}),
  };
}

describe('Lobby view', () => {
  it('lets a host create a room and shows the room code and player list', async () => {
    const session = makeFakeSession({ room: null, player: null, error: null });
    render(Lobby, { props: { session } });

    await fireEvent.input(screen.getByLabelText(/display name/i), { target: { value: 'Ada' } });
    await fireEvent.click(screen.getByRole('button', { name: /create room/i }));

    expect(session.createRoom).toHaveBeenCalledWith('Ada');
    expect(await screen.findByText('ABCDE')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('shows the start game control only to the host', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1' },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2' },
      ],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };

    const hostSession = makeFakeSession({
      room,
      player: room.players[0]!,
      error: null,
    });
    render(Lobby, { props: { session: hostSession } });
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();

    const guestSession = makeFakeSession({
      room,
      player: room.players[1]!,
      error: null,
    });
    render(Lobby, { props: { session: guestSession } });
    expect(screen.queryAllByRole('button', { name: /start game/i })).toHaveLength(1); // still just the host's
  });

  it('always shows player-count guidance to the host', () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1' },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2' },
        { id: 'p3', roomId: 'ABCDE', name: 'Lin', connected: true, sessionToken: 't3' },
      ],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    expect(screen.getByText(/recommend 4\+.*minimum 3/i)).toBeInTheDocument();
  });

  it('below 3 players shows the small-game acknowledgment checkbox and disables start until checked', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [{ id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1' }],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    const checkbox = screen.getByRole('checkbox', {
      name: /i know this won.t really work but i want to test something/i,
    });
    const startButton = screen.getByRole('button', { name: /start game/i });
    expect(startButton).toBeDisabled();

    await fireEvent.click(checkbox);
    expect(startButton).not.toBeDisabled();

    await fireEvent.click(startButton);
    expect(hostSession.startGame).toHaveBeenCalledWith(true);
  });

  it('at 3+ players the checkbox is absent and start game is enabled as today', () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1' },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2' },
        { id: 'p3', roomId: 'ABCDE', name: 'Lin', connected: true, sessionToken: 't3' },
      ],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    expect(
      screen.queryByRole('checkbox', { name: /i know this won.t really work/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start game/i })).not.toBeDisabled();
  });

  it("reflects Room.turnTimerMinutes in the host's timer selector and emits setTurnTimer on change", async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1' },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2' },
        { id: 'p3', roomId: 'ABCDE', name: 'Lin', connected: true, sessionToken: 't3' },
      ],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: 30,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    const select = screen.getByLabelText(/turn timer/i) as HTMLSelectElement;
    expect(select.value).toBe('30');

    await fireEvent.change(select, { target: { value: '60' } });

    expect(hostSession.setTurnTimer).toHaveBeenCalledWith(60);
  });

  it('lets a guest join a room by code', async () => {
    const session = makeFakeSession({ room: null, player: null, error: null });
    render(Lobby, { props: { session } });

    await fireEvent.click(screen.getByRole('tab', { name: /join room/i }));
    await fireEvent.input(screen.getByLabelText(/display name/i), { target: { value: 'Grace' } });
    await fireEvent.input(screen.getByLabelText(/room code/i), { target: { value: 'abcde' } });
    await fireEvent.click(screen.getByRole('button', { name: /join room/i }));

    expect(session.joinRoom).toHaveBeenCalledWith('ABCDE', 'Grace');
  });

  it('shows the force-monochrome toggle only to the host, reflecting Room.monochromeOnly', () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1' },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2' },
      ],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: true,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };

    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session: hostSession } });
    const toggle = screen.getByRole('checkbox', { name: /force monochrome/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toBeChecked();

    const guestSession = makeFakeSession({ room, player: room.players[1]!, error: null });
    render(Lobby, { props: { session: guestSession } });
    expect(screen.queryAllByRole('checkbox', { name: /force monochrome/i })).toHaveLength(1); // still just the host's
  });

  it('emits set_monochrome with the new value when the host toggles it', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [{ id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1' }],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };

    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    await fireEvent.click(screen.getByRole('checkbox', { name: /force monochrome/i }));

    expect(session.setMonochrome).toHaveBeenCalledWith(true);
  });
});
