import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { CurationStore } from '../domain/curationStore.js';
import type { RoomStore } from '../domain/roomStore.js';
import { createSessionTokenStore, type SessionTokenStore } from '../domain/sessionTokenStore.js';
import { createLogger, type Logger } from '../observability/logger.js';
import {
  onCastTimeoutVote,
  onCreateRoom,
  onDisconnect,
  onEndGame,
  onJoinRoom,
  onKickPlayer,
  onRejoin,
  onPlayAgain,
  onRestartGame,
  onSetAllowPromptWriteIn,
  onSetCuratedPromptCount,
  onSetLapsPerBook,
  onSetMonochrome,
  onSetPromptMode,
  onSetReadingBook,
  onSetTurnTimer,
  onStartGame,
  onSubmitCover,
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
  type KickPlayerAck,
  type KickPlayerInput,
  type PlayAgainAck,
  type PlayAgainInput,
  type RejoinAck,
  type RejoinInput,
  type RestartGameAck,
  type RestartGameInput,
  type SetAllowPromptWriteInAck,
  type SetAllowPromptWriteInInput,
  type SetCuratedPromptCountAck,
  type SetCuratedPromptCountInput,
  type SetLapsPerBookAck,
  type SetLapsPerBookInput,
  type SetMonochromeAck,
  type SetMonochromeInput,
  type SetPromptModeAck,
  type SetPromptModeInput,
  type SetReadingBookAck,
  type SetReadingBookInput,
  type SetTurnTimerAck,
  type SetTurnTimerInput,
  type StartGameAck,
  type StartGameInput,
  type SubmitCoverAck,
  type SubmitCoverInput,
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
/**
 * The test-only app seam config (infrastructure.md — Curation-write
 * isolation / test-only turn-timer seam). When `enabled` and the
 * connecting socket presents the matching `x-e2e-test-signal` header, the
 * connection is flagged `socket.data.isTestTraffic` and its prompt-ratings
 * are discarded (never reaching the Curation Store) and its lobby may set a
 * sub-floor turn timer. Inert — and un-triggerable — when `enabled` is
 * false or the secret is absent/mismatched.
 */
export interface TestSeamConfig {
  enabled: boolean;
  secret: string | undefined;
}

const TEST_SIGNAL_HEADER = 'x-e2e-test-signal';

export function createSocketServer(
  httpServer: HttpServer,
  store: RoomStore,
  sessionStore: SessionTokenStore = createSessionTokenStore(),
  logger: Logger = createLogger(),
  curationStore?: CurationStore,
  testSeam: TestSeamConfig = { enabled: false, secret: undefined },
): SocketIOServer {
  const io = new SocketIOServer(httpServer);

  io.on('connection', (socket) => {
    // Tag this connection's traffic if — and only if — the seam is enabled
    // AND the presented header matches the configured secret. Read once at
    // connect; every later handler consults `socket.data.isTestTraffic`.
    // Header values can be a string or string[]; only a scalar exact match
    // counts.
    if (testSeam.enabled && testSeam.secret) {
      const presented = socket.handshake.headers[TEST_SIGNAL_HEADER];
      if (typeof presented === 'string' && presented === testSeam.secret) {
        socket.data.isTestTraffic = true;
        // Echo the test-only CLIENT grace seam (T006). GRACE_MS is a client
        // constant the server-side seams cannot reach, so we tell this
        // (already gate-confirmed) test connection it may shorten the 30s
        // decoration grace. Fires ONLY here — under the same seam-enabled +
        // matching-secret gate as every other seam — so it is inert and
        // un-triggerable in normal runtime and structurally impossible on
        // prod (where the seam is disabled).
        socket.emit('testSeamActive');
      }
    }

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

    socket.on('kickPlayer', (input: KickPlayerInput, ack: (response: KickPlayerAck) => void) => {
      onKickPlayer(socket, store, logger, input, ack);
    });

    socket.on(
      'restartGame',
      (input: RestartGameInput, ack: (response: RestartGameAck) => void) => {
        onRestartGame(socket, store, logger, input, ack);
      },
    );

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

    socket.on(
      'set_laps_per_book',
      (input: SetLapsPerBookInput, ack: (response: SetLapsPerBookAck) => void) => {
        onSetLapsPerBook(socket, store, input, ack);
      },
    );

    socket.on(
      'set_prompt_mode',
      (input: SetPromptModeInput, ack: (response: SetPromptModeAck) => void) => {
        onSetPromptMode(socket, store, input, ack);
      },
    );

    socket.on(
      'set_curated_prompt_count',
      (input: SetCuratedPromptCountInput, ack: (response: SetCuratedPromptCountAck) => void) => {
        onSetCuratedPromptCount(socket, store, input, ack);
      },
    );

    socket.on(
      'set_allow_prompt_write_in',
      (input: SetAllowPromptWriteInInput, ack: (response: SetAllowPromptWriteInAck) => void) => {
        onSetAllowPromptWriteIn(socket, store, input, ack);
      },
    );

    socket.on(
      'set_reading_book',
      (input: SetReadingBookInput, ack: (response: SetReadingBookAck) => void) => {
        onSetReadingBook(socket, store, logger, input, ack);
      },
    );

    socket.on('submitEntry', (input: SubmitEntryInput, ack: (response: SubmitEntryAck) => void) => {
      onSubmitEntry(socket, store, logger, input, ack, curationStore);
    });

    socket.on('submitCover', (input: SubmitCoverInput, ack: (response: SubmitCoverAck) => void) => {
      onSubmitCover(socket, store, logger, input, ack);
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
