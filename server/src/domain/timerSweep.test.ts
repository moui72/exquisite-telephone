import { describe, expect, it } from 'vitest';
import type { Book, Player, Room, TimeoutVote } from '@exquisite-telephone/shared';
import { resolveTimeoutVote } from './timerSweep.js';

function makePlayer(id: string, roomId: string): Player {
  return { id, roomId, name: id, connected: true, sessionToken: `${id}-token` };
}

const roomId = 'ROOM1';
const ada = makePlayer('ada', roomId);
const grace = makePlayer('grace', roomId);
const lin = makePlayer('lin', roomId);

function makeRoom(overrides: Partial<Room> & { books: Book[] }): Room {
  return {
    id: roomId,
    hostPlayerId: ada.id,
    players: [ada, grace, lin],
    status: 'writing',
    createdAt: Date.now(),
    turnTimerMinutes: 30,
    roundStartedAt: Date.now() - 40 * 60_000,
    timerExtensions: {},
    pendingTimeoutVote: null,
    ...overrides,
  };
}

describe('resolveTimeoutVote', () => {
  it('a plurality of full votes extends timerExtensions for every stalled player and clears the vote', () => {
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries: [] };
    const bookB: Book = { id: 'bookB', roomId, originAuthorId: grace.id, entries: [] };
    const pendingTimeoutVote: TimeoutVote = {
      stalledPlayerIds: [ada.id, grace.id],
      eligibleVoterIds: [lin.id],
      votes: { [lin.id]: 'full' },
      voteDeadline: Date.now() + 60_000,
    };
    const room = makeRoom({ books: [bookA, bookB], pendingTimeoutVote });

    resolveTimeoutVote(room, Date.now());

    expect(room.timerExtensions[ada.id]).toBe(30 * 60_000);
    expect(room.timerExtensions[grace.id]).toBe(30 * 60_000);
    expect(room.pendingTimeoutVote).toBeNull();
    // No forced entries were inserted.
    expect(bookA.entries).toHaveLength(0);
    expect(bookB.entries).toHaveLength(0);
  });

  it('a plurality of half votes extends timerExtensions by half the full turn duration', () => {
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries: [] };
    const pendingTimeoutVote: TimeoutVote = {
      stalledPlayerIds: [ada.id],
      eligibleVoterIds: [grace.id, lin.id],
      votes: { [grace.id]: 'half', [lin.id]: 'half' },
      voteDeadline: Date.now() + 60_000,
    };
    const room = makeRoom({ books: [bookA], pendingTimeoutVote });

    resolveTimeoutVote(room, Date.now());

    expect(room.timerExtensions[ada.id]).toBe(15 * 60_000);
    expect(room.pendingTimeoutVote).toBeNull();
  });

  it('a plurality of 15m votes grants a flat 15-minute extension', () => {
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries: [] };
    const pendingTimeoutVote: TimeoutVote = {
      stalledPlayerIds: [ada.id],
      eligibleVoterIds: [grace.id, lin.id],
      votes: { [grace.id]: '15m', [lin.id]: '15m' },
      voteDeadline: Date.now() + 60_000,
    };
    const room = makeRoom({ books: [bookA], pendingTimeoutVote });

    resolveTimeoutVote(room, Date.now());

    expect(room.timerExtensions[ada.id]).toBe(15 * 60_000);
    expect(room.pendingTimeoutVote).toBeNull();
  });

  it('a plurality force-empty result auto-submits an empty entry for every stalled player on their book', () => {
    // All three books are at round 0. Grace already submitted her own
    // book's origin phrase (round-gating lets her get ahead of the
    // still-zero books, but not past currentRound); ada and lin have not
    // submitted bookA/bookC's round-0 entries and are both stalled.
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries: [] };
    const bookB: Book = {
      id: 'bookB',
      roomId,
      originAuthorId: grace.id,
      entries: [
        {
          id: 'b0',
          bookId: 'bookB',
          authorId: grace.id,
          position: 0,
          type: 'text',
          content: 'phrase',
        },
      ],
    };
    const bookC: Book = { id: 'bookC', roomId, originAuthorId: lin.id, entries: [] };
    const pendingTimeoutVote: TimeoutVote = {
      stalledPlayerIds: [ada.id, lin.id],
      eligibleVoterIds: [grace.id],
      votes: { [grace.id]: 'force-empty' },
      voteDeadline: Date.now() + 60_000,
    };
    const room = makeRoom({ books: [bookA, bookB, bookC], pendingTimeoutVote });

    resolveTimeoutVote(room, Date.now());

    expect(bookA.entries).toHaveLength(1);
    expect(bookA.entries[0]).toMatchObject({
      authorId: ada.id,
      position: 0,
      type: 'text',
      content: '',
      emptyByTimeout: true,
    });
    expect(bookC.entries).toHaveLength(1);
    expect(bookC.entries[0]).toMatchObject({
      authorId: lin.id,
      position: 0,
      type: 'text',
      content: '',
      emptyByTimeout: true,
    });
    expect(room.pendingTimeoutVote).toBeNull();
  });

  it('zero votes cast by the deadline resolves to force-empty', () => {
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries: [] };
    const pendingTimeoutVote: TimeoutVote = {
      stalledPlayerIds: [ada.id],
      eligibleVoterIds: [grace.id, lin.id],
      votes: {},
      voteDeadline: Date.now() - 1,
    };
    const room = makeRoom({ books: [bookA], pendingTimeoutVote });

    resolveTimeoutVote(room, Date.now());

    expect(bookA.entries).toHaveLength(1);
    expect(bookA.entries[0]).toMatchObject({ emptyByTimeout: true, content: '' });
    expect(room.pendingTimeoutVote).toBeNull();
  });

  it('a tie among full/half/15m/force-empty resolves in preference order (most lenient first)', () => {
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries: [] };
    // 4-way tie: one vote each. "full" is most lenient and should win.
    const pendingTimeoutVote: TimeoutVote = {
      stalledPlayerIds: [ada.id],
      eligibleVoterIds: [grace.id, lin.id],
      votes: { [grace.id]: 'force-empty', [lin.id]: 'full' },
      voteDeadline: Date.now() + 60_000,
    };
    const room = makeRoom({ books: [bookA], pendingTimeoutVote });

    resolveTimeoutVote(room, Date.now());

    expect(room.timerExtensions[ada.id]).toBe(30 * 60_000);
    expect(bookA.entries).toHaveLength(0);
  });

  it('a tie between half and 15m resolves to half (more lenient)', () => {
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries: [] };
    const pendingTimeoutVote: TimeoutVote = {
      stalledPlayerIds: [ada.id],
      eligibleVoterIds: [grace.id, lin.id],
      votes: { [grace.id]: '15m', [lin.id]: 'half' },
      voteDeadline: Date.now() + 60_000,
    };
    const room = makeRoom({ books: [bookA], pendingTimeoutVote });

    resolveTimeoutVote(room, Date.now());

    expect(room.timerExtensions[ada.id]).toBe(15 * 60_000);
  });
});
