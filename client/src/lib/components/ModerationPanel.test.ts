import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Room } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from '../stores/session.js';
import ModerationPanel from './ModerationPanel.svelte';

afterEach(() => cleanup());

function makeFakeSession(
  initial: Omit<SessionState, 'testTraffic'> & { testTraffic?: boolean },
): SessionStore {
  const store = writable<SessionState>({ testTraffic: false, ...initial });
  return {
    subscribe: store.subscribe,
    createRoom: vi.fn(async () => {}),
    joinRoom: vi.fn(async () => {}),
    startGame: vi.fn(async () => {}),
    submitEntry: vi.fn(async () => {}),
    submitCover: vi.fn(async () => {}),
    setMonochrome: vi.fn(async () => {}),
    setTurnTimer: vi.fn(async () => {}),
    setLapsPerBook: vi.fn(async () => {}),
    setPromptMode: vi.fn(async () => {}),
    setCuratedPromptCount: vi.fn(async () => {}),
    setAllowPromptWriteIn: vi.fn(async () => {}),
    castTimeoutVote: vi.fn(async () => {}),
    endGame: vi.fn(async () => {}),
    leaveGame: vi.fn(),
    voteToPlayAgain: vi.fn(async () => {}),
    playAgain: vi.fn(async () => {}),
    setReadingBook: vi.fn(async () => {}),
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
    lapsPerBook: null,
    roundStartedAt: null,
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

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });

    expect(screen.queryByText('Moderation')).not.toBeInTheDocument();
  });

  it('shows a modal with a kick button per non-host player for the host', async () => {
    const session = makeFakeSession({
      room: makeRoom(),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });

    expect(screen.getByRole('dialog', { name: 'Moderation' })).toBeInTheDocument();

    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escort from the Salon' })).toBeInTheDocument();
  });

  // T004 red-first: Kick is confirmation-gated (ui.md — Moderation Panel;
  // closes feedback F001). Marked it.fails against today's fire-immediately
  // behavior; T005 implements the guard and flips these to it.
  it(
    'guards Kick behind a ConfirmDialog naming the player, calling kickPlayer only on confirm',
    async () => {
      const session = makeFakeSession({
        room: makeRoom(),
        player: ada,
        error: null,
        reconnecting: false,
      });

      render(ModerationPanel, { props: { session, onClose: vi.fn() } });
      await fireEvent.click(screen.getByRole('button', { name: 'Escort from the Salon' }));

      // The dialog names the target and nothing has fired yet.
      expect(screen.getByText('Kick Grace?')).toBeInTheDocument();
      expect(session.kickPlayer).not.toHaveBeenCalled();

      await fireEvent.click(screen.getByRole('button', { name: 'Kick' }));
      expect(session.kickPlayer).toHaveBeenCalledWith(grace.id);
    },
  );

  it('does not call kickPlayer when the Kick confirmation is cancelled', async () => {
    const session = makeFakeSession({
      room: makeRoom(),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Escort from the Salon' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(session.kickPlayer).not.toHaveBeenCalled();
  });

  it('filters a kicked player out of the roster entirely, rather than showing them struck-through', async () => {
    const kickedGrace = { ...grace, kicked: true };
    const session = makeFakeSession({
      room: makeRoom({ players: [ada, kickedGrace] }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });

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

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });

    expect(screen.queryByRole('button', { name: 'Restage the Salon' })).not.toBeInTheDocument();
  });

  // T004 red-first: Restart is confirmation-gated. Marked it.fails; T005 flips it.
  it(
    'guards Restart behind a ConfirmDialog, calling restartGame only on confirm',
    async () => {
      const session = makeFakeSession({
        room: makeRoom({ nonContinuable: true }),
        player: ada,
        error: null,
        reconnecting: false,
      });

      render(ModerationPanel, { props: { session, onClose: vi.fn() } });
      await fireEvent.click(screen.getByRole('button', { name: 'Restage the Salon' }));

      expect(
        screen.getByText('Restart from turn 0? All current progress is lost.'),
      ).toBeInTheDocument();
      expect(session.restartGame).not.toHaveBeenCalled();

      await fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
      expect(session.restartGame).toHaveBeenCalled();
    },
  );

  it('does not call restartGame when the Restart confirmation is cancelled', async () => {
    const session = makeFakeSession({
      room: makeRoom({ nonContinuable: true }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Restage the Salon' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(session.restartGame).not.toHaveBeenCalled();
  });

  // T004 red-first: End game is confirmation-gated. Marked it.fails; T005 flips it.
  it(
    'guards End game behind a ConfirmDialog, calling endGame only on confirm',
    async () => {
      const session = makeFakeSession({
        room: makeRoom(),
        player: ada,
        error: null,
        reconnecting: false,
      });

      render(ModerationPanel, { props: { session, onClose: vi.fn() } });
      await fireEvent.click(screen.getByRole('button', { name: 'Close the Exhibition' }));

      expect(screen.getByText('End the game for everyone?')).toBeInTheDocument();
      expect(session.endGame).not.toHaveBeenCalled();

      await fireEvent.click(screen.getByRole('button', { name: 'End game' }));
      expect(session.endGame).toHaveBeenCalled();
    },
  );

  it('does not call endGame when the End game confirmation is cancelled', async () => {
    const session = makeFakeSession({
      room: makeRoom(),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Close the Exhibition' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(session.endGame).not.toHaveBeenCalled();
  });

  it('shows a "this salon cannot continue" notice alongside Restage the Salon when Room.nonContinuable is true', async () => {
    const session = makeFakeSession({
      room: makeRoom({ nonContinuable: true }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });

    expect(screen.getByRole('alert')).toHaveTextContent(/this salon cannot continue/i);
  });

  it('does not show the "cannot continue" notice when Room.nonContinuable is false', async () => {
    const session = makeFakeSession({
      room: makeRoom({ nonContinuable: false }),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session, onClose: vi.fn() } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onClose when the Close button is clicked', async () => {
    const onClose = vi.fn();
    const session = makeFakeSession({
      room: makeRoom(),
      player: ada,
      error: null,
      reconnecting: false,
    });

    render(ModerationPanel, { props: { session, onClose } });
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('theme regression guard (plan-1449)', () => {
  it('contains no leftover default-Tailwind slate- classes', () => {
    const source = readFileSync(resolve(__dirname, './ModerationPanel.svelte'), 'utf-8');
    expect(source).not.toMatch(/slate-/);
  });
});
