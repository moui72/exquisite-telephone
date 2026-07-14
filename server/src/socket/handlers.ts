import { randomUUID } from 'node:crypto';
import {
  computeNextEntries,
  computeNextEntry,
  currentRoundFor,
  type Entry,
  type Player,
  type Room,
  type TimeoutVoteChoice,
} from '@exquisite-telephone/shared';
import type { Socket } from 'socket.io';
import { createBooksForRoom, createRoom, joinRoom, type RoomStore } from '../domain/roomStore.js';
import type { SessionTokenStore } from '../domain/sessionTokenStore.js';
import { resolveTimeoutVote } from '../domain/timerSweep.js';
import type { Logger } from '../observability/logger.js';

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
  logger: Logger,
  input: CreateRoomInput,
  ack: (response: CreateRoomAck) => void,
): void {
  const room = createRoom(store, { hostName: input.hostName });
  const hostPlayer = room.players[0]!;
  hostPlayer.sessionToken = sessionStore.issue(hostPlayer.id, room.id);
  socket.data.playerId = hostPlayer.id;
  socket.data.roomId = room.id;
  socket.join(room.id);
  logger.log({
    event: 'room_created',
    outcome: 'success',
    roomId: room.id,
    playerId: hostPlayer.id,
  });
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
  logger: Logger,
  input: JoinRoomInput,
  ack: (response: JoinRoomAck) => void,
): void {
  const result = joinRoom(store, { roomId: input.roomId, playerName: input.playerName });
  if (!result.player) {
    logger.log({
      event: 'player_joined',
      outcome: 'failure',
      roomId: input.roomId,
      reason: result.error,
    });
    ack({ error: result.error });
    return;
  }
  const player = result.player;
  player.sessionToken = sessionStore.issue(player.id, input.roomId);
  socket.data.playerId = player.id;
  socket.data.roomId = input.roomId;

  socket.join(input.roomId);
  const room = store.getRoom(input.roomId);
  logger.log({
    event: 'player_joined',
    outcome: 'success',
    roomId: input.roomId,
    playerId: player.id,
  });
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room, player });
}

export interface StartGameInput {
  roomId: string;
  playerId: string;
  /**
   * One-time acknowledgment on the start-game request itself (not
   * persisted room state, datamodel.md Normalization Rules) that lets
   * the host override the minimum-player-count guard below.
   */
  acknowledgeSmallGame?: boolean;
}

export interface StartGameAck {
  room?: Room;
  error?: string;
}

/** Below this many players, starting requires an explicit host override. */
const MINIMUM_RECOMMENDED_PLAYERS = 3;

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
  if (room.players.length < MINIMUM_RECOMMENDED_PLAYERS && input.acknowledgeSmallGame !== true) {
    ack({ error: 'too-few-players' });
    return;
  }

  room.status = 'writing';
  room.books = createBooksForRoom(room);
  room.roundStartedAt = Date.now();
  room.timerExtensions = {};
  room.pendingTimeoutVote = null;
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface SetTurnTimerInput {
  roomId: string;
  playerId: string;
  turnTimerMinutes: 15 | 30 | 60 | 240 | 720 | null;
}

export interface SetTurnTimerAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only, lobby-only control for `Room.turnTimerMinutes` (ui.md Lobby
 * View timer selector). Rejected once the room has left `lobby` — the
 * timer is fixed for the duration of a game once writing/drawing starts.
 */
export function onSetTurnTimer(
  socket: Socket,
  store: RoomStore,
  input: SetTurnTimerInput,
  ack: (response: SetTurnTimerAck) => void,
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
  if (room.status !== 'lobby') {
    ack({ error: 'room-not-in-lobby' });
    return;
  }

  room.turnTimerMinutes = input.turnTimerMinutes;
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface SetMonochromeInput {
  roomId: string;
  playerId: string;
  monochromeOnly: boolean;
}

export interface SetMonochromeAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only, lobby-only toggle of Room.monochromeOnly (datamodel.md),
 * mirroring onStartGame's host-only/status guard shape.
 */
export function onSetMonochrome(
  socket: Socket,
  store: RoomStore,
  input: SetMonochromeInput,
  ack: (response: SetMonochromeAck) => void,
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
  if (room.status !== 'lobby') {
    ack({ error: 'room-not-in-lobby' });
    return;
  }

  room.monochromeOnly = input.monochromeOnly;
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
  logger: Logger,
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

  if (book.entries.length >= room.players.length) {
    ack({ error: 'book-complete' });
    return;
  }

  const next = computeNextEntry(room, book);
  if (!next) {
    ack({ error: 'round-not-open' });
    return;
  }
  if (next.authorId !== input.playerId) {
    logger.log({
      event: 'turn_advanced',
      outcome: 'failure',
      roomId: input.roomId,
      playerId: input.playerId,
      bookId: input.bookId,
      reason: 'not-your-turn',
    });
    ack({ error: 'not-your-turn' });
    return;
  }

  const roundBeforeSubmit = currentRoundFor(room);

  const entry: Entry = {
    id: randomUUID(),
    bookId: book.id,
    authorId: next.authorId,
    position: next.position,
    type: next.type,
    content: input.content,
  };
  book.entries.push(entry);

  if (currentRoundFor(room) > roundBeforeSubmit) {
    room.roundStartedAt = Date.now();
    room.timerExtensions = {};
    room.pendingTimeoutVote = null;
  }

  logger.log({
    event: 'turn_advanced',
    outcome: 'success',
    roomId: input.roomId,
    playerId: input.playerId,
    bookId: input.bookId,
    entryId: entry.id,
    position: entry.position,
  });

  if (computeNextEntries(room).length === 0) {
    room.status = 'reveal';
    logger.log({ event: 'game_completed', outcome: 'success', roomId: input.roomId });
  }

  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room, entry });
}

export interface CastTimeoutVoteInput {
  roomId: string;
  playerId: string;
  choice: TimeoutVoteChoice;
}

export interface CastTimeoutVoteAck {
  room?: Room;
  error?: string;
}

/**
 * Records one eligible voter's choice on an open `Room.pendingTimeoutVote`
 * (datamodel.md Normalization Rules — Turn timer). Once every eligible
 * voter has cast a vote, resolves it immediately rather than waiting for
 * the next background sweep (infrastructure.md Turn Timer Sweep).
 */
export function onCastTimeoutVote(
  socket: Socket,
  store: RoomStore,
  logger: Logger,
  input: CastTimeoutVoteInput,
  ack: (response: CastTimeoutVoteAck) => void,
): void {
  const room = store.getRoom(input.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }

  const vote = room.pendingTimeoutVote;
  if (!vote) {
    ack({ error: 'no-vote-pending' });
    return;
  }
  if (!vote.eligibleVoterIds.includes(input.playerId)) {
    ack({ error: 'not-eligible' });
    return;
  }

  vote.votes[input.playerId] = input.choice;
  logger.log({
    event: 'timeout_vote_cast',
    outcome: 'success',
    roomId: input.roomId,
    playerId: input.playerId,
    choice: input.choice,
  });

  const everyoneVoted = vote.eligibleVoterIds.every((voterId) => voterId in vote.votes);
  if (everyoneVoted) {
    resolveTimeoutVote(room, Date.now(), logger);
  }

  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
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
  logger: Logger,
  input: RejoinInput,
  ack: (response: RejoinAck) => void,
): void {
  const resolved = sessionStore.resolve(input.token);
  if (!resolved) {
    logger.log({ event: 'player_reconnected', outcome: 'failure', reason: 'invalid-token' });
    ack({ error: 'invalid-token' });
    return;
  }

  const room = store.getRoom(resolved.roomId);
  if (!room) {
    logger.log({
      event: 'player_reconnected',
      outcome: 'failure',
      roomId: resolved.roomId,
      playerId: resolved.playerId,
      reason: 'room-not-found',
    });
    ack({ error: 'room-not-found' });
    return;
  }
  if (room.status === 'ended') {
    logger.log({
      event: 'player_reconnected',
      outcome: 'failure',
      roomId: resolved.roomId,
      playerId: resolved.playerId,
      reason: 'game-ended',
    });
    ack({ error: 'game-ended' });
    return;
  }

  const player = room.players.find((p) => p.id === resolved.playerId);
  if (!player) {
    logger.log({
      event: 'player_reconnected',
      outcome: 'failure',
      roomId: resolved.roomId,
      playerId: resolved.playerId,
      reason: 'player-not-found',
    });
    ack({ error: 'player-not-found' });
    return;
  }

  player.connected = true;
  socket.data.playerId = player.id;
  socket.data.roomId = room.id;
  socket.join(room.id);
  logger.log({
    event: 'player_reconnected',
    outcome: 'success',
    roomId: room.id,
    playerId: player.id,
  });
  socket.to(room.id).emit('roomUpdated', { room });
  ack({ room, player });
}

/**
 * A dropped connection keeps its seat (marked disconnected, not
 * removed) for the session-token TTL, so `onRejoin` can restore it.
 */
export function onDisconnect(socket: Socket, store: RoomStore, logger: Logger): void {
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
  logger.log({ event: 'player_left', outcome: 'success', roomId, playerId });
  socket.to(roomId).emit('roomUpdated', { room });
}
