import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { RoomStore } from '../domain/roomStore.js';
import {
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onSubmitEntry,
  type CreateRoomAck,
  type CreateRoomInput,
  type JoinRoomAck,
  type JoinRoomInput,
  type StartGameAck,
  type StartGameInput,
  type SubmitEntryAck,
  type SubmitEntryInput,
} from './handlers.js';

/**
 * Binds a Socket.IO server to the given HTTP server and room store.
 * Room management and reconnection are left to Socket.IO's own
 * room/connection primitives (constitution Principle V) rather than
 * hand-rolled — each Room maps to a Socket.IO room (infrastructure.md).
 */
export function createSocketServer(httpServer: HttpServer, store: RoomStore): SocketIOServer {
  const io = new SocketIOServer(httpServer);

  io.on('connection', (socket) => {
    socket.on('createRoom', (input: CreateRoomInput, ack: (response: CreateRoomAck) => void) => {
      onCreateRoom(socket, store, input, ack);
    });

    socket.on('joinRoom', (input: JoinRoomInput, ack: (response: JoinRoomAck) => void) => {
      onJoinRoom(socket, store, input, ack);
    });

    socket.on('startGame', (input: StartGameInput, ack: (response: StartGameAck) => void) => {
      onStartGame(socket, store, input, ack);
    });

    socket.on('submitEntry', (input: SubmitEntryInput, ack: (response: SubmitEntryAck) => void) => {
      onSubmitEntry(socket, store, input, ack);
    });
  });

  return io;
}
