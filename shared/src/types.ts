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
   * Epoch ms marking when `status` transitioned to `reveal`; `null`
   * otherwise. Gives every client a shared reference point to derive the
   * Reveal page's animated pacing (current book index, revealed-entry
   * count) as a pure function of `now - revealStartedAt`, rather than
   * each client running its own independent local timer.
   */
  revealStartedAt: number | null;
}
