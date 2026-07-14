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
}
