import { describe, expect, it } from 'vitest';
import type { Book, Entry, Player, Room } from './types.js';
import {
  activePlayers,
  computeNextEntry,
  computeNextEntries,
  currentRoundFor,
  defaultLapsPerBook,
} from './turnAdvancement.js';

function makePlayer(id: string, roomId: string): Player {
  return { id, roomId, name: id, connected: true, sessionToken: `${id}-token`, kicked: false };
}

function makeEntry(bookId: string, authorId: string, position: number): Entry {
  return {
    id: `${bookId}-${position}`,
    bookId,
    authorId,
    position,
    type: position % 2 === 0 ? 'text' : 'drawing',
    content: `content-${position}`,
  };
}

describe('turn advancement (round-robin per book)', () => {
  const roomId = 'ROOM1';
  const ada = makePlayer('ada', roomId);
  const grace = makePlayer('grace', roomId);
  const lin = makePlayer('lin', roomId);
  const players = [ada, grace, lin];

  function makeRoom(books: Book[]): Room {
    return {
      id: roomId,
      hostPlayerId: ada.id,
      players,
      status: 'writing',
      books,
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      // Pinned to a single lap: this block tests round-robin authoring/
      // completion mechanics, not laps-per-book defaults (see the
      // dedicated 'laps per book' describe below for that).
      lapsPerBook: 1,
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

  it('assigns the next entry to the next player in rotation from the book origin author', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    const room = makeRoom([bookA]);

    const next = computeNextEntry(room, bookA);

    expect(next).toEqual({ authorId: grace.id, type: 'drawing', position: 1 });
  });

  it('wraps around the rotation back to the origin author', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0), makeEntry('bookA', grace.id, 1)],
    };
    const room = makeRoom([bookA]);

    const next = computeNextEntry(room, bookA);

    expect(next).toEqual({ authorId: lin.id, type: 'text', position: 2 });
  });

  it('returns null once every player has contributed to the book', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [
        makeEntry('bookA', ada.id, 0),
        makeEntry('bookA', grace.id, 1),
        makeEntry('bookA', lin.id, 2),
      ],
    };
    const room = makeRoom([bookA]);

    expect(computeNextEntry(room, bookA)).toBeNull();
  });

  it('computes the next entry per book across a full multi-player round-robin room', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    const bookB: Book = {
      id: 'bookB',
      roomId,
      originAuthorId: grace.id,
      entries: [makeEntry('bookB', grace.id, 0)],
    };
    const bookC: Book = {
      id: 'bookC',
      roomId,
      originAuthorId: lin.id,
      entries: [makeEntry('bookC', lin.id, 0)],
    };
    const room = makeRoom([bookA, bookB, bookC]);

    const nextEntries = computeNextEntries(room);

    expect(nextEntries).toEqual([
      { bookId: 'bookA', authorId: grace.id, type: 'drawing', position: 1 },
      { bookId: 'bookB', authorId: lin.id, type: 'drawing', position: 1 },
      { bookId: 'bookC', authorId: ada.id, type: 'drawing', position: 1 },
    ]);
  });

  it('excludes completed books from computeNextEntries', () => {
    const completeBook: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [
        makeEntry('bookA', ada.id, 0),
        makeEntry('bookA', grace.id, 1),
        makeEntry('bookA', lin.id, 2),
      ],
    };
    const room = makeRoom([completeBook]);

    expect(computeNextEntries(room)).toEqual([]);
  });
});

describe('round-gating (turns are round-gated, not asynchronous)', () => {
  const roomId = 'ROOM1';
  const ada = makePlayer('ada', roomId);
  const grace = makePlayer('grace', roomId);
  const lin = makePlayer('lin', roomId);
  const players = [ada, grace, lin];

  function makeRoom(books: Book[]): Room {
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
    };
  }

  it('assigns the normal next entry to the book at the room-wide minimum round', () => {
    // bookA is at the minimum (1 entry); bookB is ahead (2 entries).
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    const bookB: Book = {
      id: 'bookB',
      roomId,
      originAuthorId: grace.id,
      entries: [makeEntry('bookB', grace.id, 0), makeEntry('bookB', lin.id, 1)],
    };
    const room = makeRoom([bookA, bookB]);

    const next = computeNextEntry(room, bookA);

    expect(next).toEqual({ authorId: grace.id, type: 'drawing', position: 1 });
  });

  it('returns null for a book ahead of the room-wide minimum round even though it is not complete', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    const bookB: Book = {
      id: 'bookB',
      roomId,
      originAuthorId: grace.id,
      entries: [makeEntry('bookB', grace.id, 0), makeEntry('bookB', lin.id, 1)],
    };
    const room = makeRoom([bookA, bookB]);

    // bookB is ahead of the room-wide minimum (1) even though it's not
    // complete (2 < 3 players) — it must wait for bookA to catch up.
    expect(computeNextEntry(room, bookB)).toBeNull();
  });

  it('currentRoundFor returns the minimum entries.length across all books', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    const bookB: Book = {
      id: 'bookB',
      roomId,
      originAuthorId: grace.id,
      entries: [makeEntry('bookB', grace.id, 0), makeEntry('bookB', lin.id, 1)],
    };
    const room = makeRoom([bookA, bookB]);

    expect(currentRoundFor(room)).toBe(1);
  });

  it('currentRoundFor returns 0 for an empty books array', () => {
    const room = makeRoom([]);

    expect(currentRoundFor(room)).toBe(0);
  });
});

describe('defaultLapsPerBook (datamodel.md Normalization Rules — Laps per book)', () => {
  it('returns 2 when the player count is under 5', () => {
    expect(defaultLapsPerBook(4)).toBe(2);
  });

  it('returns 1 when the player count is 5 or more', () => {
    expect(defaultLapsPerBook(5)).toBe(1);
  });
});

describe('laps per book (multi-lap completion math)', () => {
  const roomId = 'ROOM1';
  const ada = makePlayer('ada', roomId);
  const grace = makePlayer('grace', roomId);
  const lin = makePlayer('lin', roomId);
  const players = [ada, grace, lin];

  function makeRoom(books: Book[], lapsPerBook: number | null): Room {
    return {
      id: roomId,
      hostPlayerId: ada.id,
      players,
      status: 'writing',
      books,
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      lapsPerBook,
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

  it('with lapsPerBook 2 and 3 players, a book does not complete after 3 entries', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [
        makeEntry('bookA', ada.id, 0),
        makeEntry('bookA', grace.id, 1),
        makeEntry('bookA', lin.id, 2),
      ],
    };
    const room = makeRoom([bookA], 2);

    expect(computeNextEntry(room, bookA)).not.toBeNull();
  });

  it('with lapsPerBook 2 and 3 players, author rotation continues correctly into the second lap', () => {
    const entries = [
      makeEntry('bookA', ada.id, 0),
      makeEntry('bookA', grace.id, 1),
      makeEntry('bookA', lin.id, 2),
    ];
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries };
    const room = makeRoom([bookA], 2);

    const next = computeNextEntry(room, bookA);

    // position 3's author should equal position 0's author (ada).
    expect(next).toEqual({ authorId: ada.id, type: 'drawing', position: 3 });
  });

  it('with lapsPerBook 2 and 3 players, position 4 author equals position 1 author', () => {
    const entries = [
      makeEntry('bookA', ada.id, 0),
      makeEntry('bookA', grace.id, 1),
      makeEntry('bookA', lin.id, 2),
      makeEntry('bookA', ada.id, 3),
    ];
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries };
    const room = makeRoom([bookA], 2);

    const next = computeNextEntry(room, bookA);

    expect(next).toEqual({ authorId: grace.id, type: 'text', position: 4 });
  });

  it('with lapsPerBook 2 and 3 players, the book completes after 6 entries', () => {
    const entries = [
      makeEntry('bookA', ada.id, 0),
      makeEntry('bookA', grace.id, 1),
      makeEntry('bookA', lin.id, 2),
      makeEntry('bookA', ada.id, 3),
      makeEntry('bookA', grace.id, 4),
      makeEntry('bookA', lin.id, 5),
    ];
    const bookA: Book = { id: 'bookA', roomId, originAuthorId: ada.id, entries };
    const room = makeRoom([bookA], 2);

    expect(computeNextEntry(room, bookA)).toBeNull();
  });

  it('with lapsPerBook null, completion math falls back to defaultLapsPerBook(players.length)', () => {
    // 3 players -> defaultLapsPerBook(3) === 2, so 3 entries should not complete the book.
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [
        makeEntry('bookA', ada.id, 0),
        makeEntry('bookA', grace.id, 1),
        makeEntry('bookA', lin.id, 2),
      ],
    };
    const room = makeRoom([bookA], null);

    expect(computeNextEntry(room, bookA)).not.toBeNull();
  });
});

describe('activePlayers (kicked players excluded from rotation)', () => {
  const roomId = 'ROOM1';
  const ada = makePlayer('ada', roomId);
  const grace = makePlayer('grace', roomId);
  const lin = makePlayer('lin', roomId);

  function makeRoom(players: Player[], books: Book[], lapsPerBook: number | null): Room {
    return {
      id: roomId,
      hostPlayerId: ada.id,
      players,
      status: 'writing',
      books,
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      lapsPerBook,
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

  it('returns an empty array for an empty roster', () => {
    expect(activePlayers(makeRoom([], [], null))).toEqual([]);
  });

  it('returns all players, in order, when none are kicked', () => {
    const room = makeRoom([ada, grace, lin], [], null);
    expect(activePlayers(room)).toEqual([ada, grace, lin]);
  });

  it('excludes only the kicked players, preserving order of the rest', () => {
    const room = makeRoom([ada, { ...grace, kicked: true }, lin], [], null);
    expect(activePlayers(room)).toEqual([ada, lin]);
  });

  it('returns an empty array when every player is kicked', () => {
    const room = makeRoom(
      [
        { ...ada, kicked: true },
        { ...grace, kicked: true },
      ],
      [],
      null,
    );
    expect(activePlayers(room)).toEqual([]);
  });
});

describe('computeNextEntry over active players (restart after a kick)', () => {
  const roomId = 'ROOM1';
  const ada = makePlayer('ada', roomId);
  const grace = makePlayer('grace', roomId);
  const lin = makePlayer('lin', roomId);

  function makeRoom(players: Player[], books: Book[], lapsPerBook: number | null): Room {
    return {
      id: roomId,
      hostPlayerId: ada.id,
      players,
      status: 'writing',
      books,
      createdAt: Date.now(),
      monochromeOnly: false,
      turnTimerMinutes: null,
      lapsPerBook,
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

  it('assigns turns only to remaining players and lets the book complete after a kick', () => {
    // Restarted room: grace was kicked, so books were regenerated only
    // for ada and lin (2 active players). With lapsPerBook 1 the book
    // completes at 2 entries — the kicked player is never assigned and
    // must not strand the book.
    const kickedGrace = { ...grace, kicked: true };
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    let room = makeRoom([ada, kickedGrace, lin], [bookA], 1);

    // Position 1 rotates to the next *active* player (lin), skipping grace.
    expect(computeNextEntry(room, bookA)).toEqual({
      authorId: lin.id,
      type: 'drawing',
      position: 1,
    });

    // Once lin contributes, the 2-active-player book is complete (not
    // stranded waiting on a turn grace would have taken).
    const completeBook: Book = {
      ...bookA,
      entries: [makeEntry('bookA', ada.id, 0), makeEntry('bookA', lin.id, 1)],
    };
    room = makeRoom([ada, kickedGrace, lin], [completeBook], 1);
    expect(computeNextEntry(room, completeBook)).toBeNull();
  });

  it('returns null for a book whose origin author is kicked', () => {
    const kickedAda = { ...ada, kicked: true };
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: kickedAda.id,
      entries: [makeEntry('bookA', kickedAda.id, 0)],
    };
    const room = makeRoom([kickedAda, grace, lin], [bookA], 1);
    expect(computeNextEntry(room, bookA)).toBeNull();
  });

  it('behaves exactly as before when no player is kicked (regression guard)', () => {
    const bookA: Book = {
      id: 'bookA',
      roomId,
      originAuthorId: ada.id,
      entries: [makeEntry('bookA', ada.id, 0)],
    };
    const room = makeRoom([ada, grace, lin], [bookA], 1);
    expect(computeNextEntry(room, bookA)).toEqual({
      authorId: grace.id,
      type: 'drawing',
      position: 1,
    });
  });
});
