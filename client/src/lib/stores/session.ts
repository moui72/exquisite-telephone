import type { Player, Room, TimeoutVoteChoice } from '@exquisite-telephone/shared';
import { get, writable, type Readable } from 'svelte/store';
import type { GameSocket } from '../socket/types.js';

export interface SessionState {
  room: Room | null;
  player: Player | null;
  error: string | null;
  /**
   * True while an automatic rejoin (using a persisted session token) is
   * in flight — distinct from a hard error state (ui.md States).
   */
  reconnecting: boolean;
}

interface RoomAck {
  room?: Room;
  player?: Player;
  error?: string;
}

/** localStorage key for the session token used to resume a dropped connection. */
export const SESSION_TOKEN_STORAGE_KEY = 'exquisite-telephone:sessionToken';

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
  } catch {
    // localStorage unavailable (e.g. private browsing) — reconnect just
    // won't be able to resume the seat, which degrades to a fresh join.
  }
}

function clearStoredToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable — nothing to clear.
  }
}

/**
 * The client's single source of state (constitution Principle VI): the
 * client holds no authoritative game state of its own, only whatever the
 * server's room broadcasts say. All UI reads from this one store.
 */
export interface SessionStore extends Readable<SessionState> {
  createRoom(hostName: string): Promise<void>;
  joinRoom(roomId: string, playerName: string): Promise<void>;
  startGame(acknowledgeSmallGame?: boolean): Promise<void>;
  submitEntry(bookId: string, content: string): Promise<void>;
  setMonochrome(monochromeOnly: boolean): Promise<void>;
  setTurnTimer(turnTimerMinutes: 15 | 30 | 60 | 240 | 720 | null): Promise<void>;
  setLapsPerBook(lapsPerBook: 1 | 2 | 3): Promise<void>;
  /** Host-only, lobby-only curated-prompt settings (ui.md Lobby View). */
  setPromptMode(promptMode: 'free-form' | 'curated'): Promise<void>;
  setCuratedPromptCount(curatedPromptCount: 2 | 3 | 4 | 5): Promise<void>;
  setAllowPromptWriteIn(allowPromptWriteIn: boolean): Promise<void>;
  castTimeoutVote(choice: TimeoutVoteChoice): Promise<void>;
  endGame(): Promise<void>;
  /** Host-only moderation control (host-game-moderation-controls plan). */
  kickPlayer(targetPlayerId: string): Promise<void>;
  /** Host-only moderation control, valid once Room.nonContinuable is true. */
  restartGame(): Promise<void>;
  /** Client-local only: clears the stored session token and resets local state. No server event. */
  leaveGame(): void;
  voteToPlayAgain(): Promise<void>;
  playAgain(): Promise<void>;
}

export function createSessionStore(socket: GameSocket): SessionStore {
  const store = writable<SessionState>({
    room: null,
    player: null,
    error: null,
    reconnecting: false,
  });
  const { subscribe, update } = store;

  socket.on('roomUpdated', (payload) => {
    const { room } = payload as { room: Room };
    update((state) => ({ ...state, room, error: null }));
  });

  // Distinct from roomUpdated: fired only by onPlayAgain's per-socket
  // unicast (infrastructure.md), since each player gets their own new
  // Player identity, not just an updated shared room.
  socket.on('roomChanged', (payload) => {
    const { room, player } = payload as { room: Room; player: Player };
    storeToken(player.sessionToken);
    update((state) => ({ ...state, room, player, error: null }));
  });

  function applyAck(ack: RoomAck, { reconnecting = false } = {}) {
    if (ack.error) {
      update((state) => ({ ...state, error: ack.error!, reconnecting }));
      return;
    }
    if (ack.player) {
      storeToken(ack.player.sessionToken);
    }
    update((state) => ({
      room: ack.room ?? state.room,
      player: ack.player ?? state.player,
      error: null,
      reconnecting,
    }));
  }

  function emitWithAck(event: string, payload: unknown): Promise<void> {
    return new Promise<void>((resolve) => {
      socket.emit(event, payload, (response) => {
        applyAck(response as RoomAck);
        resolve();
      });
    });
  }

  // Reconnect tolerance (infrastructure.md Session Store): if a session
  // token from a previous connection is still around, try to resume that
  // seat instead of starting at the lobby. "reconnecting" is a distinct,
  // non-error state (ui.md States) shown until the attempt settles.
  const storedToken = readStoredToken();
  if (storedToken) {
    update((state) => ({ ...state, reconnecting: true }));
    socket.emit('rejoin', { token: storedToken }, (response) => {
      applyAck(response as RoomAck, { reconnecting: false });
    });
  }

  return {
    subscribe,
    createRoom(hostName: string) {
      return emitWithAck('createRoom', { hostName });
    },
    joinRoom(roomId: string, playerName: string) {
      return emitWithAck('joinRoom', { roomId, playerName });
    },
    startGame(acknowledgeSmallGame?: boolean) {
      const state = get(store);
      return emitWithAck('startGame', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        acknowledgeSmallGame,
      });
    },
    submitEntry(bookId: string, content: string) {
      const state = get(store);
      return emitWithAck('submitEntry', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        bookId,
        content,
      });
    },
    setMonochrome(monochromeOnly: boolean) {
      const state = get(store);
      return emitWithAck('set_monochrome', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        monochromeOnly,
      });
    },
    setTurnTimer(turnTimerMinutes: 15 | 30 | 60 | 240 | 720 | null) {
      const state = get(store);
      return emitWithAck('setTurnTimer', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        turnTimerMinutes,
      });
    },
    setLapsPerBook(lapsPerBook: 1 | 2 | 3) {
      const state = get(store);
      return emitWithAck('set_laps_per_book', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        lapsPerBook,
      });
    },
    setPromptMode(promptMode: 'free-form' | 'curated') {
      const state = get(store);
      return emitWithAck('set_prompt_mode', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        promptMode,
      });
    },
    setCuratedPromptCount(curatedPromptCount: 2 | 3 | 4 | 5) {
      const state = get(store);
      return emitWithAck('set_curated_prompt_count', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        curatedPromptCount,
      });
    },
    setAllowPromptWriteIn(allowPromptWriteIn: boolean) {
      const state = get(store);
      return emitWithAck('set_allow_prompt_write_in', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        allowPromptWriteIn,
      });
    },
    castTimeoutVote(choice: TimeoutVoteChoice) {
      const state = get(store);
      return emitWithAck('castTimeoutVote', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        choice,
      });
    },
    endGame() {
      const state = get(store);
      return emitWithAck('endGame', {
        roomId: state.room?.id,
        playerId: state.player?.id,
      });
    },
    kickPlayer(targetPlayerId: string) {
      const state = get(store);
      return emitWithAck('kickPlayer', {
        roomId: state.room?.id,
        playerId: state.player?.id,
        targetPlayerId,
      });
    },
    restartGame() {
      const state = get(store);
      return emitWithAck('restartGame', {
        roomId: state.room?.id,
        playerId: state.player?.id,
      });
    },
    leaveGame() {
      clearStoredToken();
      update(() => ({ room: null, player: null, error: null, reconnecting: false }));
    },
    voteToPlayAgain() {
      const state = get(store);
      return emitWithAck('voteToPlayAgain', {
        roomId: state.room?.id,
        playerId: state.player?.id,
      });
    },
    playAgain() {
      const state = get(store);
      return emitWithAck('playAgain', {
        roomId: state.room?.id,
        playerId: state.player?.id,
      });
    },
  };
}
