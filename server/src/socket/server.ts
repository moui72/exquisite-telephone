import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { RoomStore } from '../domain/roomStore.js';
import { createSessionTokenStore, type SessionTokenStore } from '../domain/sessionTokenStore.js';
import { createLogger, type Logger } from '../observability/logger.js';
import {
  onCastTimeoutVote,
  onCreateRoom,
  onDisconnect,
  onEndGame,
  onJoinRoom,
  onRejoin,
  onPlayAgain,
  onSetMonochrome,
  onSetTurnTimer,
  onStartGame,
  onSubmitEntry,
  onVoteToPlayAgain,
  type CastTimeoutVoteAck,
  type CastTimeoutVoteInput,
  type CreateRoomAck,
  type CreateRoomInput,
  type EndGameAck,
  type EndGameInput,
  type JoinRoomAck,
  type JoinRoomInput,
  type PlayAgainAck,
  type PlayAgainInput,
  type RejoinAck,
  type RejoinInput,
  type SetMonochromeAck,
  type SetMonochromeInput,
  type SetTurnTimerAck,
  type SetTurnTimerInput,
  type StartGameAck,
  type StartGameInput,
  type SubmitEntryAck,
  type SubmitEntryInput,
  type VoteToPlayAgainAck,
  type VoteToPlayAgainInput,
} from './handlers.js';

/**
 * Binds a Socket.IO server to the given HTTP server, room store, and
 * session-token store. Room management and reconnection are left to
 * Socket.IO's own room/connection primitives (constitution Principle V)
 * rather than hand-rolled — each Room maps to a Socket.IO room
 * (infrastructure.md).
 */
export function createSocketServer(
  httpServer: HttpServer,
  store: RoomStore,
  sessionStore: SessionTokenStore = createSessionTokenStore(),
  logger: Logger = createLogger(),
): SocketIOServer {
  const io = new SocketIOServer(httpServer);

  io.on('connection', (socket) => {
    socket.on('createRoom', (input: CreateRoomInput, ack: (response: CreateRoomAck) => void) => {
      onCreateRoom(socket, store, sessionStore, logger, input, ack);
    });

    socket.on('joinRoom', (input: JoinRoomInput, ack: (response: JoinRoomAck) => void) => {
      onJoinRoom(socket, store, sessionStore, logger, input, ack);
    });

    socket.on('startGame', (input: StartGameInput, ack: (response: StartGameAck) => void) => {
      onStartGame(socket, store, input, ack);
    });

    socket.on('endGame', (input: EndGameInput, ack: (response: EndGameAck) => void) => {
      onEndGame(socket, store, logger, input, ack);
    });

    socket.on(
      'set_monochrome',
      (input: SetMonochromeInput, ack: (response: SetMonochromeAck) => void) => {
        onSetMonochrome(socket, store, input, ack);
      },
    );

    socket.on(
      'setTurnTimer',
      (input: SetTurnTimerInput, ack: (response: SetTurnTimerAck) => void) => {
        onSetTurnTimer(socket, store, input, ack);
      },
    );

    socket.on('submitEntry', (input: SubmitEntryInput, ack: (response: SubmitEntryAck) => void) => {
      onSubmitEntry(socket, store, logger, input, ack);
    });

    socket.on(
      'castTimeoutVote',
      (input: CastTimeoutVoteInput, ack: (response: CastTimeoutVoteAck) => void) => {
        onCastTimeoutVote(socket, store, logger, input, ack);
      },
    );

    socket.on('rejoin', (input: RejoinInput, ack: (response: RejoinAck) => void) => {
      onRejoin(socket, store, sessionStore, logger, input, ack);
    });

    socket.on(
      'voteToPlayAgain',
      (input: VoteToPlayAgainInput, ack: (response: VoteToPlayAgainAck) => void) => {
        onVoteToPlayAgain(socket, store, input, ack);
      },
    );

    socket.on('playAgain', (input: PlayAgainInput, ack: (response: PlayAgainAck) => void) => {
      onPlayAgain(socket, store, sessionStore, logger, io, input, ack);
    });

    socket.on('disconnect', () => {
      onDisconnect(socket, store, logger);
    });
  });

  return io;
}
