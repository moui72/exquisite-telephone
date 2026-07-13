import type { Player, Room } from '@exquisite-telephone/shared';
import { writable, type Readable } from 'svelte/store';
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
}

export function createSessionStore(socket: GameSocket): SessionStore {
  const { subscribe, update } = writable<SessionState>({ room: null, player: null, error: null });

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

  return {
    subscribe,
    createRoom(hostName: string) {
      return new Promise<void>((resolve) => {
        socket.emit('createRoom', { hostName }, (response) => {
          applyAck(response as RoomAck);
          resolve();
        });
      });
    },
    joinRoom(roomId: string, playerName: string) {
      return new Promise<void>((resolve) => {
        socket.emit('joinRoom', { roomId, playerName }, (response) => {
          applyAck(response as RoomAck);
          resolve();
        });
      });
    },
    startGame() {
      return new Promise<void>((resolve) => {
        let currentRoomId: string | undefined;
        let currentPlayerId: string | undefined;
        const unsubscribe = subscribe((state) => {
          currentRoomId = state.room?.id;
          currentPlayerId = state.player?.id;
        });
        unsubscribe();

        socket.emit(
          'startGame',
          { roomId: currentRoomId, playerId: currentPlayerId },
          (response) => {
            applyAck(response as RoomAck);
            resolve();
          },
        );
      });
    },
  };
}
