import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import { serializeDrawOps } from '@exquisite-telephone/shared';
import Reveal from './Reveal.svelte';

afterEach(() => cleanup());

const roomId = 'ABCDE';
const ada = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1' };
const grace = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2' };

describe('Reveal view', () => {
  it("renders each book's full ordered chain of entries", () => {
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
    };

    render(Reveal, { props: { room } });

    expect(screen.getByText('a spoonful of sugar')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /drawing preview/i })).toBeInTheDocument();
  });

  it('renders one section per book, in order', () => {
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
    };

    render(Reveal, { props: { room } });

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
    };
    const exportFn = vi.fn(() => 'data:image/png;base64,FAKE');

    render(Reveal, { props: { room, exportFn } });

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    expect(saveButtons).toHaveLength(2);

    await fireEvent.click(saveButtons[0]!);

    expect(exportFn).toHaveBeenCalledWith(bookA, room.players);
  });
});
