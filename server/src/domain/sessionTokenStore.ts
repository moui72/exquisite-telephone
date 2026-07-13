import { randomUUID } from 'node:crypto';

/** A few minutes: short enough to not hold up a game, long enough to cover
 * a phone lock or wifi blip (infrastructure.md Session Store). */
export const DEFAULT_SESSION_TTL_MS = 5 * 60 * 1000;

interface SessionRecord {
  playerId: string;
  roomId: string;
  expiresAt: number;
}

export interface ResolvedSession {
  playerId: string;
  roomId: string;
}

export interface SessionTokenStoreOptions {
  ttlMs?: number;
}

/**
 * Short-lived, in-memory session-token store (infrastructure.md Session
 * Store): maps an opaque token to a player/room pair so a dropped
 * connection can resume the same seat, lost on server restart like the
 * rest of the room store (constitution Principle I).
 */
export interface SessionTokenStore {
  issue(playerId: string, roomId: string, now?: number): string;
  resolve(token: string, now?: number): ResolvedSession | null;
}

export function createSessionTokenStore(options: SessionTokenStoreOptions = {}): SessionTokenStore {
  const ttlMs = options.ttlMs ?? DEFAULT_SESSION_TTL_MS;
  const sessions = new Map<string, SessionRecord>();

  return {
    issue(playerId: string, roomId: string, now = Date.now()) {
      const token = randomUUID();
      sessions.set(token, { playerId, roomId, expiresAt: now + ttlMs });
      return token;
    },
    resolve(token: string, now = Date.now()) {
      const record = sessions.get(token);
      if (!record) {
        return null;
      }
      if (now > record.expiresAt) {
        sessions.delete(token);
        return null;
      }
      return { playerId: record.playerId, roomId: record.roomId };
    },
  };
}
