import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import { serializeStrokes } from '@exquisite-telephone/shared';
import type { SessionState, SessionStore } from '../stores/session.js';
import WritingDrawing from './WritingDrawing.svelte';

afterEach(() => cleanup());

function makeFakeSession(initial: Omit<SessionState, 'reconnecting'>): SessionStore {
  const store = writable<SessionState>({ reconnecting: false, ...initial });
  return {
    subscribe: store.subscribe,
    createRoom: vi.fn(async () => {}),
    joinRoom: vi.fn(async () => {}),
    startGame: vi.fn(async () => {}),
    submitEntry: vi.fn(async () => {}),
  };
}

const roomId = 'ABCDE';
const ada = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1' };
const grace = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2' };
const lin = { id: 'lin', roomId, name: 'Lin', connected: true, sessionToken: 't3' };

function makeRoom(books: Book[], players = [ada, grace]): Room {
  return {
    id: roomId,
    hostPlayerId: ada.id,
    players,
    status: 'writing',
    books,
    createdAt: Date.now(),
    turnTimerMinutes: null,
    roundStartedAt: null,
    timerExtensions: {},
    pendingTimeoutVote: null,
  };
}

describe('Writing/Drawing view', () => {
  it("shows a text prompt when it is the player's turn to write the origin phrase", () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: ada, error: null });

    render(WritingDrawing, { props: { session } });

    expect(screen.getByLabelText(/your phrase/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
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

  it('shows the previous drawing as reference when writing a guess', () => {
    const strokes = serializeStrokes([
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
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

    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
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

    expect(screen.getByText(/waiting for the round to finish/i)).toBeInTheDocument();
  });

  it('submits the written phrase to the session store', async () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room = makeRoom([adaBook]);
    const session = makeFakeSession({ room, player: ada, error: null });

    render(WritingDrawing, { props: { session } });
    await fireEvent.input(screen.getByLabelText(/your phrase/i), {
      target: { value: 'a spoonful of sugar' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(session.submitEntry).toHaveBeenCalledWith('book-ada', 'a spoonful of sugar');
  });
});
