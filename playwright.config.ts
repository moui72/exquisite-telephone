import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright end-to-end configuration (infrastructure.md — End-to-End Test
 * Gate). Dev-only tooling: a devDependency plus browser binaries, never an
 * app runtime dependency (constitution Project Scope).
 *
 * `baseURL` is read from `E2E_BASE_URL` so the SAME config runs two ways
 * with no edits:
 *   - locally, against a dev/built server on the default below, and
 *   - in CI, against live beta (`https://beta-ex-tel.ty-pe.com`) after a
 *     successful beta deploy.
 * When `E2E_BASE_URL` is unset, the `webServer` block below builds and
 * starts the app locally; when it is set (CI against beta), no local
 * server is started — the suite hits the already-deployed target.
 */
// A dedicated local port (not 3000) so an e2e run never collides with — or
// silently reuses — a dev/prod server a developer already has on 3000.
const LOCAL_PORT = process.env.E2E_PORT ?? '4599';
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${LOCAL_PORT}`;
const usesLocalServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  // Only Playwright specs are named *.spec.ts; *.test.ts under e2e/ (e.g.
  // helpers/observer.test.ts) are Vitest unit tests and must not be
  // collected by Playwright's runner.
  testMatch: /\.spec\.ts$/,
  // Each test mints its own unique room and the authoritative room store
  // scopes every broadcast per room (infrastructure.md — Parallelism and
  // isolation), so per-test rooms never collide even against one shared
  // beta server. That is what makes fullyParallel + arbitrary --shard=i/n
  // safe.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Four binaries, three engines, stated honestly (infrastructure.md):
  // Playwright's "Safari" is its bundled WebKit build, and Edge/Chrome are
  // both Chromium channels. The matrix still catches engine-specific
  // regressions across WebKit / Chromium / Gecko.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'msedge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],
  webServer: usesLocalServer
    ? {
        // Build shared + server + client, then run the compiled server,
        // which also serves the client's static build (infrastructure.md
        // Overview) — one process, one port, exactly as in production.
        command: 'pnpm run build && node server/dist/index.js',
        url: baseURL,
        // Never silently reuse whatever is already on the port — a stale
        // build would be tested instead of the current tree. The dedicated
        // LOCAL_PORT makes a fresh start safe.
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          PORT: LOCAL_PORT,
          // The test-only seam is enabled and given a known secret for the
          // local run so the e2e specs can tag their traffic (T004/T005).
          E2E_SEAM_ENABLED: 'true',
          E2E_TEST_SIGNAL_SECRET: process.env.E2E_TEST_SIGNAL_SECRET ?? 'local-e2e-secret',
        },
      }
    : undefined,
});
