/**
 * Named, shared types for the domain model described in
 * .project/artifacts/datamodel.md. These are the single source of truth
 * (constitution Principle VII) for Room/Player/Book/Entry shapes — both
 * the server and the client import from here rather than retyping.
 */

/** Lifecycle stage of a Room, per datamodel.md. */
export type RoomStatus = 'lobby' | 'writing' | 'reveal' | 'ended';

/** Whether an Entry is a written phrase or a drawing of one. */
export type EntryType = 'text' | 'drawing';

/**
 * A single step in a Book's chain: either a text phrase or a drawing,
 * authored by one player at one position in the sequence.
 */
export interface Entry {
  id: string;
  bookId: string;
  authorId: string;
  /** Strictly sequential per Book, starting at 0 (datamodel Normalization Rules). */
  position: number;
  type: EntryType;
  /**
   * Text phrase, or serialized drawing (vector stroke data), depending on
   * `type`. Rasterized to PNG only at export time.
   */
  content: string;
  /**
   * `true` if this entry was auto-submitted empty because the author's
   * per-turn timer expired and a timeout vote (or the no-eligible-voter
   * fallback) resolved to "force empty". Omitted/`false` for normally
   * submitted entries.
   */
  emptyByTimeout?: boolean;
}

/** One player's original prompt and the ordered chain of entries it accumulates. */
export interface Book {
  id: string;
  roomId: string;
  originAuthorId: string;
  entries: Entry[];
}

/** An ephemeral, session-scoped participant in a Room. */
export interface Player {
  id: string;
  roomId: string;
  name: string;
  /** Drives reconnect-tolerance UI state. */
  connected: boolean;
  /** Opaque token used to resume the same Player.id after a dropped connection. */
  sessionToken: string;
  /**
   * Host-set via moderation "kick player"; defaults `false`. A kicked
   * player stays in `Room.players` but is excluded from the regenerated
   * `books` on the next "restart game," and from
   * `eligibleVoterIds`/`stalledPlayerIds` on any subsequent timeout vote.
   */
  kicked: boolean;
}

/** One of the four choices a player may cast in a pending {@link TimeoutVote}. */
export type TimeoutVoteChoice = 'full' | 'half' | '15m' | 'force-empty';

/**
 * Open while a round's timer has expired with players still short of
 * their deadline (datamodel.md Normalization Rules — Turn timer). Only
 * present as `Room.pendingTimeoutVote`.
 */
export interface TimeoutVote {
  /** FK -> Player.id — every player who hadn't submitted their current-round entry when the timer expired. */
  stalledPlayerIds: string[];
  /** FK -> Player.id — players who had already submitted this round, or every player in the room if none had. */
  eligibleVoterIds: string[];
  /** Cast so far; a player may vote once per pending vote. */
  votes: Record<string, TimeoutVoteChoice>;
  /** Epoch ms; the vote resolves when every eligible voter has voted, or this deadline passes, whichever is first. */
  voteDeadline: number;
}

/** The authoritative, in-memory game session. */
export interface Room {
  /** Short, human-shareable room code (e.g. 4-6 chars), not a UUID. */
  id: string;
  hostPlayerId: string;
  players: Player[];
  status: RoomStatus;
  books: Book[];
  /** Epoch milliseconds. */
  createdAt: number;
  /**
   * Host-configurable, set before `status` leaves `lobby`; defaults
   * `false`. When `true`, the drawing tool's color palette is hidden and
   * all strokes render in the default ink color.
   */
  monochromeOnly: boolean;
  /**
   * Host-configurable, set before `status` leaves `lobby`. Defaults
   * `null` (no timer — the room waits indefinitely for the current
   * round). One of 15|30|60|240|720 minutes when set.
   */
  turnTimerMinutes: 15 | 30 | 60 | 240 | 720 | null;
  /**
   * Host-configurable, set before `status` leaves `lobby`; `null` means
   * the host hasn't explicitly chosen a value yet — the Lobby derives
   * and displays a live default from the current player count instead
   * (see datamodel.md Normalization Rules — Laps per book), and
   * `onStartGame` resolves it to a concrete number the same way if
   * still `null` when the game starts. When non-`null`, one of
   * `1 | 2 | 3`. Governs how many full rotations through `Room.players`
   * each book completes before the game ends.
   */
  lapsPerBook: number | null;
  /**
   * Host-configurable, set before `status` leaves `lobby`; defaults
   * `'free-form'` (players type their own opening phrase — the original
   * behavior). When `'curated'`, each player instead picks their opening
   * phrase from a dealt hand (see datamodel.md Normalization Rules —
   * Curated prompts).
   */
  promptMode: 'free-form' | 'curated';
  /**
   * Host-configurable, set before `status` leaves `lobby`; how many
   * phrases each player is dealt. One of `2 | 3 | 4 | 5` when set;
   * `null` while `promptMode === 'free-form'`. Clamped at deal time.
   */
  curatedPromptCount: 2 | 3 | 4 | 5 | null;
  /**
   * Host-configurable, set before `status` leaves `lobby`; defaults
   * `true`. When `true`, a curated-mode player may ignore their dealt
   * hand and write their own opening phrase instead.
   */
  allowPromptWriteIn: boolean;
  /**
   * FK -> Player.id. The phrases dealt to each non-kicked player at game
   * start, from a single shuffle-then-partition of the fixed phrase bank
   * — which is what guarantees no phrase reaches two players in the same
   * game. Empty `{}` while `promptMode === 'free-form'`. Re-dealt on
   * *Restart game*.
   */
  dealtPrompts: Record<string, string[]>;
  /**
   * Epoch ms marking when the current round began; `null` while
   * `status === 'lobby'`. Reset whenever the room-wide current round
   * advances. Only meaningful when `turnTimerMinutes` is set.
   */
  roundStartedAt: number | null;
  /**
   * Per-player extra milliseconds granted this round via a timeout vote;
   * cleared whenever the round advances.
   */
  timerExtensions: Record<string, number>;
  /**
   * Set by the server when a round's timer expires with players still
   * short of their deadline; `null` otherwise.
   */
  pendingTimeoutVote: TimeoutVote | null;
  /**
   * FK -> Player.id, deduplicated. Non-host players who've clicked "vote
   * to play again" on the Reveal page. Purely informational — shown to
   * the host as a readiness count, never gates `Room.status`. Never
   * populated outside `status === 'reveal'`; a fresh `Room` created by
   * "Play again" starts with an empty array like any other new room.
   */
  playAgainVotes: string[];
  /**
   * Set `true` the moment a host kicks a player while `status ===
   * 'writing'`; `false` otherwise, including after "restart game" clears
   * it. Never set outside `writing` — a kick during `lobby` or `reveal`
   * has nothing to make non-continuable.
   */
  nonContinuable: boolean;
  /**
   * Reveal-only. FK Book.id -> deduped Player.id[] who have completed a
   * read of that book — opened its per-book modal and then closed it (see
   * ui.md Reveal View). Keyed by `Book.id` because both consumers (the
   * per-card "read by" badges and the host's unread-books warning)
   * aggregate per book; per-player views stay derivable. Empty `{}`
   * outside `status === 'reveal'`; a fresh `Room` from "Play again" starts
   * empty like any other new room.
   */
  bookReads: Record<string, string[]>;
  /**
   * Reveal-only. FK Player.id -> Book.id currently open in that player's
   * modal — an absent key means that player has no modal open. Keyed by
   * `Player.id` because a reader has exactly one book open at a time.
   * Drives the live "being read by" badge; cleared for a player on
   * disconnect (so the badge does not leak) without crediting a completed
   * read. Empty `{}` outside `status === 'reveal'`.
   */
  currentlyReading: Record<string, string>;
}

/**
 * A player's verdict on a book's opening phrase, cast on the
 * `Entry.position === 1` drawing turn. See datamodel.md Normalization
 * Rules — Prompt rating.
 */
export type PromptRatingValue = 'up' | 'down';

/**
 * Running tally for one curated-bank phrase.
 *
 * PERSISTED. Along with {@link CandidatePhrase}, this is one of only two
 * shapes in this app that outlive the server process — everything else
 * (Room, Player, Book, Entry) is in-memory and dies with a restart. It
 * lives in the Curation Store's JSON file, not the room store, and
 * carries no link back to the rater or the phrase's author.
 */
export interface PromptRating {
  /** Verbatim text from `CURATED_PHRASE_BANK`; the record key. */
  phrase: string;
  /** Count of thumbs-up, across all games ever played. */
  up: number;
  /** Count of thumbs-down, across all games ever played. */
  down: number;
}

/**
 * A distinct player-written opening phrase that has received at least
 * one thumbs-up — the mining path for new bank entries. There is no
 * negative counterpart: a thumbs-down on a player-written phrase is
 * recorded nowhere (datamodel.md Persisted Entities).
 *
 * PERSISTED. Like {@link PromptRating}, one of only two shapes in this
 * app that outlive the server process, and the only one holding
 * player-authored text past the life of its room.
 */
export interface CandidatePhrase {
  /** Verbatim player-written text; the record key. Never normalized or lowercased. */
  phrase: string;
  /** How many times this exact text has been thumbs-upped, across all games. */
  votes: number;
  /** Epoch ms of the first thumbs-up. */
  firstLoggedAt: number;
}

/**
 * What a client sends to submit its current turn. `Entry.position` and
 * `type` are deliberately absent — the server computes them from the
 * round-robin turn order rather than trusting the client (datamodel.md
 * Normalization Rules).
 */
export interface SubmitEntryPayload {
  roomId: string;
  playerId: string;
  bookId: string;
  /** Text phrase, or serialized drawing-stroke data — see {@link Entry}. */
  content: string;
  /**
   * Optional verdict on the book's opening phrase, carried along with
   * the submission rather than as its own round trip. Optional because a
   * rating is never required to submit a turn, and only ever acted on
   * when the submitted entry is `position === 1` — see datamodel.md
   * Normalization Rules — Prompt rating.
   */
  rating?: PromptRatingValue;
}
