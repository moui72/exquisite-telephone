import { defineConfig } from 'vitest/config';

// Root-level suite: repo-wide concerns that belong to no workspace
// package — currently the e2e helpers' Node unit tests.
//
// Scoped deliberately to e2e/: an unscoped root run would re-run every
// workspace suite that `pnpm run test` already runs per package.
export default defineConfig({
  test: {
    // e2e/**/*.test.ts — Node unit tests for the e2e helpers (the
    // observer). Playwright specs
    // use the `.spec.ts` suffix under e2e/ and are deliberately NOT matched
    // here — they run via `pnpm run e2e`, not vitest.
    include: ['e2e/**/*.test.ts'],
    environment: 'node',
  },
});
