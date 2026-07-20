import { defineConfig } from 'vitest/config';

// Root-level suite: repo-wide concerns that belong to no workspace
// package — currently the Fly deploy-config generator, whose inputs and
// outputs (fly.toml, fly.staging.toml) live at the repo root.
//
// Scoped deliberately to scripts/: an unscoped root run would re-run
// every workspace suite that `pnpm run test` already runs per package.
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts'],
    environment: 'node',
  },
});
