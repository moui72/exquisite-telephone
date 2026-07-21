import { describe, expect, it } from 'vitest';
import type {
  Book,
  CandidatePhrase,
  Entry,
  Player,
  PromptRating,
  PromptRatingValue,
  Room,
  SubmitEntryPayload,
} from './index.js';

describe('datamodel types (datamodel.md)', () => {
  it('Entry requires id, bookId, authorId, position, type, content', () => {
    const entry: Entry = {
      id: 'entry-1',
      bookId: 'book-1',
      authorId: 'player-1',
      position: 0,
      type: 'text',
      content: 'a phrase',
    };

    expect(entry.type === 'text' || entry.type === 'drawing').toBe(true);
    expect(entry.position).toBeGreaterThanOrEqual(0);
  });

  it('Book requires id, roomId, originAuthorId, and an ordered entries chain', () => {
    const entry: Entry = {
      id: 'entry-1',
      bookId: 'book-1',
      authorId: 'player-1',
      position: 0,
      type: 'text',
      content: 'a phrase',
    };
    const book: Book = {
      id: 'book-1',
      roomId: 'room-1',
      originAuthorId: 'player-1',
      entries: [entry],
    };

    expect(book.entries).toHaveLength(1);
    expect(book.entries[0]?.id).toBe('entry-1');
  });

  it('Player requires id, roomId, name, connected, sessionToken, kicked', () => {
    const player: Player = {
      id: 'player-1',
      roomId: 'room-1',
      name: 'Ada',
      connected: true,
      sessionToken: 'token-1',
      kicked: false,
    };

    expect(player.connected).toBe(true);
    expect(player.kicked).toBe(false);
  });

  it('Room requires id, hostPlayerId, players, status, books, createdAt, nonContinuable', () => {
    const player: Player = {
      id: 'player-1',
      roomId: 'room-1',
      name: 'Ada',
      connected: true,
      sessionToken: 'token-1',
      kicked: false,
    };
    const room: Room = {
      id: 'room-1',
      hostPlayerId: 'player-1',
      players: [player],
      status: 'lobby',
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
    };

    const validStatuses: Room['status'][] = ['lobby', 'writing', 'reveal', 'ended'];
    expect(validStatuses).toContain(room.status);
    expect(room.players).toHaveLength(1);
    expect(room.playAgainVotes).toHaveLength(0);
    expect(room.nonContinuable).toBe(false);
  });

  it('carries the curated-prompt fields at their free-form defaults (datamodel.md Room)', () => {
    const room: Room = {
      id: 'room-1',
      hostPlayerId: 'player-1',
      players: [],
      status: 'lobby',
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
    };

    const validModes: Room['promptMode'][] = ['free-form', 'curated'];
    expect(validModes).toContain(room.promptMode);
    expect(room.curatedPromptCount).toBeNull();
    expect(room.allowPromptWriteIn).toBe(true);
    expect(room.dealtPrompts).toEqual({});

    const curated: Room = { ...room, promptMode: 'curated', curatedPromptCount: 3 };
    expect(curated.curatedPromptCount).toBe(3);
  });
});

describe('persisted curation types (datamodel.md Persisted Entities)', () => {
  it('PromptRating requires phrase, up, down', () => {
    const rating: PromptRating = { phrase: 'a bear on a unicycle', up: 3, down: 1 };

    expect(rating.phrase).toBe('a bear on a unicycle');
    expect(rating.up).toBe(3);
    expect(rating.down).toBe(1);
  });

  it('CandidatePhrase requires phrase, votes, firstLoggedAt', () => {
    const candidate: CandidatePhrase = {
      phrase: 'a moose reading the news',
      votes: 2,
      firstLoggedAt: 1_700_000_000_000,
    };

    expect(candidate.phrase).toBe('a moose reading the news');
    expect(candidate.votes).toBe(2);
    expect(candidate.firstLoggedAt).toBeGreaterThan(0);
  });

  it('PromptRatingValue is exactly up | down', () => {
    const values: PromptRatingValue[] = ['up', 'down'];

    expect(values).toEqual(['up', 'down']);
  });
});

describe('SubmitEntryPayload (datamodel.md Normalization Rules — Prompt rating)', () => {
  it('typechecks without a rating — rating is never required to submit a turn', () => {
    const payload: SubmitEntryPayload = {
      roomId: 'room-1',
      playerId: 'player-1',
      bookId: 'book-1',
      content: 'a phrase',
    };

    expect(payload.rating).toBeUndefined();
    expect(payload.content).toBe('a phrase');
  });

  it('accepts an optional rating of up or down', () => {
    const up: SubmitEntryPayload = {
      roomId: 'room-1',
      playerId: 'player-1',
      bookId: 'book-1',
      content: 'a phrase',
      rating: 'up',
    };
    const down: SubmitEntryPayload = { ...up, rating: 'down' };

    expect(up.rating).toBe('up');
    expect(down.rating).toBe('down');
  });
});
