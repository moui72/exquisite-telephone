import type { Player, Room } from '@exquisite-telephone/shared';
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
  };
}
