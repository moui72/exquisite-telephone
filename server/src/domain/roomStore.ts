import { randomUUID } from 'node:crypto';
import type { Book, Player, Room } from '@exquisite-telephone/shared';
import { generateRoomCode } from './roomCode.js';

/**
 * The authoritative, in-memory room store (constitution Principle VI —
 * single source of state on the server). No database: room state lives
 * only in this process's memory for the lifetime of the game
 * (datamodel.md Overview).
 */
export interface RoomStore {
  rooms: Map<string, Room>;
  getRoom(roomId: string): Room | undefined;
}

export function createRoomStore(): RoomStore {
  const rooms = new Map<string, Room>();
  return {
    rooms,
    getRoom(roomId: string) {
      return rooms.get(roomId);
    },
  };
}

function generateUniqueRoomCode(store: RoomStore): string {
  let code = generateRoomCode();
  while (store.rooms.has(code)) {
    code = generateRoomCode();
  }
  return code;
}

export interface CreateRoomInput {
  hostName: string;
}

export function createRoom(store: RoomStore, input: CreateRoomInput): Room {
  const roomId = generateUniqueRoomCode(store);
  const hostPlayer: Player = {
    id: randomUUID(),
    roomId,
    name: input.hostName,
    connected: true,
    sessionToken: randomUUID(),
    kicked: false,
  };

  const room: Room = {
    id: roomId,
    hostPlayerId: hostPlayer.id,
    players: [hostPlayer],
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
    decorationWindowStartedAt: null,
    coverSubmissions: [],
  };

  store.rooms.set(room.id, room);
  return room;
}

export interface JoinRoomInput {
  roomId: string;
  playerName: string;
}

export interface JoinRoomResult {
  player?: Player;
  error?: 'room-not-found' | 'room-already-started';
}

/**
 * Adds a new player to an existing room. A room past `lobby` (ui.md's
 * documented "already started" Error state) rejects the join rather than
 * silently seating a late joiner mid-game.
 */
export function joinRoom(store: RoomStore, input: JoinRoomInput): JoinRoomResult {
  const room = store.rooms.get(input.roomId);
  if (!room) {
    return { error: 'room-not-found' };
  }
  if (room.status !== 'lobby') {
    return { error: 'room-already-started' };
  }

  const player: Player = {
    id: randomUUID(),
    roomId: room.id,
    name: input.playerName,
    connected: true,
    sessionToken: randomUUID(),
    kicked: false,
  };

  room.players.push(player);
  return { player };
}

/**
 * Removes a player from their room (e.g. on disconnect past the
 * reconnect-tolerance window). No-ops if the room or player is gone.
 */
export function removePlayer(store: RoomStore, roomId: string, playerId: string): void {
  const room = store.rooms.get(roomId);
  if (!room) {
    return;
  }
  room.players = room.players.filter((p) => p.id !== playerId);
}

export interface ReplayRoomResult {
  room: Room;
  /** Maps each old player's id to their corresponding new Player. */
  playerIdMap: Map<string, Player>;
}

/**
 * Host-only "Play again" (datamodel.md Normalization Rules — End-of-game
 * controls): creates a brand-new Room (fresh id, `status: 'lobby'`, empty
 * `playAgainVotes`, and other createRoom-style defaults) and one fresh
 * Player (new id, new sessionToken) per player in `oldRoom.players`,
 * preserving `name` and carrying over `connected` as-is. The old room is
 * left untouched in the store (same non-cleanup pattern as `ended` rooms).
 */
export function replayRoom(store: RoomStore, oldRoom: Room): ReplayRoomResult {
  const roomId = generateUniqueRoomCode(store);
  const playerIdMap = new Map<string, Player>();

  const players: Player[] = oldRoom.players.map((oldPlayer) => {
    const newPlayer: Player = {
      id: randomUUID(),
      roomId,
      name: oldPlayer.name,
      connected: oldPlayer.connected,
      sessionToken: randomUUID(),
      kicked: false,
    };
    playerIdMap.set(oldPlayer.id, newPlayer);
    return newPlayer;
  });

  const newHostPlayer = playerIdMap.get(oldRoom.hostPlayerId)!;

  const room: Room = {
    id: roomId,
    hostPlayerId: newHostPlayer.id,
    players,
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
    decorationWindowStartedAt: null,
    coverSubmissions: [],
  };

  store.rooms.set(room.id, room);
  return { room, playerIdMap };
}

/**
 * Creates one empty Book per non-kicked player (datamodel.md: "One per
 * player's original prompt") when the host starts the game, or when the
 * host restarts a `nonContinuable` game (moderation plan — kicked
 * players are excluded from the regenerated `books`). Each remaining
 * player writes their own book's starting phrase as its first Entry.
 * Does not throw if every player happens to be kicked (unreachable in
 * practice, but the helper degrades to an empty array rather than
 * erroring).
 */
export function createBooksForRoom(room: Room): Book[] {
  return room.players
    .filter((player) => !player.kicked)
    .map((player) => ({
      id: randomUUID(),
      roomId: room.id,
      originAuthorId: player.id,
      entries: [],
      cover: null,
      coverTemplate: null,
    }));
}
