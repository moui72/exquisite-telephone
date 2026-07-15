import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import { serializeDrawOps } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from '../stores/session.js';
import { generateCoverArt } from '../reveal/coverArt.js';
import Reveal from './Reveal.svelte';

afterEach(() => cleanup());

const roomId = 'ABCDE';
const ada = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1' };
const grace = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2' };

function makeFakeSession(initial: Omit<SessionState, 'reconnecting'>): SessionStore {
  const store = writable<SessionState>({ reconnecting: false, ...initial });
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
  };
}

describe('Reveal view', () => {
  it("renders each book's full ordered chain of entries", async () => {
    const strokes = serializeDrawOps([
      {
        type: 'stroke',
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
        ],
        color: '#1e293b',
        width: 3,
      },
    ]);
    const book: Book = {
      id: 'book-1',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'e0',
          bookId: 'book-1',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'a spoonful of sugar',
        },
        {
          id: 'e1',
          bookId: 'book-1',
          authorId: grace.id,
          position: 1,
          type: 'drawing',
          content: strokes,
        },
      ],
    };
    const room: Room = {
      id: roomId,
      hostPlayerId: ada.id,
      players: [ada, grace],
      status: 'reveal',
      books: [book],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await fireEvent.click(screen.getByRole('button', { name: /show everything/i }));

    expect(screen.getByText('a spoonful of sugar')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /drawing preview/i })).toBeInTheDocument();
  });

  it('renders one section per book, in order', async () => {
    const bookA: Book = {
      id: 'book-a',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'ea',
          bookId: 'book-a',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'phrase A',
        },
      ],
    };
    const bookB: Book = {
      id: 'book-b',
      roomId,
      originAuthorId: grace.id,
      entries: [
        {
          id: 'eb',
          bookId: 'book-b',
          authorId: grace.id,
          position: 0,
          type: 'text',
          content: 'phrase B',
        },
      ],
    };
    const room: Room = {
      id: roomId,
      hostPlayerId: ada.id,
      players: [ada, grace],
      status: 'reveal',
      books: [bookA, bookB],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await fireEvent.click(screen.getByRole('button', { name: /show everything/i }));

    expect(screen.getByText('phrase A')).toBeInTheDocument();
    expect(screen.getByText('phrase B')).toBeInTheDocument();
  });

  it('has a save control per book that calls the export pipeline with that book', async () => {
    const bookA: Book = {
      id: 'book-a',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'ea',
          bookId: 'book-a',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'phrase A',
        },
      ],
    };
    const bookB: Book = {
      id: 'book-b',
      roomId,
      originAuthorId: grace.id,
      entries: [
        {
          id: 'eb',
          bookId: 'book-b',
          authorId: grace.id,
          position: 0,
          type: 'text',
          content: 'phrase B',
        },
      ],
    };
    const room: Room = {
      id: roomId,
      hostPlayerId: ada.id,
      players: [ada, grace],
      status: 'reveal',
      books: [bookA, bookB],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };
    const session = makeFakeSession({ room, player: ada, error: null });
    const exportFn = vi.fn(() => 'data:image/png;base64,FAKE');

    render(Reveal, { props: { session, exportFn } });
    await fireEvent.click(screen.getByRole('button', { name: /show everything/i }));

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    expect(saveButtons).toHaveLength(2);

    await fireEvent.click(saveButtons[0]!);

    expect(exportFn).toHaveBeenCalledWith(bookA, room.players);
  });

  function makeMinimalRoom(overrides: Partial<Room> = {}): Room {
    return {
      id: roomId,
      hostPlayerId: ada.id,
      players: [ada, grace],
      status: 'reveal',
      books: [],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
      ...overrides,
    };
  }

  it('shows a non-host "Leave game" and "Vote to play again", which call the corresponding session methods', async () => {
    const room = makeMinimalRoom();
    const session = makeFakeSession({ room, player: grace, error: null });

    render(Reveal, { props: { session } });

    const leaveButton = screen.getByRole('button', { name: /leave game/i });
    const voteButton = screen.getByRole('button', { name: /vote to play again/i });
    expect(screen.queryByRole('button', { name: /^end game$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^play again$/i })).not.toBeInTheDocument();

    await fireEvent.click(leaveButton);
    expect(session.leaveGame).toHaveBeenCalled();

    await fireEvent.click(voteButton);
    expect(session.voteToPlayAgain).toHaveBeenCalled();
  });

  it('shows the host "End game" and "Play again" (not the non-host pair), which call the corresponding session methods', async () => {
    const room = makeMinimalRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });

    const endButton = screen.getByRole('button', { name: /^end game$/i });
    const playAgainButton = screen.getByRole('button', { name: /^play again$/i });
    expect(screen.queryByRole('button', { name: /leave game/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vote to play again/i })).not.toBeInTheDocument();

    await fireEvent.click(endButton);
    expect(session.endGame).toHaveBeenCalled();

    await fireEvent.click(playAgainButton);
    expect(session.playAgain).toHaveBeenCalled();
  });

  it('shows the host a readiness count reflecting playAgainVotes vs players, not shown to a non-host', () => {
    const room = makeMinimalRoom({ playAgainVotes: [grace.id] });

    const hostSession = makeFakeSession({ room, player: ada, error: null });
    render(Reveal, { props: { session: hostSession } });
    expect(screen.getByText(/1 of 2 ready/i)).toBeInTheDocument();
    cleanup();

    const nonHostSession = makeFakeSession({ room, player: grace, error: null });
    render(Reveal, { props: { session: nonHostSession } });
    expect(screen.queryByText(/1 of 2 ready/i)).not.toBeInTheDocument();
  });
});

describe('Reveal view — animated one-book-at-a-time viewer (ui.md Reveal View)', () => {
  function makeEntry(bookId: string, authorId: string, position: number, content: string) {
    return {
      id: `${bookId}-${position}`,
      bookId,
      authorId,
      position,
      type: 'text' as const,
      content,
    };
  }

  function makeTwoBookRoom(): Room {
    const bookA: Book = {
      id: 'book-a',
      roomId,
      originAuthorId: ada.id,
      entries: [
        makeEntry('book-a', ada.id, 0, 'a0'),
        makeEntry('book-a', grace.id, 1, 'a1'),
        makeEntry('book-a', ada.id, 2, 'a2'),
        makeEntry('book-a', grace.id, 3, 'a3'),
        makeEntry('book-a', ada.id, 4, 'a4'),
      ],
    };
    const bookB: Book = {
      id: 'book-b',
      roomId,
      originAuthorId: grace.id,
      entries: [makeEntry('book-b', grace.id, 0, 'b0')],
    };
    return {
      id: roomId,
      hostPlayerId: ada.id,
      players: [ada, grace],
      status: 'reveal',
      books: [bookA, bookB],
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("on initial render, only the first book's cover is shown (author name + generateCoverArt output), no entries visible yet", async () => {
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await tick();

    expect(screen.getByText(/ada.s book/i)).toBeInTheDocument();
    expect(screen.queryByText('a0')).not.toBeInTheDocument();
    expect(screen.queryByText('b0')).not.toBeInTheDocument();
    const art = generateCoverArt(ada.id);
    expect(document.querySelectorAll('circle')).toHaveLength(art.shapes.length);
  });

  it('reveals up to 2 entries after the 2.5s cover delay plus one 4s tick', async () => {
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await tick();

    vi.advanceTimersByTime(2500 + 4000);
    await tick();

    expect(screen.getByText('a0')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.queryByText('a2')).not.toBeInTheDocument();
  });

  it("fully reveals the book then advances to the next book's cover after enough ticks", async () => {
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await tick();

    // cover delay + 3 ticks reveals all 5 entries of book A (2+2+1) and
    // moves on to book B's cover.
    vi.advanceTimersByTime(2500 + 4000 * 3);
    await tick();

    expect(screen.getByText(/grace.s book/i)).toBeInTheDocument();
    expect(screen.queryByText('b0')).not.toBeInTheDocument();
  });

  it('a "show everything" control immediately renders every book\'s full chain regardless of timer state', async () => {
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await tick();

    await fireEvent.click(screen.getByRole('button', { name: /show everything/i }));

    expect(screen.getByText('a0')).toBeInTheDocument();
    expect(screen.getByText('a4')).toBeInTheDocument();
    expect(screen.getByText('b0')).toBeInTheDocument();
  });

  it('manual previous/next controls step between books without waiting for the timer', async () => {
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await tick();

    await fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText(/grace.s book/i)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: /^previous$/i }));
    expect(screen.getByText(/ada.s book/i)).toBeInTheDocument();
  });
});
