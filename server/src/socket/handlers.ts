import type { Player, Room } from '@exquisite-telephone/shared';
import type { Socket } from 'socket.io';
import { createRoom, joinRoom, type RoomStore } from '../domain/roomStore.js';

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
  input: CreateRoomInput,
  ack: (response: CreateRoomAck) => void,
): void {
  const room = createRoom(store, { hostName: input.hostName });
  const hostPlayer = room.players[0];
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
  input: JoinRoomInput,
  ack: (response: JoinRoomAck) => void,
): void {
  const player = joinRoom(store, { roomId: input.roomId, playerName: input.playerName });
  if (!player) {
    ack({ error: 'room-not-found' });
    return;
  }

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
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}
