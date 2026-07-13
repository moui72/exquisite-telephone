import { describe, expect, it } from 'vitest';
import { createSessionTokenStore } from './sessionTokenStore.js';

describe('session token store (infrastructure.md Session Store)', () => {
  it('a valid token within the TTL resumes the same seat', () => {
    const store = createSessionTokenStore({ ttlMs: 5 * 60 * 1000 });
    const issuedAt = 1_000_000;

    const token = store.issue('player-1', 'ROOM1', issuedAt);
    const resolved = store.resolve(token, issuedAt + 60_000);

    expect(resolved).toEqual({ playerId: 'player-1', roomId: 'ROOM1' });
  });

  it('an expired token is treated as a new join (resolves to null)', () => {
    const store = createSessionTokenStore({ ttlMs: 5 * 60 * 1000 });
    const issuedAt = 1_000_000;

    const token = store.issue('player-1', 'ROOM1', issuedAt);
    const resolved = store.resolve(token, issuedAt + 5 * 60 * 1000 + 1);

    expect(resolved).toBeNull();
  });

  it('an unknown token resolves to null', () => {
    const store = createSessionTokenStore({ ttlMs: 5 * 60 * 1000 });

    expect(store.resolve('never-issued')).toBeNull();
  });
});
