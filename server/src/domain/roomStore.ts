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
    roundStartedAt: null,
    timerExtensions: {},
    pendingTimeoutVote: null,
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

/**
 * Creates one empty Book per player (datamodel.md: "One per player's
 * original prompt") when the host starts the game. Each player writes
 * their own book's starting phrase as its first Entry.
 */
export function createBooksForRoom(room: Room): Book[] {
  return room.players.map((player) => ({
    id: randomUUID(),
    roomId: room.id,
    originAuthorId: player.id,
    entries: [],
  }));
}
