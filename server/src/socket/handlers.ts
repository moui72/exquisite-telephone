import { randomUUID } from 'node:crypto';
import {
  activePlayers,
  computeNextEntries,
  computeNextEntry,
  CURATED_PHRASE_BANK,
  currentRoundFor,
  dealPrompts,
  defaultLapsPerBook,
  exceedsEntryContentLimit,
  isBookComplete,
  isCoverTemplateId,
  serializeDrawOps,
  type DrawOps,
  type Entry,
  type Player,
  type Room,
  type SubmitEntryPayload,
  type TimeoutVoteChoice,
} from '@exquisite-telephone/shared';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  createBooksForRoom,
  createRoom,
  joinRoom,
  replayRoom,
  type RoomStore,
} from '../domain/roomStore.js';
import type { CurationStore } from '../domain/curationStore.js';
import { transitionToReveal } from '../domain/decorationWindow.js';
import { isBankPhrase } from '../domain/promptOrigin.js';
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
  // Kicked players don't count toward the minimum-player floor or the
  // laps-per-book live default — both are measured against the active
  // roster (datamodel.md Normalization Rules). createBooksForRoom and the
  // curated deal already filter kicked players independently.
  const active = activePlayers(room).length;
  if (active < MINIMUM_RECOMMENDED_PLAYERS && input.acknowledgeSmallGame !== true) {
    ack({ error: 'too-few-players' });
    return;
  }

  room.status = 'writing';
  room.lapsPerBook = room.lapsPerBook ?? defaultLapsPerBook(active);
  room.books = createBooksForRoom(room);
  dealCuratedPrompts(room);
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

export interface SetLapsPerBookInput {
  roomId: string;
  playerId: string;
  lapsPerBook: 1 | 2 | 3;
}

export interface SetLapsPerBookAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only, lobby-only control for `Room.lapsPerBook` (ui.md Lobby View
 * laps control), mirroring onSetTurnTimer's exact guard shape. Only
 * `1 | 2 | 3` are accepted; anything else is rejected with
 * `invalid-laps-per-book`.
 */
export function onSetLapsPerBook(
  socket: Socket,
  store: RoomStore,
  input: SetLapsPerBookInput,
  ack: (response: SetLapsPerBookAck) => void,
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
  if (input.lapsPerBook !== 1 && input.lapsPerBook !== 2 && input.lapsPerBook !== 3) {
    ack({ error: 'invalid-laps-per-book' });
    return;
  }

  room.lapsPerBook = input.lapsPerBook;
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
 * Host-only transition to `ended`, reachable from any `Room.status`
 * (host-game-moderation-controls plan — relaxed from the earlier
 * reveal-only guard so a disruptive/offensive-content situation can be
 * shut down without waiting for Reveal). The room is kept in the store
 * (not deleted) so a still-valid session token can be told clearly "this
 * game has ended" (see onRejoin) rather than "room not found".
 */
export function onEndGame(
  socket: Socket,
  store: RoomStore,
  logger: Logger,
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
  logger.log({
    event: 'game_completed',
    outcome: 'success',
    roomId: input.roomId,
    reason: 'host-ended',
  });
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface KickPlayerInput {
  roomId: string;
  playerId: string;
  targetPlayerId: string;
}

export interface KickPlayerAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only "kick player" (host-game-moderation-controls plan): sets the
 * target `Player.kicked = true`. A kick during `writing` also sets
 * `Room.nonContinuable = true` — the round-robin turn engine is not
 * taught to skip a kicked player's now-orphaned turn in place (see the
 * plan's Technical Approach), so the room is frozen until the host runs
 * `onRestartGame`. Kicking during `lobby` or `reveal` leaves
 * `nonContinuable` untouched. Idempotent — kicking an already-kicked
 * player is a harmless no-op re-assertion.
 */
export function onKickPlayer(
  socket: Socket,
  store: RoomStore,
  logger: Logger,
  input: KickPlayerInput,
  ack: (response: KickPlayerAck) => void,
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
  const target = room.players.find((p) => p.id === input.targetPlayerId);
  if (!target) {
    ack({ error: 'player-not-found' });
    return;
  }

  target.kicked = true;
  if (room.status === 'writing') {
    room.nonContinuable = true;
  }

  logger.log({
    event: 'player_kicked',
    outcome: 'success',
    roomId: input.roomId,
    kickedPlayerId: target.id,
    hostPlayerId: input.playerId,
  });
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface RestartGameInput {
  roomId: string;
  playerId: string;
}

export interface RestartGameAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only "restart game" (host-game-moderation-controls plan): only
 * meaningful once `Room.nonContinuable` is `true` (set by a kick during
 * `writing`). Regenerates `books` fresh — one per non-kicked player, via
 * `createBooksForRoom`'s kicked-excluding filter — reusing the same
 * `Room.id` and every remaining `Player`'s existing `id`/`sessionToken`
 * (distinct from `replayRoom` / "Play again", which mints a brand-new
 * room and new players). Clears round state and resumes `writing`.
 */
export function onRestartGame(
  socket: Socket,
  store: RoomStore,
  logger: Logger,
  input: RestartGameInput,
  ack: (response: RestartGameAck) => void,
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
  if (!room.nonContinuable) {
    ack({ error: 'nothing-to-restart' });
    return;
  }

  room.books = createBooksForRoom(room);
  dealCuratedPrompts(room);
  room.timerExtensions = {};
  room.pendingTimeoutVote = null;
  room.status = 'writing';
  room.roundStartedAt = Date.now();
  room.nonContinuable = false;

  logger.log({
    event: 'game_restarted',
    outcome: 'success',
    roomId: input.roomId,
    hostPlayerId: input.playerId,
  });
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface VoteToPlayAgainInput {
  roomId: string;
  playerId: string;
}

export interface VoteToPlayAgainAck {
  room?: Room;
  error?: string;
}

/**
 * Host-agnostic — no host-only guard, since the "vote to play again"
 * button is simply never shown to the host client-side, and a stray
 * server-side vote from anyone is harmless (datamodel.md Normalization
 * Rules — End-of-game controls). Deduplicated: voting twice does not
 * create a duplicate entry in Room.playAgainVotes.
 */
export function onVoteToPlayAgain(
  socket: Socket,
  store: RoomStore,
  input: VoteToPlayAgainInput,
  ack: (response: VoteToPlayAgainAck) => void,
): void {
  const room = store.getRoom(input.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }
  if (room.status !== 'reveal') {
    ack({ error: 'room-not-in-reveal' });
    return;
  }

  if (!room.playAgainVotes.includes(input.playerId)) {
    room.playAgainVotes.push(input.playerId);
  }

  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface PlayAgainInput {
  roomId: string;
  playerId: string;
}

export interface PlayAgainAck {
  room?: Room;
  player?: Player;
  error?: string;
}

/**
 * Host-only, reveal-only "play again" (datamodel.md Normalization Rules —
 * End-of-game controls). Creates a brand-new room via `replayRoom`, then
 * moves every currently-connected old-room socket into the new room and
 * pushes each its own `{ room, player }` pair via `roomChanged` — a
 * per-socket unicast, not a room-wide broadcast, since every recipient's
 * new `Player` differs (infrastructure.md's one exception to the
 * broadcast-one-shared-payload pattern). Single-process scale
 * (Principle I) means no need for Socket.IO's cross-process
 * `fetchSockets()` adapter API: connected socket ids are resolved
 * locally via `io.sockets.adapter.rooms` / `io.sockets.sockets`. The
 * initiating host's own socket goes through the same loop (no
 * special-casing) and also receives the `ack` response.
 */
export function onPlayAgain(
  socket: Socket,
  store: RoomStore,
  sessionStore: SessionTokenStore,
  logger: Logger,
  io: SocketIOServer,
  input: PlayAgainInput,
  ack: (response: PlayAgainAck) => void,
): void {
  const oldRoom = store.getRoom(input.roomId);
  if (!oldRoom) {
    ack({ error: 'room-not-found' });
    return;
  }
  if (oldRoom.hostPlayerId !== input.playerId) {
    ack({ error: 'not-host' });
    return;
  }
  if (oldRoom.status !== 'reveal') {
    ack({ error: 'room-not-in-reveal' });
    return;
  }

  const { room: newRoom, playerIdMap } = replayRoom(store, oldRoom);
  const newHostPlayer = playerIdMap.get(oldRoom.hostPlayerId)!;

  logger.log({
    event: 'room_created',
    outcome: 'success',
    roomId: newRoom.id,
    playerId: newHostPlayer.id,
    reason: 'play-again',
    previousRoomId: oldRoom.id,
  });

  const oldRoomSocketIds = io.sockets.adapter.rooms.get(oldRoom.id);
  if (oldRoomSocketIds) {
    for (const socketId of oldRoomSocketIds) {
      const memberSocket = io.sockets.sockets.get(socketId);
      if (!memberSocket) {
        continue;
      }
      const { playerId: oldPlayerId } = memberSocket.data as { playerId?: string };
      if (!oldPlayerId) {
        continue;
      }
      const newPlayer = playerIdMap.get(oldPlayerId);
      if (!newPlayer) {
        continue;
      }

      memberSocket.leave(oldRoom.id);
      memberSocket.join(newRoom.id);
      memberSocket.data.playerId = newPlayer.id;
      memberSocket.data.roomId = newRoom.id;
      newPlayer.sessionToken = sessionStore.issue(newPlayer.id, newRoom.id);
      memberSocket.emit('roomChanged', { room: newRoom, player: newPlayer });
    }
  }

  ack({ room: newRoom, player: newHostPlayer });
}

/**
 * Re-exported from `shared` so the wire payload has exactly one
 * definition (constitution Principle VII) rather than the server and
 * client each retyping it.
 */
export type SubmitEntryInput = SubmitEntryPayload;

export interface SubmitEntryAck {
  room?: Room;
  entry?: Entry;
  error?: string;
}

/**
 * Wire payload for `onSubmitCover` (infrastructure.md): a player finalizes
 * their OWN book's cover during `decorating`. `cover` is the parsed draw-op
 * array (same shape as an `Entry` drawing, bounded by the same drawing
 * cap); `coverTemplate` is one of the nine `CoverTemplateId`s or `null`
 * (blank).
 */
export interface SubmitCoverInput {
  roomId: string;
  playerId: string;
  bookId: string;
  cover: DrawOps;
  coverTemplate: string | null;
}

export interface SubmitCoverAck {
  room?: Room;
  error?: string;
}

/**
 * Finalizes a player's OWN book cover during `status === 'decorating'`
 * (infrastructure.md; datamodel.md Normalization Rules — Cover decoration).
 * Own-book-only (the server checks `Book.originAuthorId`, never trusting a
 * client claim), the cover payload is bounded by the SAME drawing cap as an
 * entry drawing (measured on the serialized ops, ahead of room state), the
 * player is appended deduped to `Room.coverSubmissions`, and — when every
 * active player has finalized — the window closes synchronously to `reveal`
 * via the shared `transitionToReveal` (the sweep is only the expiry
 * backstop).
 */
export function onSubmitCover(
  socket: Socket,
  store: RoomStore,
  logger: Logger,
  input: SubmitCoverInput,
  ack: (response: SubmitCoverAck) => void,
): void {
  const room = store.getRoom(input.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }
  if (room.status !== 'decorating') {
    ack({ error: 'not-decorating' });
    return;
  }
  const book = room.books.find((b) => b.id === input.bookId);
  if (!book) {
    ack({ error: 'book-not-found' });
    return;
  }
  // Own-book-only: "your book" is the one you started (originAuthorId).
  if (book.originAuthorId !== input.playerId) {
    ack({ error: 'not-your-book' });
    return;
  }
  // Bound the cover payload BEFORE it touches room state, keyed on the
  // drawing cap and measured on the serialized ops — exactly as
  // onSubmitEntry bounds a drawing. Oversize is rejected, never truncated.
  if (exceedsEntryContentLimit(serializeDrawOps(input.cover), 'drawing')) {
    logger.log({
      event: 'cover_submitted',
      outcome: 'failure',
      roomId: input.roomId,
      playerId: input.playerId,
      bookId: input.bookId,
      reason: 'cover-too-large',
    });
    ack({ error: 'cover-too-large' });
    return;
  }
  // A template must be one of the nine known ids or `null` (blank) — the
  // client's claim is validated, not trusted.
  if (input.coverTemplate !== null && !isCoverTemplateId(input.coverTemplate)) {
    ack({ error: 'invalid-cover-template' });
    return;
  }

  book.cover = input.cover;
  book.coverTemplate = input.coverTemplate;

  const submissions = room.coverSubmissions ?? (room.coverSubmissions = []);
  if (!submissions.includes(input.playerId)) {
    submissions.push(input.playerId);
  }

  logger.log({
    event: 'cover_submitted',
    outcome: 'success',
    roomId: input.roomId,
    playerId: input.playerId,
    bookId: input.bookId,
  });

  // Early close: once every active (non-kicked) player has finalized, close
  // the window synchronously rather than waiting for the sweep's expiry.
  const activeIds = activePlayers(room).map((p) => p.id);
  if (activeIds.every((id) => submissions.includes(id))) {
    transitionToReveal(room, logger);
  }

  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
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
  curationStore?: CurationStore,
): void {
  const room = store.getRoom(input.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }

  if (room.nonContinuable) {
    ack({ error: 'room-non-continuable' });
    return;
  }

  const book = room.books.find((b) => b.id === input.bookId);
  if (!book) {
    ack({ error: 'book-not-found' });
    return;
  }

  if (isBookComplete(room, book)) {
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

  // Bound `Entry.content` BEFORE anything else touches it (datamodel.md
  // Normalization Rules -- Entry.content has a maximum length). This sits
  // ahead of the curated-prompt comparison, ahead of the room store, and
  // ahead of the curation store, so oversize content never reaches
  // in-memory game state OR durable storage -- and so a multi-megabyte
  // string is never string-compared against a dealt hand.
  //
  // The limit is keyed on `next.type`, computed server-side from turn
  // order, never on any claim from the client. Oversize is REJECTED, never
  // truncated: telling a player their turn succeeded while silently
  // discarding half their drawing is the worse failure.
  if (exceedsEntryContentLimit(input.content, next.type)) {
    logger.log({
      event: 'turn_advanced',
      outcome: 'failure',
      roomId: input.roomId,
      playerId: input.playerId,
      bookId: input.bookId,
      reason: 'entry-too-large',
    });
    ack({ error: 'entry-too-large' });
    return;
  }

  // Curated opening turns (datamodel.md Normalization Rules -- Curated
  // prompts). Applies to `position === 0` only: every later text entry is a
  // blind guess written from the drawing above it, so there is nothing to
  // curate there. The mode is read from room state -- the client's claim
  // about which mode is active is never trusted.
  if (next.position === 0 && room.promptMode === 'curated') {
    const myHand = room.dealtPrompts[input.playerId] ?? [];
    const isDealtToMe = myHand.includes(input.content);
    const isPermittedWriteIn = room.allowPromptWriteIn && input.content.trim().length > 0;
    if (!isDealtToMe && !isPermittedWriteIn) {
      ack({ error: 'prompt-not-dealt' });
      return;
    }
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

  // Prompt rating (datamodel.md Normalization Rules -- Prompt rating).
  // Acted on ONLY at position 1: that is the single drawing turn whose
  // source is a book's opening phrase, and its drawer is the one player
  // who had to work with that phrase. A rating sent at any other position
  // is ignored entirely -- position 0 IS the prompt, and positions 2+
  // describe a drawing, not a prompt.
  //
  // Note the phrase rated is the book's POSITION-0 content -- the phrase
  // that was drawn -- never `input.content`, which at position 1 is
  // serialized stroke data.
  //
  // Deliberately last, after the entry is committed and never before any
  // guard: a rating must never gate or fail a submission.
  if (curationStore && input.rating && entry.position === 1) {
    const openingPhrase = book.entries.find((e) => e.position === 0)?.content;
    if (openingPhrase !== undefined) {
      curationStore.recordRating(openingPhrase, input.rating, isBankPhrase(openingPhrase));
    }
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
    // The game is over, but Reveal is gated behind the cover-decoration
    // window (datamodel.md Normalization Rules — Cover decoration): enter
    // `decorating` and stamp the window start rather than going straight to
    // `reveal`. The `game_completed` log moves to `transitionToReveal`,
    // emitted when the window closes (all-submitted early close in
    // `onSubmitCover`, or the sweep's expiry backstop).
    room.status = 'decorating';
    room.decorationWindowStartedAt = Date.now();
    room.coverSubmissions = [];
    logger.log({ event: 'decoration_window_opened', outcome: 'success', roomId: input.roomId });
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
  // Clear any open reveal-modal entry so the "being read by" badge does
  // not leak for a departed reader (datamodel.md). A disconnect is NOT a
  // chosen close, so it deliberately does NOT credit a completed read to
  // `bookReads` — the player resumes their book on reconnect.
  delete room.currentlyReading[playerId];
  logger.log({ event: 'player_left', outcome: 'success', roomId, playerId });
  socket.to(roomId).emit('roomUpdated', { room });
}

export interface SetReadingBookInput {
  roomId: string;
  playerId: string;
  /** Book.id being opened, or `null` when the reader closes their modal. */
  bookId: string | null;
}

export interface SetReadingBookAck {
  room?: Room;
  error?: string;
}

/**
 * Records a reader's reveal-page modal state (datamodel.md — completed
 * reads / last-write-wins sync). One last-write-wins event covers both
 * open and close, deliberately not paired open/close events with their
 * own idempotency story — same reasoning as the no-`onRatePrompt`
 * decision (infrastructure.md): a single event has no ordering hazard and
 * no double-tap to reconcile.
 *
 * - A non-null `bookId` opens (or switches to) that book: it credits the
 *   reader's *prior* open book, if any and different, as a completed read
 *   (deduped append to `bookReads`), then sets `currentlyReading`.
 * - A `null` `bookId` closes: it credits the reader's prior open book and
 *   clears `currentlyReading`.
 *
 * Guards: `room-not-found`, non-`reveal` status, and an unknown non-null
 * `bookId`.
 */
export function onSetReadingBook(
  socket: Socket,
  store: RoomStore,
  logger: Logger,
  input: SetReadingBookInput,
  ack: (response: SetReadingBookAck) => void,
): void {
  const room = store.getRoom(input.roomId);
  if (!room) {
    ack({ error: 'room-not-found' });
    return;
  }
  if (room.status !== 'reveal') {
    ack({ error: 'room-not-in-reveal' });
    return;
  }
  if (input.bookId !== null && !room.books.some((b) => b.id === input.bookId)) {
    ack({ error: 'book-not-found' });
    return;
  }

  // Credit the reader's PRIOR open book as a completed read whenever they
  // leave it — a close (null) or a switch to a different book. Deduped so
  // a re-read never double-counts the same player.
  const prevBookId = room.currentlyReading[input.playerId];
  if (prevBookId !== undefined && prevBookId !== input.bookId) {
    const readers = room.bookReads[prevBookId] ?? [];
    if (!readers.includes(input.playerId)) {
      room.bookReads[prevBookId] = [...readers, input.playerId];
    }
  }

  if (input.bookId === null) {
    delete room.currentlyReading[input.playerId];
  } else {
    room.currentlyReading[input.playerId] = input.bookId;
  }

  logger.log({
    event: 'book_read_state',
    outcome: 'success',
    roomId: input.roomId,
    playerId: input.playerId,
    bookId: input.bookId,
  });
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface SetPromptModeInput {
  roomId: string;
  playerId: string;
  promptMode: 'free-form' | 'curated';
}

export interface SetPromptModeAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only, lobby-only control for `Room.promptMode` (ui.md Lobby View
 * prompt-mode control), mirroring onSetLapsPerBook's exact guard shape.
 * Kept a separate named handler from the two dependent curated settings
 * per Principle VIII.
 */
export function onSetPromptMode(
  socket: Socket,
  store: RoomStore,
  input: SetPromptModeInput,
  ack: (response: SetPromptModeAck) => void,
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
  if (input.promptMode !== 'free-form' && input.promptMode !== 'curated') {
    ack({ error: 'invalid-prompt-mode' });
    return;
  }

  room.promptMode = input.promptMode;
  // datamodel.md Room: `curatedPromptCount` is null while the mode is
  // free-form, so switching back clears a count the host chose earlier
  // rather than leaving a stale value on the room.
  if (input.promptMode === 'free-form') {
    room.curatedPromptCount = null;
  }
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface SetCuratedPromptCountInput {
  roomId: string;
  playerId: string;
  curatedPromptCount: 2 | 3 | 4 | 5;
}

export interface SetCuratedPromptCountAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only, lobby-only control for `Room.curatedPromptCount` (ui.md Lobby
 * View). Only `2 | 3 | 4 | 5` are accepted; anything else is rejected with
 * `invalid-curated-prompt-count`. The value is a *request* — the deal clamps
 * it to what the bank can cover (datamodel.md Normalization Rules).
 */
export function onSetCuratedPromptCount(
  socket: Socket,
  store: RoomStore,
  input: SetCuratedPromptCountInput,
  ack: (response: SetCuratedPromptCountAck) => void,
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
  if (![2, 3, 4, 5].includes(input.curatedPromptCount)) {
    ack({ error: 'invalid-curated-prompt-count' });
    return;
  }

  room.curatedPromptCount = input.curatedPromptCount;
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

export interface SetAllowPromptWriteInInput {
  roomId: string;
  playerId: string;
  allowPromptWriteIn: boolean;
}

export interface SetAllowPromptWriteInAck {
  room?: Room;
  error?: string;
}

/**
 * Host-only, lobby-only control for `Room.allowPromptWriteIn` (ui.md Lobby
 * View), mirroring onSetMonochrome's boolean-toggle shape.
 */
export function onSetAllowPromptWriteIn(
  socket: Socket,
  store: RoomStore,
  input: SetAllowPromptWriteInInput,
  ack: (response: SetAllowPromptWriteInAck) => void,
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

  room.allowPromptWriteIn = input.allowPromptWriteIn;
  socket.to(input.roomId).emit('roomUpdated', { room });
  ack({ room });
}

/**
 * Populate `Room.dealtPrompts` for the room's non-kicked players, or clear it
 * in free-form mode (datamodel.md Normalization Rules — Curated prompts).
 * Called from both game-start paths; *Restart game* re-deals a fresh hand
 * alongside the regenerated books.
 */
function dealCuratedPrompts(room: Room): void {
  if (room.promptMode !== 'curated') {
    room.dealtPrompts = {};
    return;
  }
  const playerIds = room.players.filter((player) => !player.kicked).map((player) => player.id);
  // PRODUCTION ANNOTATION: ui.md documents the count selector's options
  // (2/3/4/5) but not a default for `Room.curatedPromptCount` when the host
  // switches to curated without touching the selector. The Lobby sets 3
  // explicitly on that switch, so this fallback should be unreachable; it
  // exists so a null can never reach `dealPrompts`. If the artifact later
  // names a default, replace this constant with it.
  const DEFAULT_CURATED_PROMPT_COUNT = 3;
  room.dealtPrompts = dealPrompts(
    CURATED_PHRASE_BANK,
    playerIds,
    room.curatedPromptCount ?? DEFAULT_CURATED_PROMPT_COUNT,
  );
}
