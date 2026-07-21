import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { writable, type Writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from '../stores/session.js';
import DecorationWindow from './DecorationWindow.svelte';

afterEach(() => cleanup());

function makeFakeSession(
  initial: Omit<SessionState, 'reconnecting'>,
): SessionStore & { store: Writable<SessionState> } {
  const store = writable<SessionState>({ reconnecting: false, ...initial });
  return {
    store,
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
const grace = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2', kicked: false };

function decoratingRoom(overrides: Partial<Room> = {}): Room {
  const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [], cover: null, coverTemplate: null };
  const graceBook: Book = { id: 'book-grace', roomId, originAuthorId: grace.id, entries: [], cover: null, coverTemplate: null };
  return {
    id: roomId,
    hostPlayerId: ada.id,
    players: [ada, grace],
    status: 'decorating',
    books: [adaBook, graceBook],
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
    decorationWindowStartedAt: Date.now(),
    coverSubmissions: [],
    ...overrides,
  };
}

describe('DecorationWindow (Room.status === decorating)', () => {
  it.fails("renders the player's own cover canvas, pre-stamped with their name", () => {
    const session = makeFakeSession({ room: decoratingRoom(), player: ada, error: null });
    const { getByText, container } = render(DecorationWindow, { props: { session } });

    expect(getByText("Ada's book")).toBeInTheDocument();
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it.fails('shows a 2-minute countdown derived from decorationWindowStartedAt', () => {
    const session = makeFakeSession({
      room: decoratingRoom({ decorationWindowStartedAt: Date.now() }),
      player: ada,
      error: null,
    });
    const { getByTestId } = render(DecorationWindow, { props: { session } });

    const countdown = getByTestId('decoration-countdown');
    // Just opened → about two minutes remaining, formatted m:ss.
    expect(countdown.textContent ?? '').toMatch(/[12]:\d\d/);
  });

  it.fails('reports how many players have submitted (from coverSubmissions)', () => {
    const session = makeFakeSession({
      room: decoratingRoom({ coverSubmissions: ['grace'] }),
      player: ada,
      error: null,
    });
    const { getByText } = render(DecorationWindow, { props: { session } });

    expect(getByText(/1 of 2/)).toBeInTheDocument();
  });

  it.fails('emits submitCover for the player OWN book on "Present your cover", then shows a waiting state', async () => {
    const session = makeFakeSession({ room: decoratingRoom(), player: ada, error: null });
    const { getByRole, getByText } = render(DecorationWindow, { props: { session } });

    await fireEvent.click(getByRole('button', { name: /present your cover/i }));

    expect(session.submitCover).toHaveBeenCalledTimes(1);
    expect(session.submitCover).toHaveBeenCalledWith('book-ada', expect.any(Array), null);
    // After presenting, the player waits for the others — the client never
    // advances itself to reveal.
    expect(getByText(/waiting/i)).toBeInTheDocument();
  });
});
