import { test } from './fixtures.js';
import { runCoreFlow } from './helpers/flow.js';
import { SETTINGS_MATRIX } from './settings-matrix.js';

/**
 * T010 — runs the core flow across each named lobby-settings combo
 * (settings-matrix.ts). Each combo mints its own room (unique per test), so
 * the matrix is `fullyParallel`- and `--shard`-safe like the rest of the
 * suite.
 */
for (const combo of SETTINGS_MATRIX) {
  test(`core flow — ${combo.name}`, async ({ game, baseURL }) => {
    // Each round transition incurs the client-side 30s decoration grace, so
    // even a single-lap flow needs a generous budget.
    test.setTimeout(240_000);
    const { observer } = await runCoreFlow(game, {
      playerNames: combo.playerNames,
      acknowledgeSmallGame: combo.acknowledgeSmallGame,
      applySettings: combo.apply,
      baseURL: baseURL ?? undefined,
    });
    observer.close();
  });
}
