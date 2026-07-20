import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { writable, type Writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
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
const grace = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2', kicked: false };
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

    expect(screen.getByText(/never (been )?told the original phrase|never seen the original phrase/i)).toBeInTheDocument();
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
        { id: 'a0', bookId: 'book-ada', authorId: ada.id, position: 0, type: 'text', content: 'p1' },
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
        { id: 'c0', bookId: 'book-lin', authorId: lin.id, position: 0, type: 'text', content: 'p3' },
      ],
    };
    const room = makeRoom([bookA, bookB, bookC], [ada, grace, lin]);
    const session = makeFakeSession({ room, player: grace, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByText(/awaiting the round.s conclusion/i)).toBeInTheDocument();
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

    expect(screen.queryByRole('button', { name: /declare the turn forfeit/i })).not.toBeInTheDocument();
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
    expect(session.submitEntry).toHaveBeenCalledWith('book-ada', expect.any(String));
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

  it('preserves in-progress draft text across a room broadcast that leaves this player\'s turn identity unchanged (F1 regression)', async () => {
    // Grace is assigned position 1 (a guess) on Lin's book. Ada's book is a
    // separate, independent book also mid-round.
    const linBook: Book = {
      id: 'book-lin',
      roomId,
      originAuthorId: lin.id,
      entries: [
        { id: 'l0', bookId: 'book-lin', authorId: lin.id, position: 0, type: 'text', content: 'p1' },
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
        { id: 'a0', bookId: 'book-ada', authorId: ada.id, position: 0, type: 'text', content: 'p2' },
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
        { id: 'a2', bookId: 'book-ada', authorId: lin.id, position: 2, type: 'text', content: 'p2-guess' },
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
      { type: 'stroke', points: [{ x: 0, y: 0 }, { x: 4, y: 4 }], color: '#1e293b', width: 3 },
    ]);
    // Ada's book: her opening phrase, then Grace's drawing. Position 2 is a
    // text turn -- a genuine blind guess.
    const book: Book = {
      id: 'book-ada',
      roomId,
      originAuthorId: ada.id,
      entries: [
        { id: 'e0', bookId: 'book-ada', authorId: ada.id, position: 0, type: 'text', content: 'a phrase' },
        { id: 'e1', bookId: 'book-ada', authorId: grace.id, position: 1, type: 'drawing', content: strokes },
      ],
    };
    const room = makeRoom([book], [ada, grace, lin]);
    const session = makeFakeSession({ room, player: lin, error: null });
    render(WritingDrawing, { props: { session } });

    expect(screen.getByText(/never been told the original phrase/i)).toBeInTheDocument();
  });
});
