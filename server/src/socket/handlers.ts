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
  error?: string;
}

export function onCreateRoom(
  socket: Socket,
  store: RoomStore,
  input: CreateRoomInput,
  ack: (response: CreateRoomAck) => void,
): void {
  const room = createRoom(store, { hostName: input.hostName });
  socket.join(room.id);
  ack({ room });
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
