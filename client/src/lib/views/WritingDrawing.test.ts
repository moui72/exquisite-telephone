import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { writable, type Writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Book, Entry, Room } from '@exquisite-telephone/shared';
import { serializeDrawOps } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from '../stores/session.js';
import WritingDrawing from './WritingDrawing.svelte';

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
const lin = { id: 'lin', roomId, name: 'Lin', connected: true, sessionToken: 't3', kicked: false };

function makeRoom(books: Book[], players = [ada, grace], overrides: Partial<Room> = {}): Room {
  return {
    id: roomId,
    hostPlayerId: ada.id,
    players,
    status: 'writing',
    books,
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
    bookReads: {},
    currentlyReading: {},
    promptMode: 'free-form',
    curatedPromptCount: null,
    allowPromptWriteIn: true,
    dealtPrompts: {},
    ...overrides,
  };
}

describe('Writing/Drawing view', () => {
  it("shows a text prompt when it is the player's turn to write the origin phrase", () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: ada, error: null });

    const { container } = render(WritingDrawing, { props: { session } });

    expect(screen.getByLabelText(/your phrase/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /present your contribution/i })).toBeInTheDocument();
    expect(container.querySelector('.gilt-frame')).not.toBeNull();
  });

  it('shows a drawing canvas when it is the player’s turn to draw', () => {
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'e0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'a spoonful of sugar',
        },
      ],
    };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByText('a spoonful of sugar')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /drawing canvas/i })).toBeInTheDocument();
  });

  it('shows a docent-voice hint clarifying a write turn is blind to the original phrase', () => {
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'e0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'a spoonful of sugar',
        },
        {
          id: 'e1',
          bookId: 'book-ada',
          authorId: grace.id,
          position: 1,
          type: 'drawing',
          content: serializeDrawOps([]),
        },
      ],
    };
    const room = makeRoom([adaBook], [ada, grace, lin]);
    const session = makeFakeSession({ room, player: lin, error: null });

    render(WritingDrawing, { props: { session } });

    expect(
      screen.getByText(/never (been )?told the original phrase|never seen the original phrase/i),
    ).toBeInTheDocument();
  });

  it('shows a docent-voice hint clarifying a draw turn should depict the phrase exactly', () => {
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'e0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'a spoonful of sugar',
        },
      ],
    };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByText(/exactly what the phrase says|no more.*no less/i)).toBeInTheDocument();
  });

  it('shows the previous drawing as reference when writing a guess', () => {
    const strokes = serializeDrawOps([
      {
        type: 'stroke',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        color: '#1e293b',
        width: 3,
      },
    ]);
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'e0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'a spoonful of sugar',
        },
        {
          id: 'e1',
          bookId: 'book-ada',
          authorId: grace.id,
          position: 1,
          type: 'drawing',
          content: strokes,
        },
      ],
    };
    const room = makeRoom([adaBook], [ada, grace, lin]);
    const session = makeFakeSession({ room, player: lin, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByRole('img', { name: /drawing preview/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/your phrase/i)).toBeInTheDocument();
  });

  it('shows a waiting state when it is not the player’s turn on any book', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByText(/awaiting your next commission/i)).toBeInTheDocument();
  });

  it('shows a distinct "waiting for the round to finish" message when the player finished their part of the round but has an incomplete book of their own elsewhere', () => {
    // Round-robin, 3 players: bookA/B/C origin ada/grace/lin respectively.
    // Round 0 is complete on all books (each origin author wrote their
    // own prompt). Round 1: bookA -> grace, bookB -> lin, bookC -> ada.
    // Grace has already submitted her round-1 entry on bookA, but her
    // own book (bookB) is still incomplete (only its round-0 entry) —
    // she's done for this round but the round itself hasn't finished.
    const bookA: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'a0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'p1',
        },
        {
          id: 'a1',
          bookId: 'book-ada',
          authorId: grace.id,
          position: 1,
          type: 'drawing',
          content: 'strokes',
        },
      ],
    };
    const bookB: Book = {
      id: 'book-grace',
      roomId,
      originAuthorId: grace.id,
      entries: [
        {
          id: 'b0',
          bookId: 'book-grace',
          authorId: grace.id,
          position: 0,
          type: 'text',
          content: 'p2',
        },
      ],
    };
    const bookC: Book = {
      id: 'book-lin',
      roomId,
      originAuthorId: lin.id,
      entries: [
        {
          id: 'c0',
          bookId: 'book-lin',
          authorId: lin.id,
          position: 0,
          type: 'text',
          content: 'p3',
        },
      ],
    };
    const room = makeRoom([bookA, bookB, bookC], [ada, grace, lin]);
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByText(/awaiting the round.s conclusion/i)).toBeInTheDocument();
  });

  it('holds the waiting state on a later lap, not just the first (2-lap game)', () => {
    // 3-player, 2-lap game: each book completes at 3*2 = 6 entries. Grace
    // has already written her second-lap entry on her own book (4 entries,
    // past the first lap of 3 but short of 6), and has no pending turn
    // this round (her book is round-gated ahead of ada/lin's, which sit at
    // 3 entries). She must still see the waiting state — the old
    // one-lap (players.length) comparison wrongly dropped her to the
    // generic hint on any lap past the first.
    const entry = (bookId: string, authorId: string, position: number): Entry => ({
      id: `${bookId}-${position}`,
      bookId,
      authorId,
      position,
      type: position % 2 === 0 ? 'text' : 'drawing',
      content: `c-${position}`,
    });
    const rotation = [ada, grace, lin];
    const bookGrace: Book = {
      id: 'book-grace',
      roomId,
      originAuthorId: grace.id,
      // 4 entries: origin-relative rotation grace, lin, ada, grace.
      entries: [0, 1, 2, 3].map((p) => entry('book-grace', rotation[(1 + p) % 3]!.id, p)),
    };
    const bookAda: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [0, 1, 2].map((p) => entry('book-ada', rotation[(0 + p) % 3]!.id, p)),
    };
    const bookLin: Book = {
      id: 'book-lin',
      roomId,
      originAuthorId: lin.id,
      entries: [0, 1, 2].map((p) => entry('book-lin', rotation[(2 + p) % 3]!.id, p)),
    };
    const room = makeRoom([bookGrace, bookAda, bookLin], [ada, grace, lin]);
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByText(/awaiting the round.s conclusion/i)).toBeInTheDocument();
    expect(screen.queryByText(/awaiting your next commission/i)).not.toBeInTheDocument();
  });

  it('shows a countdown to the deadline when Room.turnTimerMinutes is set', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const roundStartedAt = Date.now() - 60_000;
    const room: Room = {
      ...makeRoom([adaBook]),
      turnTimerMinutes: 30,
      lapsPerBook: null,
      roundStartedAt,
    };
    const session = makeFakeSession({ room, player: ada, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByTestId('turn-timer-countdown')).toBeInTheDocument();
  });

  it('adds a granted extension to the base duration (30m timer + 15m grant = 45m)', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const roundStartedAt = Date.now();
    const room: Room = {
      ...makeRoom([adaBook]),
      turnTimerMinutes: 30,
      lapsPerBook: null,
      roundStartedAt,
      timerExtensions: { [ada.id]: 15 * 60_000 },
    };
    const session = makeFakeSession({ room, player: ada, error: null });

    render(WritingDrawing, { props: { session } });

    // Additive: 30m base + 15m grant ~= 45m remaining, not 15m (which the
    // old replacing form produced).
    const countdown = screen.getByTestId('turn-timer-countdown');
    expect(countdown.textContent).toMatch(/4[45]:\d\d/);
    expect(countdown.textContent).not.toMatch(/1[45]:\d\d/);
  });

  it('shows no countdown when Room.turnTimerMinutes is null', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room: Room = { ...makeRoom([adaBook]), turnTimerMinutes: null };
    const session = makeFakeSession({ room, player: ada, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.queryByTestId('turn-timer-countdown')).not.toBeInTheDocument();
  });

  it('shows the timeout-vote prompt naming the stalled player(s) when the current player is eligible to vote', () => {
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'a0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'phrase',
        },
      ],
    };
    const room: Room = {
      ...makeRoom([adaBook], [ada, grace]),
      pendingTimeoutVote: {
        stalledPlayerIds: [ada.id],
        eligibleVoterIds: [grace.id],
        votes: {},
        voteDeadline: Date.now() + 60_000,
      },
    };
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(
      screen.getByText(/ada has yet to present their contribution to the salon/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grant a full turn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grant a half turn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grant fifteen minutes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /declare the turn forfeit/i })).toBeInTheDocument();
  });

  it('emits castTimeoutVote with the chosen option', async () => {
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'a0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'phrase',
        },
      ],
    };
    const room: Room = {
      ...makeRoom([adaBook], [ada, grace]),
      pendingTimeoutVote: {
        stalledPlayerIds: [ada.id],
        eligibleVoterIds: [grace.id],
        votes: {},
        voteDeadline: Date.now() + 60_000,
      },
    };
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });
    await fireEvent.click(screen.getByRole('button', { name: /grant a full turn/i }));

    expect(session.castTimeoutVote).toHaveBeenCalledWith('full');
  });

  it('does not show the timeout-vote prompt to a player who is not an eligible voter', () => {
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [],
    };
    const room: Room = {
      ...makeRoom([adaBook], [ada, grace]),
      pendingTimeoutVote: {
        stalledPlayerIds: [ada.id],
        eligibleVoterIds: [grace.id],
        votes: {},
        voteDeadline: Date.now() + 60_000,
      },
    };
    const session = makeFakeSession({ room, player: ada, error: null });

    render(WritingDrawing, { props: { session } });

    expect(
      screen.queryByRole('button', { name: /declare the turn forfeit/i }),
    ).not.toBeInTheDocument();
  });

  it('submits the written phrase to the session store', async () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: ada, error: null });

    render(WritingDrawing, { props: { session } });
    await fireEvent.input(screen.getByLabelText(/your phrase/i), {
      target: { value: 'a spoonful of sugar' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /present your contribution/i }));

    expect(session.submitEntry).toHaveBeenCalledWith('book-ada', 'a spoonful of sugar');
  });

  it('disables the drawing submit button until a stroke has been drawn (T001 regression: empty-canvas click was a silent no-op with no user feedback)', async () => {
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'e0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'a spoonful of sugar',
        },
      ],
    };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: grace, error: null });

    const { container } = render(WritingDrawing, { props: { session } });

    const submitButton = screen.getByRole('button', { name: /present your contribution/i });
    expect(submitButton).toBeDisabled();

    const canvas = container.querySelector('canvas')!;
    const down = new MouseEvent('pointerdown', { clientX: 0, clientY: 0, bubbles: true });
    Object.defineProperty(down, 'pointerId', { value: 1 });
    const move = new MouseEvent('pointermove', { clientX: 10, clientY: 10, bubbles: true });
    Object.defineProperty(move, 'pointerId', { value: 1 });
    const up = new MouseEvent('pointerup', { clientX: 10, clientY: 10, bubbles: true });
    Object.defineProperty(up, 'pointerId', { value: 1 });
    await fireEvent(canvas, down);
    await fireEvent(canvas, move);
    await fireEvent(canvas, up);

    expect(submitButton).not.toBeDisabled();

    await fireEvent.click(submitButton);
    // Third arg is the optional rating, undefined when uncast (T018).
    expect(session.submitEntry).toHaveBeenCalledWith('book-ada', expect.any(String), undefined);
  });

  it('shows a "game can\'t continue" notice to every player when Room.nonContinuable is true', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room = { ...makeRoom([adaBook]), nonContinuable: true };
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByRole('alert')).toHaveTextContent(/cannot continue/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/awaits the host.s restaging/i);
  });

  it('does not show the page-body "game can\'t continue" notice to the host, since the Moderation modal already shows it (F001)', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room = { ...makeRoom([adaBook]), nonContinuable: true };
    const session = makeFakeSession({ room, player: ada, error: null });

    render(WritingDrawing, { props: { session } });

    // The Moderation modal (opened from the Salon Footer's gavel)
    // surfaces its own copy of the notice for the host. The page body
    // must not also render a duplicate alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not show the "game can\'t continue" notice when Room.nonContinuable is false', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("preserves in-progress draft text across a room broadcast that leaves this player's turn identity unchanged (F1 regression)", async () => {
    // Grace is assigned position 1 (a guess) on Lin's book. Ada's book is a
    // separate, independent book also mid-round.
    const linBook: Book = {
      id: 'book-lin',
      roomId,
      originAuthorId: lin.id,
      entries: [
        {
          id: 'l0',
          bookId: 'book-lin',
          authorId: lin.id,
          position: 0,
          type: 'text',
          content: 'p1',
        },
        {
          id: 'l1',
          bookId: 'book-lin',
          authorId: ada.id,
          position: 1,
          type: 'drawing',
          content: serializeDrawOps([]),
        },
      ],
    };
    const adaBook: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'a0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'p2',
        },
        {
          id: 'a1',
          bookId: 'book-ada',
          authorId: grace.id,
          position: 1,
          type: 'drawing',
          content: serializeDrawOps([]),
        },
      ],
    };
    const room = makeRoom([linBook, adaBook], [ada, grace, lin]);
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    await fireEvent.input(screen.getByLabelText(/your phrase/i), {
      target: { value: 'a partially typed guess' },
    });
    expect(screen.getByLabelText(/your phrase/i)).toHaveValue('a partially typed guess');

    // Simulate an unrelated room broadcast (e.g. Ada submitting her own
    // entry on a different book): a brand-new Room object, but Grace's
    // assigned turn identity (bookId + position) is unchanged.
    const adaBookAfterSubmit: Book = {
      ...adaBook,
      entries: [
        ...adaBook.entries,
        {
          id: 'a2',
          bookId: 'book-ada',
          authorId: lin.id,
          position: 2,
          type: 'text',
          content: 'p2-guess',
        },
      ],
    };
    const newRoom = makeRoom([linBook, adaBookAfterSubmit], [ada, grace, lin]);
    session.store.set({ reconnecting: false, room: newRoom, player: grace, error: null });

    await Promise.resolve();

    expect(screen.getByLabelText(/your phrase/i)).toHaveValue('a partially typed guess');
  });
});

describe('theme regression guard (plan-1449)', () => {
  it('contains no leftover default-Tailwind slate- classes', () => {
    const source = readFileSync(resolve(__dirname, './WritingDrawing.svelte'), 'utf-8');
    expect(source).not.toMatch(/slate-/);
  });
});

/**
 * Curated opening turns (ui.md Writing/Drawing View). Applies to
 * `myTurn.position === 0` only; later text turns stay free-form in both
 * modes. A player only ever sees their own hand.
 */
describe('Writing/Drawing curated opening turn', () => {
  const curatedRoom = (overrides: Partial<Room> = {}) =>
    makeRoom([{ id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] }], [ada, grace], {
      promptMode: 'curated',
      curatedPromptCount: 3,
      dealtPrompts: {
        ada: ['A shark knitting', 'A giraffe in an elevator', 'A whale wearing a hat'],
        grace: ['A frog giving a presentation'],
      },
      ...overrides,
    });

  it("renders the player's own dealt hand as selectable choices", () => {
    const room = curatedRoom();
    const session = makeFakeSession({ room, player: ada, error: null });
    render(WritingDrawing, { props: { session } });

    expect(screen.getByLabelText('A shark knitting')).toBeInTheDocument();
    expect(screen.getByLabelText('A giraffe in an elevator')).toBeInTheDocument();
    expect(screen.getByLabelText('A whale wearing a hat')).toBeInTheDocument();
  });

  it("never renders another player's hand", () => {
    const room = curatedRoom();
    const session = makeFakeSession({ room, player: ada, error: null });
    render(WritingDrawing, { props: { session } });

    expect(screen.queryByText('A frog giving a presentation')).not.toBeInTheDocument();
  });

  it('submits the selected phrase', async () => {
    const room = curatedRoom();
    const session = makeFakeSession({ room, player: ada, error: null });
    render(WritingDrawing, { props: { session } });

    await fireEvent.click(screen.getByLabelText('A giraffe in an elevator'));
    await fireEvent.click(screen.getByRole('button', { name: /present your contribution/i }));

    expect(session.submitEntry).toHaveBeenCalledWith('book-ada', 'A giraffe in an elevator');
  });

  it('offers a write-your-own option revealing a free-text field when write-in is allowed', async () => {
    const room = curatedRoom({ allowPromptWriteIn: true });
    const session = makeFakeSession({ room, player: ada, error: null });
    render(WritingDrawing, { props: { session } });

    const writeOwn = screen.getByLabelText(/write my own/i);
    expect(writeOwn).toBeInTheDocument();

    await fireEvent.click(writeOwn);
    const field = screen.getByLabelText(/your own phrase/i);
    await fireEvent.input(field, { target: { value: 'A badger doing taxes' } });
    await fireEvent.click(screen.getByRole('button', { name: /present your contribution/i }));

    expect(session.submitEntry).toHaveBeenCalledWith('book-ada', 'A badger doing taxes');
  });

  it('omits the write-your-own option when write-in is off', () => {
    const room = curatedRoom({ allowPromptWriteIn: false });
    const session = makeFakeSession({ room, player: ada, error: null });
    render(WritingDrawing, { props: { session } });

    expect(screen.queryByLabelText(/write my own/i)).not.toBeInTheDocument();
  });

  it('leaves free-form mode showing the plain text input', () => {
    const room = makeRoom([{ id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] }]);
    const session = makeFakeSession({ room, player: ada, error: null });
    const { container } = render(WritingDrawing, { props: { session } });

    expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
    expect(screen.queryByLabelText(/write my own/i)).not.toBeInTheDocument();
  });
});

/**
 * The turn hint splits three ways (ui.md Writing/Drawing View): the draw-turn
 * hint, the later-text blind-guess hint for position > 0, and an opening-turn
 * hint for position 0. The blind-guess copy claims the player was never told
 * the original phrase and points at "what you see drawn above" -- both false
 * on the opening turn, where no preceding entry exists.
 */
describe('Writing/Drawing turn hint', () => {
  it('does not render the blind-guess copy on a free-form opening turn', () => {
    const room = makeRoom([{ id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] }]);
    const session = makeFakeSession({ room, player: ada, error: null });
    render(WritingDrawing, { props: { session } });

    expect(screen.queryByText(/never been told the original phrase/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/what you see drawn above/i)).not.toBeInTheDocument();
  });

  it('renders an origin-turn hint framing the player as setting the phrase', () => {
    const room = makeRoom([{ id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] }]);
    const session = makeFakeSession({ room, player: ada, error: null });
    render(WritingDrawing, { props: { session } });

    expect(screen.getByText(/the rest of the circle will chase/i)).toBeInTheDocument();
  });

  it('still renders the blind-guess copy on a later text turn', () => {
    const strokes = serializeDrawOps([
      {
        type: 'stroke',
        points: [
          { x: 0, y: 0 },
          { x: 4, y: 4 },
        ],
        color: '#1e293b',
        width: 3,
      },
    ]);
    // Ada's book: her opening phrase, then Grace's drawing. Position 2 is a
    // text turn -- a genuine blind guess.
    const book: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'e0',
          bookId: 'book-ada',
          authorId: ada.id,
          position: 0,
          type: 'text',
          content: 'a phrase',
        },
        {
          id: 'e1',
          bookId: 'book-ada',
          authorId: grace.id,
          position: 1,
          type: 'drawing',
          content: strokes,
        },
      ],
    };
    const room = makeRoom([book], [ada, grace, lin]);
    const session = makeFakeSession({ room, player: lin, error: null });
    render(WritingDrawing, { props: { session } });

    expect(screen.getByText(/never been told the original phrase/i)).toBeInTheDocument();
  });
});

/**
 * The prompt-rating control (ui.md Writing/Drawing View). Shown on the
 * ONE drawing turn whose source is a book's opening phrase — the drawer
 * at `Entry.position === 1` is the only player who had to work with that
 * phrase, so the only useful judge of it.
 */
describe('prompt rating control', () => {
  /** A book with `entryCount` entries already in, so the next turn is at `entryCount`. */
  function bookWithEntries(entryCount: number): Book {
    const authors = [ada, grace, lin];
    return {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: Array.from({ length: entryCount }, (_, position) => ({
        id: `e${position}`,
        bookId: 'book-ada',
        authorId: authors[position % authors.length]!.id,
        position,
        type: position % 2 === 0 ? ('text' as const) : ('drawing' as const),
        content: position === 0 ? 'a spoonful of sugar' : serializeDrawOps([]),
      })),
    };
  }

  function renderAtPosition(position: number, player = grace) {
    const room = makeRoom([bookWithEntries(position)], [ada, grace, lin]);
    const session = makeFakeSession({ room, player, error: null });
    return { ...render(WritingDrawing, { props: { session } }), session };
  }

  it('renders both thumbs on the position-1 drawing turn', () => {
    renderAtPosition(1);

    expect(screen.getByRole('button', { name: /^thumbs up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^thumbs down/i })).toBeInTheDocument();
  });

  it('asks about the phrase, not the drawing', () => {
    renderAtPosition(1);

    expect(screen.getByText(/was this fun to draw/i)).toBeInTheDocument();
  });

  /**
   * T005 — the control ships with an inline explanation (T004 decision).
   * Without it a player sees thumbs on a phrase ANOTHER player wrote and
   * reads it as rating that person, the exact dynamic ui.md designed out.
   * Asserted as three claims, not as wording: what it is for, that it is
   * anonymous, and that nobody ever sees it.
   */
  it('explains what the rating is for, inline at the control', async () => {
    const { container } = renderAtPosition(1);

    const help = screen.getByRole('button', { name: /rating/i });
    await fireEvent.click(help);

    const copy = (container.textContent ?? '').replace(/\s+/g, ' ');
    // 1. it tunes the curated phrase deck
    expect(copy).toMatch(/phrase(s)? (we|the house) (offer|deal)|which phrases|phrase bank|deck/i);
    // 2. it is anonymous
    expect(copy).toMatch(/anonymous/i);
    // 3. it is never shown to anyone, the phrase's author included
    expect(copy).toMatch(/never shown|no one (ever )?sees|nobody (ever )?sees/i);
    expect(copy).toMatch(/wrote it|author|whoever wrote/i);
  });

  it('keeps the explanation collapsed until asked', () => {
    const { container } = renderAtPosition(1);

    expect(screen.getByRole('button', { name: /rating/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(container.textContent ?? '').not.toMatch(/anonymous/i);
  });

  /**
   * T006 — the Writing/Drawing half of the absence guard whose Reveal half
   * lives in `Reveal.test.ts` ("prompt ratings are never surfaced to
   * players"). Extended here rather than duplicated, because T005 added
   * explanatory copy on THIS screen and "explain the rating" is a short
   * step from "show the rating".
   *
   * Scoped to a rating *readback* — a value, count, or tally rendered as
   * content. The thumbs' own `aria-pressed` is deliberately NOT in scope:
   * it is the toggle's pressed state, the feedback that makes the control
   * operable at all, and it reflects only what this player just pressed in
   * this un-submitted turn. ui.md forbids showing a rating that has been
   * recorded, not the button you are currently holding down.
   */
  it('surfaces no rating value, count, or tally — before or after casting one', async () => {
    const { container } = renderAtPosition(1);

    const readback =
      /\b\d+\s*(?:ratings?|thumbs|votes?|up|down)\b|\b(?:rated|score|tally|average|liked by|out of)\b|\d+\s*%/i;

    expect(container.textContent ?? '').not.toMatch(readback);

    await fireEvent.click(screen.getByRole('button', { name: /^thumbs up/i }));
    expect(container.textContent ?? '').not.toMatch(readback);

    // The explanation itself must not become a readback either.
    await fireEvent.click(screen.getByRole('button', { name: /rating/i }));
    expect(container.textContent ?? '').not.toMatch(readback);
  });

  it('never shows another player’s rating of this phrase', () => {
    const { container } = renderAtPosition(1);

    // Nothing in the rendered turn attributes a rating to a named guest.
    const text = container.textContent ?? '';
    for (const name of ['Ada', 'Grace', 'Lin']) {
      expect(text).not.toMatch(new RegExp(`${name}[^.]{0,40}(?:rated|thumbs|liked)`, 'i'));
    }
  });

  it('renders NO rating control on the position-0 writing turn', () => {
    renderAtPosition(0, ada);

    expect(screen.queryByRole('button', { name: /^thumbs up/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/was this fun to draw/i)).not.toBeInTheDocument();
  });

  it('renders NO rating control on the position-2 writing turn', () => {
    renderAtPosition(2, lin);

    expect(screen.queryByRole('button', { name: /^thumbs up/i })).not.toBeInTheDocument();
  });

  /**
   * Position 3 is a drawing turn like position 1, which is exactly why
   * this is asserted separately: "is a drawing turn" is the wrong
   * condition, and only this test tells the two apart.
   */
  it('renders NO rating control on the position-3 DRAWING turn — it draws a guess, not a prompt', () => {
    renderAtPosition(3, ada);

    expect(screen.getByRole('img', { name: /drawing canvas/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^thumbs up/i })).not.toBeInTheDocument();
  });

  it('starts with neither thumb selected — untouched is the normal path', () => {
    renderAtPosition(1);

    expect(screen.getByRole('button', { name: /^thumbs up/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /^thumbs down/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows the chosen thumb as selected once cast', async () => {
    renderAtPosition(1);

    await fireEvent.click(screen.getByRole('button', { name: /^thumbs up/i }));

    expect(screen.getByRole('button', { name: /^thumbs up/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('can be changed until submit — picking the other thumb moves the selection', async () => {
    renderAtPosition(1);

    await fireEvent.click(screen.getByRole('button', { name: /^thumbs up/i }));
    await fireEvent.click(screen.getByRole('button', { name: /^thumbs down/i }));

    expect(screen.getByRole('button', { name: /^thumbs down/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^thumbs up/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('can be un-cast by tapping the selected thumb again', async () => {
    renderAtPosition(1);

    await fireEvent.click(screen.getByRole('button', { name: /^thumbs up/i }));
    await fireEvent.click(screen.getByRole('button', { name: /^thumbs up/i }));

    expect(screen.getByRole('button', { name: /^thumbs up/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  /**
   * The control is never a gate. The submit button's enabled state is a
   * function of the drawing alone — a player who ignores the rating must
   * reach exactly the same submit affordance as one who casts it.
   */
  it('never gates the submit button — enabled state depends on the drawing alone', async () => {
    const { container } = renderAtPosition(1);
    const submit = screen.getByRole('button', { name: /present your contribution/i });

    // No stroke drawn yet: disabled, with or without a rating.
    expect(submit).toBeDisabled();
    await fireEvent.click(screen.getByRole('button', { name: /^thumbs up/i }));
    expect(submit).toBeDisabled();
    expect(container).toBeTruthy();
  });

  /**
   * Both thumbs render regardless of phrase origin. Branching the control
   * by origin would leak which mode produced a phrase the player is not
   * otherwise told about (ui.md) — so this asserts the control is
   * identical in curated and free-form rooms.
   */
  it('renders both thumbs identically in curated and free-form rooms', () => {
    for (const promptMode of ['free-form', 'curated'] as const) {
      cleanup();
      const room = { ...makeRoom([bookWithEntries(1)], [ada, grace, lin]), promptMode };
      const session = makeFakeSession({ room, player: grace, error: null });
      render(WritingDrawing, { props: { session } });

      expect(screen.getByRole('button', { name: /^thumbs up/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^thumbs down/i })).toBeInTheDocument();
    }
  });
});
