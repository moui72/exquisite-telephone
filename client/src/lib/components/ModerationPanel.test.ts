import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Room } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from '../stores/session.js';
import ModerationPanel from './ModerationPanel.svelte';

afterEach(() => cleanup());

function makeFakeSession(initial: SessionState): SessionStore {
  const store = writable<SessionState>(initial);
  return {
    subscribe: store.subscribe,
    createRoom: vi.fn(async () => {}),
    joinRoom: vi.fn(async () => {}),
    startGame: vi.fn(async () => {}),
    submitEntry: vi.fn(async () => {}),
    setMonochrome: vi.fn(async () => {}),
    setTurnTimer: vi.fn(async () => {}),
    castTimeoutVote: vi.fn(async () => {}),
    endGame: vi.fn(async () => {}),
    leaveGame: vi.fn(),
    voteToPlayAgain: vi.fn(async () => {}),
    playAgain: vi.fn(async () => {}),
    kickPlayer: vi.fn(async () => {}),
    restartGame: vi.fn(async () => {}),
  };
}

const roomId = 'ABCDE';
const ada = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1', kicked: false };
const grace = {
  id: 'grace',
  roomId,
  name: 'Grace',
  connected: true,
  sessionToken: 't2',
  kicked: false,
};

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: roomId,
    hostPlayerId: ada.id,
    players: [ada, grace],
    status: 'lobby',
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
    ...overrides,
  };
}

describe('ModerationPanel (host-only moderation controls)', () => {
  it('renders nothing for a non-host player', () => {
    const session = makeFakeSession({
      room: makeRoom(),
      player: grace,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });

    expect(screen.queryByText('Moderation')).not.toBeInTheDocument();
  });

  it('shows a collapsible panel with a kick button per non-host player for the host', async () => {
    const session = makeFakeSession({
      room: makeRoom(),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });

    expect(screen.getByText('Moderation')).toBeInTheDocument();
    await fireEvent.click(screen.getByText('Moderation'));

    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escort from the Salon' })).toBeInTheDocument();
  });

  it('calls session.kickPlayer with the target player id when Escort from the Salon is clicked', async () => {
    const session = makeFakeSession({
      room: makeRoom(),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });
    await fireEvent.click(screen.getByText('Moderation'));
    await fireEvent.click(screen.getByRole('button', { name: 'Escort from the Salon' }));

    expect(session.kickPlayer).toHaveBeenCalledWith(grace.id);
  });

  it('filters a kicked player out of the roster entirely, rather than showing them struck-through', async () => {
    const kickedGrace = { ...grace, kicked: true };
    const session = makeFakeSession({
      room: makeRoom({ players: [ada, kickedGrace] }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });
    await fireEvent.click(screen.getByText('Moderation'));

    expect(screen.queryByText('Grace')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kicked' })).not.toBeInTheDocument();
  });

  it('shows "Restage the Salon" only when Room.nonContinuable is true', async () => {
    const session = makeFakeSession({
      room: makeRoom({ nonContinuable: false }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });
    await fireEvent.click(screen.getByText('Moderation'));

    expect(screen.queryByRole('button', { name: 'Restage the Salon' })).not.toBeInTheDocument();
  });

  it('calls session.restartGame when Restage the Salon is clicked', async () => {
    const session = makeFakeSession({
      room: makeRoom({ nonContinuable: true }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });
    await fireEvent.click(screen.getByText('Moderation'));
    await fireEvent.click(screen.getByRole('button', { name: 'Restage the Salon' }));

    expect(session.restartGame).toHaveBeenCalled();
  });

  it('calls session.endGame when Close the Exhibition is clicked', async () => {
    const session = makeFakeSession({
      room: makeRoom(),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });
    await fireEvent.click(screen.getByText('Moderation'));
    await fireEvent.click(screen.getByRole('button', { name: 'Close the Exhibition' }));

    expect(session.endGame).toHaveBeenCalled();
  });

  it('shows a "this salon cannot continue" notice alongside Restage the Salon when Room.nonContinuable is true', async () => {
    const session = makeFakeSession({
      room: makeRoom({ nonContinuable: true }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });
    await fireEvent.click(screen.getByText('Moderation'));

    expect(screen.getByRole('alert')).toHaveTextContent(/this salon cannot continue/i);
  });

  it('does not show the "cannot continue" notice when Room.nonContinuable is false', async () => {
    const session = makeFakeSession({
      room: makeRoom({ nonContinuable: false }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session } });
    await fireEvent.click(screen.getByText('Moderation'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
