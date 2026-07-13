/**
 * The minimal surface the session store needs from a Socket.IO client
 * connection. Kept as a small interface so the store can be tested
 * against a fake, without a real network connection.
 */
export interface GameSocket {
  emit(event: string, payload: unknown, ack: (response: unknown) => void): void;
  on(event: string, handler: (payload: unknown) => void): void;
  off(event: string, handler: (payload: unknown) => void): void;
}
