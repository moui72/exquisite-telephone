import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
            { id: 'p1', roomId: 'ABCDE', name: hostName, connected: true, sessionToken: 't', kicked: false },
          ],
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
        },
        player: { id: 'p1', roomId: 'ABCDE', name: hostName, connected: true, sessionToken: 't', kicked: false },
        error: null,
        reconnecting: false,
      });
    }),
    joinRoom: vi.fn(async () => {}),
    startGame: vi.fn(async () => {}),
    submitEntry: vi.fn(async () => {}),
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
    kickPlayer: vi.fn(async () => {}),
    restartGame: vi.fn(async () => {}),
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

  it('renders the room card inside a GiltFrame with a plaque caption', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [{ id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false }],
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
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    const { container } = render(Lobby, { props: { session: hostSession } });

    const frame = container.querySelector('.gilt-frame');
    expect(frame).not.toBeNull();
    expect(frame).toContainElement(screen.getByText('ABCDE'));
    expect(frame?.querySelector('.gilt-frame-plaque')?.textContent).toMatch(/ABCDE/);
  });

  it('shows the start game control only to the host', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2', kicked: false },
      ],
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

    const hostSession = makeFakeSession({
      room,
      player: room.players[0]!,
      error: null,
    });
    render(Lobby, { props: { session: hostSession } });
    expect(screen.getByRole('button', { name: /commence the exhibition/i })).toBeInTheDocument();

    const guestSession = makeFakeSession({
      room,
      player: room.players[1]!,
      error: null,
    });
    render(Lobby, { props: { session: guestSession } });
    expect(screen.queryAllByRole('button', { name: /commence the exhibition/i })).toHaveLength(1); // still just the host's
  });

  it('always shows player-count guidance to the host', () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2', kicked: false },
        { id: 'p3', roomId: 'ABCDE', name: 'Lin', connected: true, sessionToken: 't3', kicked: false },
      ],
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
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    expect(screen.getByText(/recommend 4\+.*minimum 3/i)).toBeInTheDocument();
  });

  it('below 3 players shows the small-game acknowledgment checkbox and disables start until checked', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [{ id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false }],
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
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    const checkbox = screen.getByRole('checkbox', {
      name: /aware this salon is intimately attended.*wish to proceed nonetheless/i,
    });
    const startButton = screen.getByRole('button', { name: /commence the exhibition/i });
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
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2', kicked: false },
        { id: 'p3', roomId: 'ABCDE', name: 'Lin', connected: true, sessionToken: 't3', kicked: false },
      ],
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
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    expect(
      screen.queryByRole('checkbox', { name: /aware this salon is intimately attended/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /commence the exhibition/i })).not.toBeDisabled();
  });

  it("reflects Room.turnTimerMinutes in the host's timer selector and emits setTurnTimer on change", async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2', kicked: false },
        { id: 'p3', roomId: 'ABCDE', name: 'Lin', connected: true, sessionToken: 't3', kicked: false },
      ],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: 30,
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
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    const select = screen.getByLabelText(/allotted contemplation period/i) as HTMLSelectElement;
    expect(select.value).toBe('30');

    await fireEvent.change(select, { target: { value: '60' } });

    expect(hostSession.setTurnTimer).toHaveBeenCalledWith(60);
  });

  it("shows the live default laps-per-book value when Room.lapsPerBook is null, tracking player count", async () => {
    const makeRoom = (playerCount: number): Room => ({
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: Array.from({ length: playerCount }, (_, i) => ({
        id: `p${i + 1}`,
        roomId: 'ABCDE',
        name: `Player${i + 1}`,
        connected: true,
        sessionToken: `t${i + 1}`,
        kicked: false,
      })),
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
    });

    // 4 players (< 5) -> defaultLapsPerBook(4) === 2.
    const fourPlayerRoom = makeRoom(4);
    const hostSession = makeFakeSession({
      room: fourPlayerRoom,
      player: fourPlayerRoom.players[0]!,
      error: null,
    });
    const { unmount } = render(Lobby, { props: { session: hostSession } });
    let select = screen.getByLabelText(/laps per book/i) as HTMLSelectElement;
    expect(select.value).toBe('2');
    unmount();

    // 5 players (>= 5) -> defaultLapsPerBook(5) === 1.
    const fivePlayerRoom = makeRoom(5);
    const hostSession2 = makeFakeSession({
      room: fivePlayerRoom,
      player: fivePlayerRoom.players[0]!,
      error: null,
    });
    render(Lobby, { props: { session: hostSession2 } });
    select = screen.getByLabelText(/laps per book/i) as HTMLSelectElement;
    expect(select.value).toBe('1');
  });

  it('emits setLapsPerBook with the selected value when the host changes the laps control', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2', kicked: false },
      ],
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
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    const select = screen.getByLabelText(/laps per book/i) as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: '3' } });

    expect(hostSession.setLapsPerBook).toHaveBeenCalledWith(3);
  });

  it('shows the host-set laps-per-book value regardless of player count once non-null', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
      ],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      lapsPerBook: 3,
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
    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });

    render(Lobby, { props: { session: hostSession } });

    const select = screen.getByLabelText(/laps per book/i) as HTMLSelectElement;
    expect(select.value).toBe('3');
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
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2', kicked: false },
      ],
      status: 'lobby',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: true,
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

    const hostSession = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session: hostSession } });
    const toggle = screen.getByRole('checkbox', { name: /enforce a monochrome decree/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toBeChecked();

    const guestSession = makeFakeSession({ room, player: room.players[1]!, error: null });
    render(Lobby, { props: { session: guestSession } });
    expect(screen.queryAllByRole('checkbox', { name: /enforce a monochrome decree/i })).toHaveLength(1); // still just the host's
  });

  it('emits set_monochrome with the new value when the host toggles it', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [{ id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false }],
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

    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    await fireEvent.click(screen.getByRole('checkbox', { name: /enforce a monochrome decree/i }));

    expect(session.setMonochrome).toHaveBeenCalledWith(true);
  });

  describe('error copy (F002)', () => {
    const cases: Array<[string, RegExp]> = [
      ['room-not-found', /no salon .* that code|couldn.t find .* room|room.*not.*found/i],
      ['not-host', /host/i],
      ['too-few-players', /(more|another).*(guest|player)|need at least/i],
      ['room-not-in-lobby', /already.*(begun|underway|started)/i],
      ['invalid-token', /session.*(expired|invalid)|reconnect/i],
      ['game-ended', /ended/i],
    ];

    it.each(cases)('renders docent-voice copy for %s, not the raw code', (code, matcher) => {
      const session = makeFakeSession({ room: null, player: null, error: code });
      render(Lobby, { props: { session } });

      const alert = screen.getByRole('alert');
      expect(alert.textContent).toMatch(matcher);
      expect(alert.textContent).not.toContain(code);
    });

    it('renders a generic fallback line for an unrecognized error code, not the raw string', () => {
      const session = makeFakeSession({ room: null, player: null, error: 'some-unmapped-code' });
      render(Lobby, { props: { session } });

      const alert = screen.getByRole('alert');
      expect(alert.textContent).not.toContain('some-unmapped-code');
      expect(alert.textContent?.length ?? 0).toBeGreaterThan(0);
    });
  });

  describe('theme regression guard (plan-1449)', () => {
    it('contains no leftover default-Tailwind slate- classes', () => {
      const source = readFileSync(resolve(__dirname, './Lobby.svelte'), 'utf-8');
      expect(source).not.toMatch(/slate-/);
    });
  });

  // The "How this salon works" rules overview now lives in the app-level
  // Salon Footer (App.svelte / SalonFooter.svelte); its tests moved to
  // App.test.ts.

  describe('host setting info tooltips (plan-in-game-rules-and-guidance)', () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [{ id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false }],
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

    it('reveals an explanation for force monochrome, turn timer, and laps per book', async () => {
      const session = makeFakeSession({ room, player: room.players[0]!, error: null });
      render(Lobby, { props: { session } });

      await fireEvent.click(screen.getByRole('button', { name: /force monochrome|monochrome decree/i }));
      expect(screen.getByText(/hides the color palette/i)).toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: /turn timer|contemplation period/i }));
      expect(screen.getByText(/timeout vote/i)).toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: /what's a lap/i }));
      expect(screen.getByText(/around the circle/i)).toBeInTheDocument();
    });
  });
});

/**
 * Host prompt-mode controls (ui.md Lobby View). The two curated controls are
 * hidden entirely in free-form mode rather than shown disabled, since they
 * have no meaning there.
 */
describe('Lobby prompt-mode host controls', () => {
  function makePromptRoom(overrides: Partial<Room> = {}): Room {
    return {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
        { id: 'p2', roomId: 'ABCDE', name: 'Grace', connected: true, sessionToken: 't2', kicked: false },
      ],
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
      ...overrides,
    };
  }

  it('shows the prompt-mode control to the host', () => {
    const room = makePromptRoom();
    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    expect(screen.getByLabelText(/prompt mode/i)).toBeInTheDocument();
  });

  it('hides the dependent curated controls entirely in free-form mode', () => {
    const room = makePromptRoom();
    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    expect(screen.queryByLabelText(/phrases per player/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/write their own/i)).not.toBeInTheDocument();
  });

  it('reveals the count selector and write-in toggle in curated mode', () => {
    const room = makePromptRoom({ promptMode: 'curated', curatedPromptCount: 3 });
    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    expect(screen.getByLabelText(/phrases per player/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/write their own/i)).toBeInTheDocument();
  });

  it('emits setPromptMode when the host switches to curated', async () => {
    const room = makePromptRoom();
    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    await fireEvent.change(screen.getByLabelText(/prompt mode/i), {
      target: { value: 'curated' },
    });

    expect(session.setPromptMode).toHaveBeenCalledWith('curated');
  });

  it('emits setCuratedPromptCount with the selected value', async () => {
    const room = makePromptRoom({ promptMode: 'curated', curatedPromptCount: 3 });
    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    await fireEvent.change(screen.getByLabelText(/phrases per player/i), {
      target: { value: '5' },
    });

    expect(session.setCuratedPromptCount).toHaveBeenCalledWith(5);
  });

  it('emits setAllowPromptWriteIn when the host turns write-in off', async () => {
    const room = makePromptRoom({ promptMode: 'curated', curatedPromptCount: 3 });
    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    await fireEvent.click(screen.getByLabelText(/write their own/i));

    expect(session.setAllowPromptWriteIn).toHaveBeenCalledWith(false);
  });

  it('hides the prompt-mode control from non-host players', () => {
    const room = makePromptRoom();
    const session = makeFakeSession({ room, player: room.players[1]!, error: null });
    render(Lobby, { props: { session } });

    expect(screen.queryByLabelText(/prompt mode/i)).not.toBeInTheDocument();
  });
});

/**
 * The prompt-mode control carries an info affordance like the other three
 * host settings (ui.md Lobby View).
 */
describe('Lobby prompt-mode info affordance', () => {
  it('exposes a tooltip with a distinct accessible name that reveals the curated explanation', async () => {
    const room: Room = {
      id: 'ABCDE',
      hostPlayerId: 'p1',
      players: [
        { id: 'p1', roomId: 'ABCDE', name: 'Ada', connected: true, sessionToken: 't1', kicked: false },
      ],
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
    const session = makeFakeSession({ room, player: room.players[0]!, error: null });
    render(Lobby, { props: { session } });

    const tooltip = screen.getByRole('button', { name: /how does curated mode work/i });
    expect(tooltip).toBeInTheDocument();

    await fireEvent.click(tooltip);
    expect(screen.getByText(/private hand/i)).toBeInTheDocument();
    expect(screen.getByText(/no two players/i)).toBeInTheDocument();

    // The tooltip button must not break the select's label association --
    // the control is still reachable by its own label.
    expect(screen.getByLabelText(/prompt mode/i)).toBeInTheDocument();
  });
});
