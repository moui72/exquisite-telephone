import { createGameSocket } from '../socket/client.js';
import { createSessionStore } from './session.js';

/**
 * The single Svelte store instance the whole app reads from
 * (constitution Principle VI). Created once, wired to the real
 * socket.io-client connection.
 */
export const session = createSessionStore(createGameSocket());

export type { SessionState, SessionStore } from './session.js';
