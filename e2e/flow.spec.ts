import { test } from './fixtures.js';
import { runCoreFlow } from './helpers/flow.js';

/**
 * T007 — the core multiplayer flow. N players (one browser context each)
 * complete lobby → write/draw turns → reveal end to end. The server's
 * authoritative state is read through the observer helper (a tagged
 * socket.io-client seated as an extra player), which is what lets
 * runCoreFlow assert the `Room.status` transition and that every book
 * completed its laps, rather than inferring either from the DOM.
 *
 * Each test mints its OWN room (via the game fixture's createRoom), so the
 * spec is `fullyParallel`- and `--shard`-safe against one shared server
 * (infrastructure.md — Parallelism and isolation).
 *
 * Two browser players plus the observer seat is three active players —
 * exactly the recommended floor, and the fewest round transitions (each
 * gated by the client-side 30s cover-decoration grace) that still exercises
 * the full flow.
 */
test('lobby → write/draw → reveal, with every book completing its laps', async ({ game, baseURL }) => {
  test.setTimeout(240_000);
  const { observer } = await runCoreFlow(game, {
    playerNames: ['Ada', 'Bo'],
    applySettings: (lobby) => lobby.setLapsPerBook(1),
    baseURL: baseURL ?? undefined,
  });
  observer.close();
});
