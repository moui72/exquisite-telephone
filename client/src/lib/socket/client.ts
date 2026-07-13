import { io, type Socket } from 'socket.io-client';
import type { GameSocket } from './types.js';

/**
 * Thin adapter around the real socket.io-client connection so the rest
 * of the client only depends on the small `GameSocket` interface (and
 * can be tested against a fake — see stores/session.test.ts).
 */
export function createGameSocket(socket: Socket = io()): GameSocket {
  return {
    emit(event, payload, ack) {
      socket.emit(event, payload, ack);
    },
    on(event, handler) {
      socket.on(event, handler);
    },
    off(event, handler) {
      socket.off(event, handler);
    },
  };
}
