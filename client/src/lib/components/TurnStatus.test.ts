import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import TurnStatus from './TurnStatus.svelte';

afterEach(() => cleanup());

const roomId = 'ABCDE';
const ada = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1' };
const grace = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2' };
const lin = { id: 'lin', roomId, name: 'Lin', connected: true, sessionToken: 't3' };

describe('TurnStatus (who is still working, no content revealed)', () => {
  it('shows players with a pending turn as still working', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room: Room = {
      id: roomId,
      hostPlayerId: ada.id,
      players: [ada, grace, lin],
      status: 'writing',
      books: [adaBook],
      createdAt: Date.now(),
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
    };

    render(TurnStatus, { props: { room } });

    // Ada is due to write the origin phrase for her own book; the others
    // have nothing pending yet.
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText(/still working/i)).toBeInTheDocument();
  });

  it('shows a player with no pending entry as done, without revealing any content', () => {
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
          content: 'a very secret phrase',
        },
      ],
    };
    const room: Room = {
      id: roomId,
      hostPlayerId: ada.id,
      players: [ada, grace, lin],
      status: 'writing',
      books: [adaBook],
      createdAt: Date.now(),
      turnTimerMinutes: null,
      roundStartedAt: null,
      timerExtensions: {},
      pendingTimeoutVote: null,
    };

    render(TurnStatus, { props: { room } });

    expect(screen.getAllByText(/done/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/a very secret phrase/i)).not.toBeInTheDocument();
  });
});
