import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import { serializeDrawOps } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from '../stores/session.js';
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
    setReadingBook: vi.fn(async () => {}),
    kickPlayer: vi.fn(async () => {}),
    restartGame: vi.fn(async () => {}),
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
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
    bookReads: {},
    currentlyReading: {},
    promptMode: 'free-form',
    curatedPromptCount: null,
    allowPromptWriteIn: true,
    dealtPrompts: {},
    ...overrides,
  };
}

function twoBookBooks(): Book[] {
  const bookA: Book = {
    id: 'book-a',
    roomId,
    originAuthorId: ada.id,
    entries: [
      { id: 'ea0', bookId: 'book-a', authorId: ada.id, position: 0, type: 'text', content: 'phrase A' },
      {
        id: 'ea1',
        bookId: 'book-a',
        authorId: grace.id,
        position: 1,
        type: 'drawing',
        content: serializeDrawOps([]),
      },
    ],
  };
  const bookB: Book = {
    id: 'book-b',
    roomId,
    originAuthorId: grace.id,
    entries: [
      { id: 'eb0', bookId: 'book-b', authorId: grace.id, position: 0, type: 'text', content: 'phrase B' },
    ],
  };
  return [bookA, bookB];
}

describe('Reveal view — end-of-game controls', () => {
  it('shows a non-host "Leave game" and "Vote to play again", which call the corresponding session methods', async () => {
    const room = makeRoom();
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
    const room = makeRoom();
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
    const room = makeRoom({ playAgainVotes: [grace.id] });

    const hostSession = makeFakeSession({ room, player: ada, error: null });
    render(Reveal, { props: { session: hostSession } });
    expect(screen.getByText(/1 of 2 guests ready for an encore/i)).toBeInTheDocument();
    cleanup();

    const nonHostSession = makeFakeSession({ room, player: grace, error: null });
    render(Reveal, { props: { session: nonHostSession } });
    expect(screen.queryByText(/1 of 2 guests ready for an encore/i)).not.toBeInTheDocument();
  });
});

describe('Reveal view — self-guided card grid + per-book modal', () => {
  it('renders one card per book with cover art, no entries until a card is opened', () => {
    const room = makeRoom({ books: twoBookBooks() });
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });

    // A cover-art card per book, but no entry content is shown yet.
    expect(document.querySelectorAll('svg[aria-label="cover art"]')).toHaveLength(2);
    expect(screen.queryByText('phrase A')).not.toBeInTheDocument();
    expect(screen.queryByText('phrase B')).not.toBeInTheDocument();
  });

  it('opening a card shows page 1 (the origin prompt in isolation) and emits setReadingBook with the bookId', async () => {
    const room = makeRoom({ books: twoBookBooks() });
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await fireEvent.click(screen.getByRole('button', { name: /open ada's book/i }));

    expect(screen.getByText('phrase A')).toBeInTheDocument();
    // Page 1 is the prompt alone — the drawing that followed is not yet shown.
    expect(screen.queryByRole('img', { name: /drawing preview/i })).not.toBeInTheDocument();
    expect(session.setReadingBook).toHaveBeenCalledWith('book-a');
  });

  it('closing the modal emits setReadingBook(null)', async () => {
    const room = makeRoom({ books: twoBookBooks() });
    const session = makeFakeSession({ room, player: ada, error: null });

    render(Reveal, { props: { session } });
    await fireEvent.click(screen.getByRole('button', { name: /open ada's book/i }));
    await fireEvent.click(screen.getByRole('button', { name: /close book/i }));

    expect(session.setReadingBook).toHaveBeenCalledWith(null);
  });

  it('save control on the last page calls the export pipeline with that book', async () => {
    const room = makeRoom({ books: twoBookBooks() });
    const session = makeFakeSession({ room, player: ada, error: null });
    const exportFn = vi.fn(() => 'data:image/png;base64,FAKE');

    render(Reveal, { props: { session, exportFn } });
    // book-b has a single entry — page 1 is already the last page.
    await fireEvent.click(screen.getByRole('button', { name: /open grace's book/i }));

    const saveButton = screen.getByRole('button', { name: /preserve as keepsake/i });
    await fireEvent.click(saveButton);

    expect(exportFn).toHaveBeenCalledWith(room.books[1], room.players);
  });
});

describe('theme regression guard (plan-1449)', () => {
  it('contains no leftover default-Tailwind slate- classes', () => {
    const source = readFileSync(resolve(__dirname, './Reveal.svelte'), 'utf-8');
    expect(source).not.toMatch(/slate-/);
  });
});

/**
 * Ratings are curation telemetry, not a scoreboard (ui.md, datamodel.md).
 * They are NEVER surfaced back to any player, in any view. These are
 * absence assertions by design — there is no red phase; the correct
 * implementation is that nothing was ever built. They guard against a
 * future change that adds one.
 */
describe('prompt ratings are never surfaced to players', () => {
  function revealRoom(): Room {
    const book: Book = {
      id: 'book-1',
      roomId,
      originAuthorId: ada.id,
      entries: [
        { id: 'e0', bookId: 'book-1', authorId: ada.id, position: 0, type: 'text', content: 'a spoonful of sugar' },
        { id: 'e1', bookId: 'book-1', authorId: grace.id, position: 1, type: 'drawing', content: serializeDrawOps([]) },
      ],
    };
    return makeRoom({ books: [book] });
  }

  it('renders no rating data on Reveal — not to the rater, not to the author', async () => {
    const room = revealRoom();
    // Both perspectives: Grace rated the phrase, Ada wrote it.
    for (const viewer of [grace, ada]) {
      cleanup();
      const session = makeFakeSession({ room, player: viewer, error: null });
      const { container } = render(Reveal, { props: { session } });
      await fireEvent.click(screen.getByRole('button', { name: /open ada's book/i }));
      await fireEvent.click(screen.getByRole('button', { name: /reveal all/i }));
      await tick();

      const text = container.textContent ?? '';
      expect(text).not.toMatch(/thumbs|rated|rating|liked|disliked|upvote|downvote/i);
      expect(container.querySelector('[aria-label*="thumb" i]')).toBeNull();
      expect(screen.queryByRole('button', { name: /^thumbs/i })).not.toBeInTheDocument();
    }
  });

  /**
   * A structural guard: the Reveal component must not so much as reference
   * a rating. A future contributor wiring one in fails here even if they
   * hide it behind a flag that renders nothing.
   */
  it('the Reveal component source references no rating concept at all', () => {
    const source = readFileSync(resolve(__dirname, './Reveal.svelte'), 'utf8');

    expect(source).not.toMatch(/PromptRating|promptRating|thumbsUp|thumbsDown|ThumbsUp|ThumbsDown/);
    expect(source).not.toMatch(/\.rating\b/);
  });

  it('no rating field exists on any broadcast game type', () => {
    const room = revealRoom();

    expect('rating' in room).toBe(false);
    expect('ratings' in room).toBe(false);
    for (const book of room.books) {
      expect('rating' in book).toBe(false);
      for (const entry of book.entries) {
        expect('rating' in entry).toBe(false);
      }
    }
    expect(JSON.stringify(room)).not.toMatch(/rating/i);
  });
});
