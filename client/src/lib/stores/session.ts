import type { Player, Room } from '@exquisite-telephone/shared';
import { get, writable, type Readable } from 'svelte/store';
import type { GameSocket } from '../socket/types.js';

export interface SessionState {
  room: Room | null;
  player: Player | null;
  error: string | null;
}

interface RoomAck {
  room?: Room;
  player?: Player;
  error?: string;
}

/**
 * The client's single source of state (constitution Principle VI): the
 * client holds no authoritative game state of its own, only whatever the
 * server's room broadcasts say. All UI reads from this one store.
 */
export interface SessionStore extends Readable<SessionState> {
  createRoom(hostName: string): Promise<void>;
  joinRoom(roomId: string, playerName: string): Promise<void>;
  startGame(): Promise<void>;
  submitEntry(bookId: string, content: string): Promise<void>;
}

export function createSessionStore(socket: GameSocket): SessionStore {
  const store = writable<SessionState>({ room: null, player: null, error: null });
  const { subscribe, update } = store;

  socket.on('roomUpdated', (payload) => {
    const { room } = payload as { room: Room };
    update((state) => ({ ...state, room, error: null }));
  });

  function applyAck(ack: RoomAck) {
    if (ack.error) {
      update((state) => ({ ...state, error: ack.error! }));
      return;
    }
    update((state) => ({
      room: ack.room ?? state.room,
      player: ack.player ?? state.player,
      error: null,
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

  return {
    subscribe,
    createRoom(hostName: string) {
      return emitWithAck('createRoom', { hostName });
    },
    joinRoom(roomId: string, playerName: string) {
      return emitWithAck('joinRoom', { roomId, playerName });
    },
    startGame() {
      const state = get(store);
      return emitWithAck('startGame', { roomId: state.room?.id, playerId: state.player?.id });
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
