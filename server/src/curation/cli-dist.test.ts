/**
 * Guard: the compiled prod curation entrypoint must stay emitted and
 * node-loadable (infrastructure.md — Aggregation Pipe).
 *
 * The scheduled aggregate workflow runs `node server/dist/curation/cli.js`
 * on the deployed machine, which has no `src/` and no `tsx`. If a future
 * `tsconfig`/build change stops EMITTING that file, or the entrypoint stops
 * being node-loadable (e.g. an unresolvable import), or the Dockerfile stops
 * SHIPPING `server/dist`, the next prod aggregate would break silently. This
 * test makes any of those regress loudly instead.
 *
 * It builds the server, then asserts the compiled CLI exists AND actually
 * runs end-to-end (imports resolve, `main` folds an empty event dir and
 * writes a snapshot, exit 0) — not just that a file is present.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = resolve(HERE, '../..'); // server/src/curation -> server
const REPO_ROOT = resolve(SERVER_ROOT, '..');
const COMPILED_CLI = join(SERVER_ROOT, 'dist', 'curation', 'cli.js');

let dataDir: string;

beforeAll(() => {
  // Emit dist the way prod does. shared/dist is a build input; the root
  // `test` script builds it first, but build it here too so this guard is
  // self-contained when the file is run on its own.
  execFileSync('pnpm', ['--filter', 'shared', 'build'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });
  execFileSync('pnpm', ['--filter', '@exquisite-telephone/server', 'build'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });
  dataDir = mkdtempSync(join(tmpdir(), 'cli-dist-guard-'));
}, 120_000);

afterAll(() => {
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

describe('compiled prod curation entrypoint (T004)', () => {
  it('is emitted by the server build at server/dist/curation/cli.js', () => {
    expect(existsSync(COMPILED_CLI)).toBe(true);
  });

  it('runs node-loadable from server/dist and produces a snapshot', () => {
    // Exercises the exact prod command shape: `node dist/curation/cli.js`
    // with WORKDIR = server root. An unresolvable import or a dropped
    // dependency makes this throw a non-zero exit.
    execFileSync(process.execPath, [COMPILED_CLI], {
      cwd: SERVER_ROOT,
      env: { ...process.env, CURATION_DATA_PATH: join(dataDir, 'curation.json') },
      stdio: 'pipe',
    });
    expect(existsSync(join(dataDir, 'curation-snapshot.json'))).toBe(true);
  });

  it('is copied into the runtime image by the Dockerfile', () => {
    // Emit is worthless if the slim image never ships it.
    const dockerfile = readFileSync(join(REPO_ROOT, 'Dockerfile'), 'utf8');
    expect(dockerfile).toMatch(/COPY[^\n]*\bserver\/dist\b/);
  });

  it('exposes the compiled entrypoint as a named package script', () => {
    const pkg = JSON.parse(
      readFileSync(join(SERVER_ROOT, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['curation:aggregate:dist']).toBe('node dist/curation/cli.js');
  });
});
