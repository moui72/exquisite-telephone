import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { Book, Room } from '@exquisite-telephone/shared';
import TurnStatus from './TurnStatus.svelte';

afterEach(() => cleanup());

const roomId = 'ABCDE';
const ada = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1', kicked: false };
const grace = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2', kicked: false };
const lin = { id: 'lin', roomId, name: 'Lin', connected: true, sessionToken: 't3', kicked: false };

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
    };

    render(TurnStatus, { props: { room } });

    // Ada is due to write the origin phrase for her own book; the others
    // have nothing pending yet.
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText(/at their easel/i)).toBeInTheDocument();
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
    };

    render(TurnStatus, { props: { room } });

    expect(screen.getAllByText(/piece presented/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/a very secret phrase/i)).not.toBeInTheDocument();
  });

  it('omits a kicked player from the turn-status roster', () => {
    const adaBook: Book = { id: 'book-ada', roomId, originAuthorId: ada.id, entries: [] };
    const room: Room = {
      id: roomId,
      hostPlayerId: ada.id,
      players: [ada, { ...grace, kicked: true }, lin],
      status: 'writing',
      books: [adaBook],
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
    };

    render(TurnStatus, { props: { room } });

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Lin')).toBeInTheDocument();
    expect(screen.queryByText('Grace')).not.toBeInTheDocument();
  });
});

describe('theme regression guard (plan-1449)', () => {
  it('contains no leftover default-Tailwind slate- classes', () => {
    const source = readFileSync(resolve(__dirname, './TurnStatus.svelte'), 'utf-8');
    expect(source).not.toMatch(/slate-/);
  });
});
