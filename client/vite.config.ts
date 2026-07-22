/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
// Imported by relative SOURCE path (not the shared barrel): the config is
// bundled by esbuild at load time, so a self-contained pure function needs
// no build of `shared` first (infrastructure.md — App Versioning).
import { composeVersionString } from '../shared/src/appVersion.js';

// The single source of truth for the version is the ROOT package.json
// (infrastructure.md — App Versioning), read here so an absent APP_VERSION
// build arg falls back to it rather than to the client package's version.
const rootPkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
) as { version: string };

// Assembled from the three build inputs the deploying workflow passes as
// --build-arg (declared as Dockerfile ARGs, exported as env to the client
// build). Absent -> dev fallback against the root package.json version.
//
// `||`, not `??`: the Dockerfile's `ENV APP_VERSION=$APP_VERSION` sets the
// var to the EMPTY STRING (not undefined) when the arg is unpassed, so an
// arg-less `docker build` must fall back on `''`, which `??` would not
// catch (it would compose `v-dev`). `sha` is left as-is — an empty sha
// degrades correctly in the composer (vX.Y.Z-beta with no `+<sha>`).
const appVersion = composeVersionString({
  version: process.env.APP_VERSION || rootPkg.version,
  channel: process.env.BUILD_CHANNEL || 'dev',
  sha: process.env.BUILD_SHA,
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Bake the composed version string into the client bundle at build time
  // (no runtime endpoint — Principle I). Exposed as the __APP_VERSION__
  // build constant; see client/src/lib/appVersion.ts.
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    // The socket client connects same-origin (`io()`); in production the
    // game server serves the built client itself, so during `vite dev`
    // the socket traffic must be proxied to the local game server.
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  resolve: {
    conditions: process.env.VITEST ? ['browser'] : undefined,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
