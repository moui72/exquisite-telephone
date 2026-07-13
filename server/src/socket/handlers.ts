import { randomUUID } from 'node:crypto';
import {
  computeNextEntries,
  computeNextEntry,
  type Entry,
  type Player,
  type Room,
} from '@exquisite-telephone/shared';
import type { Socket } from 'socket.io';
import { createBooksForRoom, createRoom, joinRoom, type RoomStore } from '../domain/roomStore.js';
import type { SessionTokenStore } from '../domain/sessionTokenStore.js';

/**
 * Dispatch surface decomposed by concern (constitution Principle VIII):
 * one named handler function per Socket.IO event type, each
 * independently readable and testable.
 */

export interface CreateRoomInput {
  hostName: string;
}

export interface CreateRoomAck {
  room?: Room;
  player?: Player;
  error?: string;
}

export function onCreateRoom(
  socket: Socket,
  store: RoomStore,
  sessionStore: SessionTokenStore,
  input: CreateRoomInput,
  ack: (response: CreateRoomAck) => void,
): void {
  const room = createRoom(store, { hostName: input.hostName });
  const hostPlayer = room.players[0]!;
  hostPlayer.sessionToken = sessionStore.issue(hostPlayer.id, room.id);
  socket.data.playerId = hostPlayer.id;
  socket.data.roomId = room.id;
  socket.join(room.id);
  ack({ room, player: hostPlayer });
}

export interface JoinRoomInput {
  roomId: string;
  playerName: string;
}

export interface JoinRoomAck {
  room?: Room;
  player?: Player;
  error?: string;
}

export function onJoinRoom(
  socket: Socket,
  store: RoomStore,
  sessionStore: SessionTokenStore,
  input: JoinRoomInput,
  ack: (response: JoinRoomAck) => void,
): void {
  const player = joinRoom(store, { roomId: input.roomId, playerName: input.playerName });
  if (!player) {
    ack({ error: 'room-not-found' });
    return;
  }
  player.sessionToken = sessionStore.issue(player.id, input.roomId);
  socket.data.playerId = player.id;
  socket.data.roomId = input.roomId;

  socket.join(input.roomId);
  const room = store.getRoom(input.roomId);
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room, player });
}

export interface StartGameInput {
  roomId: string;
  playerId: string;
}

export interface StartGameAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only transition out of the lobby. Turn/entry assignment for the
 * writing phase is computed separately (see the turn-advancement logic).
 */
export function onStartGame(
  socket: Socket,
  store: RoomStore,
  input: StartGameInput,
  ack: (response: StartGameAck) => void,
): void {
  const room = store.getRoom(input.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }
  if (room.hostPlayerId !== input.playerId) {
    ack({ error: 'not-host' });
    return;
  }

  room.status = 'writing';
  room.books = createBooksForRoom(room);
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface EndGameInput {
  roomId: string;
  playerId: string;
}

export interface EndGameAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only transition to `ended`. The room is kept in the store (not
 * deleted) so a still-valid session token can be told clearly "this game
 * has ended" (see onRejoin) rather than "room not found".
 */
export function onEndGame(
  socket: Socket,
  store: RoomStore,
  input: EndGameInput,
  ack: (response: EndGameAck) => void,
): void {
  const room = store.getRoom(input.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }
  if (room.hostPlayerId !== input.playerId) {
    ack({ error: 'not-host' });
    return;
  }

  room.status = 'ended';
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface SubmitEntryInput {
  roomId: string;
  playerId: string;
  bookId: string;
  /** Text phrase, or serialized drawing-stroke data — see datamodel.md Entry. */
  content: string;
}

export interface SubmitEntryAck {
  room?: Room;
  entry?: Entry;
  error?: string;
}

/**
 * Accepts a player's text or drawing-stroke submission for their current
 * turn. `Entry.position` and `type` are computed server-side from the
 * round-robin turn order (datamodel Normalization Rules), not trusted
 * from the client — the caller only supplies which book and what
 * content.
 */
export function onSubmitEntry(
  socket: Socket,
  store: RoomStore,
  input: SubmitEntryInput,
  ack: (response: SubmitEntryAck) => void,
): void {
  const room = store.getRoom(input.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }

  const book = room.books.find((b) => b.id === input.bookId);
  if (!book) {
    ack({ error: 'book-not-found' });
    return;
  }

  const next = computeNextEntry(room, book);
  if (!next) {
    ack({ error: 'book-complete' });
    return;
  }
  if (next.authorId !== input.playerId) {
    ack({ error: 'not-your-turn' });
    return;
  }

  const entry: Entry = {
    id: randomUUID(),
    bookId: book.id,
    authorId: next.authorId,
    position: next.position,
    type: next.type,
    content: input.content,
  };
  book.entries.push(entry);

  if (computeNextEntries(room).length === 0) {
    room.status = 'reveal';
  }

  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room, entry });
}

export interface RejoinInput {
  token: string;
}

export interface RejoinAck {
  room?: Room;
  player?: Player;
  error?: string;
}

/**
 * Resumes a dropped connection's same seat via its session token
 * (infrastructure.md Session Store), rather than treating every
 * reconnect as a brand-new join. An unknown/expired token or a room that
 * no longer exists is reported as a distinct error, not silently turned
 * into a fresh join.
 */
export function onRejoin(
  socket: Socket,
  store: RoomStore,
  sessionStore: SessionTokenStore,
  input: RejoinInput,
  ack: (response: RejoinAck) => void,
): void {
  const resolved = sessionStore.resolve(input.token);
  if (!resolved) {
    ack({ error: 'invalid-token' });
    return;
  }

  const room = store.getRoom(resolved.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }
  if (room.status === 'ended') {
    ack({ error: 'game-ended' });
    return;
  }

  const player = room.players.find((p) => p.id === resolved.playerId);
  if (!player) {
    ack({ error: 'player-not-found' });
    return;
  }

  player.connected = true;
  socket.data.playerId = player.id;
  socket.data.roomId = room.id;
  socket.join(room.id);
  socket.to(room.id).emit('roomUpdated', { room });
  ack({ room, player });
}

/**
 * A dropped connection keeps its seat (marked disconnected, not
 * removed) for the session-token TTL, so `onRejoin` can restore it.
 */
export function onDisconnect(socket: Socket, store: RoomStore): void {
  const { playerId, roomId } = socket.data as { playerId?: string; roomId?: string };
  if (!playerId || !roomId) {
    return;
  }
  const room = store.getRoom(roomId);
  if (!room) {
    return;
  }
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return;
  }
  player.connected = false;
  socket.to(roomId).emit('roomUpdated', { room });
}
