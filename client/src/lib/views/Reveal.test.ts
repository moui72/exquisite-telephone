import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
const ada = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1', kicked: false };
const grace = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2', kicked: false };

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

describe('Reveal view', () => {
  it("renders each book's full ordered chain of entries once \"show everything\" is clicked (reused full-grid code path)", async () => {
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
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });

    // Before "show everything", the animated default is showing only the
    // book's cover (T010) — the entry content isn't visible yet.
    expect(screen.queryByText('a spoonful of sugar')).not.toBeInTheDocument();

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
    const session = makeFakeSession({ room, player: ada, error: null });

    const { container } = render(Reveal, { props: { session } });
    await fireEvent.click(screen.getByRole('button', { name: /show everything/i }));

    expect(screen.getByText('phrase A')).toBeInTheDocument();
    expect(screen.getByText('phrase B')).toBeInTheDocument();

    const frames = container.querySelectorAll('.gilt-frame');
    expect(frames.length).toBe(2);
    expect(frames[0]?.querySelector('.gilt-frame-plaque')?.textContent).toMatch(/ada/i);
    expect(frames[1]?.querySelector('.gilt-frame-plaque')?.textContent).toMatch(/grace/i);
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
    const session = makeFakeSession({ room, player: ada, error: null });
    const exportFn = vi.fn(() => 'data:image/png;base64,FAKE');

    render(Reveal, { props: { session, exportFn } });
    await fireEvent.click(screen.getByRole('button', { name: /show everything/i }));

    const saveButtons = screen.getAllByRole('button', { name: /preserve as keepsake/i });
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

  it('shows a non-host "Leave game" and "Vote to play again", which call the corresponding session methods', async () => {
    const room = makeMinimalRoom();
    const session = makeFakeSession({ room, player: grace, error: null });

    render(Reveal, { props: { session } });

    const leaveButton = screen.getByRole('button', { name: /depart the salon/i });
    const voteButton = screen.getByRole('button', { name: /vote for an encore/i });
    expect(screen.queryByRole('button', { name: /^close the exhibition$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^stage an encore$/i })).not.toBeInTheDocument();

    await fireEvent.click(leaveButton);
    expect(session.leaveGame).toHaveBeenCalled();

    await fireEvent.click(voteButton);
    expect(session.voteToPlayAgain).toHaveBeenCalled();
  });

  it('shows the host "End game" and "Play again" (not the non-host pair), which call the corresponding session methods', async () => {
    const room = makeMinimalRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });

    const endButton = screen.getByRole('button', { name: /^close the exhibition$/i });
    const playAgainButton = screen.getByRole('button', { name: /^stage an encore$/i });
    expect(screen.queryByRole('button', { name: /depart the salon/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vote for an encore/i })).not.toBeInTheDocument();

    await fireEvent.click(endButton);
    expect(session.endGame).toHaveBeenCalled();

    await fireEvent.click(playAgainButton);
    expect(session.playAgain).toHaveBeenCalled();
  });

  it('shows the host a readiness count reflecting playAgainVotes vs players, not shown to a non-host', () => {
    const room = makeMinimalRoom({ playAgainVotes: [grace.id] });

    const hostSession = makeFakeSession({ room, player: ada, error: null });
    render(Reveal, { props: { session: hostSession } });
    expect(screen.getByText(/1 of 2 guests ready for an encore/i)).toBeInTheDocument();
    cleanup();

    const nonHostSession = makeFakeSession({ room, player: grace, error: null });
    render(Reveal, { props: { session: nonHostSession } });
    expect(screen.queryByText(/1 of 2 guests ready for an encore/i)).not.toBeInTheDocument();
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
    // Scoped to the cover-art svg — decorative lucide icons elsewhere in
    // the view also render <circle> elements.
    expect(document.querySelectorAll('svg[aria-label="cover art"] circle')).toHaveLength(
      art.shapes.length,
    );
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

  it('has a save control for the currently displayed book that calls the export pipeline (ui.md: available in both modes)', async () => {
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });
    const exportFn = vi.fn(() => 'data:image/png;base64,FAKE');

    render(Reveal, { props: { session, exportFn } });
    await tick();

    const saveButton = screen.getByRole('button', { name: /preserve as keepsake/i });
    await fireEvent.click(saveButton);

    expect(exportFn).toHaveBeenCalledWith(room.books[0], room.players);
  });

  it("renders the current book inside a GiltFrame with a plaque caption naming the origin author", async () => {
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    const { container } = render(Reveal, { props: { session } });
    await tick();

    const frame = container.querySelector('.gilt-frame');
    expect(frame).not.toBeNull();
    expect(frame?.querySelector('.gilt-frame-plaque')?.textContent).toMatch(/ada/i);
  });

  it('shows the decorative spotlight/curtain flourish class by default (motion not reduced)', async () => {
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    const { container } = render(Reveal, { props: { session } });
    await tick();

    expect(container.querySelector('.reveal-spotlight')).not.toBeNull();
  });

  it('omits the decorative spotlight/curtain flourish class when prefers-reduced-motion is set, without affecting auto-advance pacing', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const room = makeTwoBookRoom();
    const session = makeFakeSession({ room, player: ada, error: null });

    const { container } = render(Reveal, { props: { session } });
    await tick();

    expect(container.querySelector('.reveal-spotlight')).toBeNull();

    // Auto-advance pacing itself is unaffected by the motion preference.
    vi.advanceTimersByTime(2500 + 4000);
    await tick();
    expect(screen.getByText('a0')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.queryByText('a2')).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});

describe('Reveal view — position derived from Room.revealStartedAt, independent of mount time', () => {
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

  function makeTwoBookRoom(revealStartedAt: number | null): Room {
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
      lapsPerBook: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
      playAgainVotes: [],
      nonContinuable: false,
      revealStartedAt,
      promptMode: 'free-form',
      curatedPromptCount: null,
      allowPromptWriteIn: true,
      dealtPrompts: {},
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('given a fixed revealStartedAt and fixed "now", two mounts at different real times produce the same visible state', async () => {
    const revealStartedAt = 1_000_000;

    // First mount: the component's own mount happens "soon" after
    // revealStartedAt.
    vi.setSystemTime(revealStartedAt + 1000);
    const roomEarly = makeTwoBookRoom(revealStartedAt);
    const sessionEarly = makeFakeSession({ room: roomEarly, player: ada, error: null });
    const { unmount } = render(Reveal, { props: { session: sessionEarly } });
    await tick();

    // Advance the shared clock to a fixed elapsed time: cover delay (2.5s)
    // plus one full 4s tick — 2 entries should be visible.
    vi.setSystemTime(revealStartedAt + 2500 + 4000);
    await tick();
    // Force a recompute tick (the component polls every 250ms).
    vi.advanceTimersByTime(300);
    await tick();

    expect(screen.getByText('a0')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.queryByText('a2')).not.toBeInTheDocument();
    unmount();
    cleanup();

    // Second mount: the component itself mounts much later in real time
    // (simulating a client that joined/refreshed long after reveal
    // started), but the room's revealStartedAt and "now" are identical to
    // the first mount's final state above.
    vi.setSystemTime(revealStartedAt + 2500 + 4000);
    const roomLate = makeTwoBookRoom(revealStartedAt);
    const sessionLate = makeFakeSession({ room: roomLate, player: ada, error: null });
    render(Reveal, { props: { session: sessionLate } });
    await tick();
    vi.advanceTimersByTime(300);
    await tick();

    expect(screen.getByText('a0')).toBeInTheDocument();
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.queryByText('a2')).not.toBeInTheDocument();
  });

  it('settles into showEverything once elapsed time exceeds every book\'s full reveal sequence', async () => {
    const revealStartedAt = 2_000_000;
    vi.setSystemTime(revealStartedAt);
    const room = makeTwoBookRoom(revealStartedAt);
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await tick();

    // Far beyond the time needed to fully reveal both books.
    vi.setSystemTime(revealStartedAt + 10_000_000);
    vi.advanceTimersByTime(300);
    await tick();

    expect(screen.getByText('a0')).toBeInTheDocument();
    expect(screen.getByText('a4')).toBeInTheDocument();
    expect(screen.getByText('b0')).toBeInTheDocument();
  });

  it('falls back to its own mount time when revealStartedAt is null, without throwing', async () => {
    const room = makeTwoBookRoom(null);
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await tick();

    expect(screen.getByText(/ada.s book/i)).toBeInTheDocument();
    expect(screen.queryByText('a0')).not.toBeInTheDocument();
  });
});

describe('theme regression guard (plan-1449)', () => {
  it('contains no leftover default-Tailwind slate- classes', () => {
    const source = readFileSync(resolve(__dirname, './Reveal.svelte'), 'utf-8');
    expect(source).not.toMatch(/slate-/);
  });
});
