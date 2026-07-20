import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const DEFAULT_PORT = 3000;

// Resolved relative to this module's own location so it works the same
// whether running from `src` (dev, via tsx) or `dist` (built, via node) —
// both sit at the same depth under the repo root (`server/src` /
// `server/dist`), two levels above the client's built static output.
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CLIENT_DIST_PATH = resolve(HERE, '../../client/dist');
// Local-dev home for the Curation Store's single JSON file. Gitignored:
// it holds player-written text and accumulates across runs, and it is
// machine-local state, not source. In production this points inside the
// mounted Fly volume via CURATION_DATA_PATH (infrastructure.md).
const DEFAULT_CURATION_DATA_PATH = resolve(HERE, '../../.curation-data/curation.json');

export interface Config {
  port: number;
  clientDistPath: string;
  /** Absolute path to the Curation Store's JSON file — the only file this app writes. */
  curationDataPath: string;
}

/**
 * Reads runtime config from the environment. Kept separate from
 * `index.ts` so the entry point stays pure wiring (constitution
 * Principle X — bootstrap files wire dependencies only).
 */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsedPort = env.PORT ? Number.parseInt(env.PORT, 10) : NaN;
  const port = Number.isInteger(parsedPort) ? parsedPort : DEFAULT_PORT;
  const clientDistPath = env.CLIENT_DIST_PATH || DEFAULT_CLIENT_DIST_PATH;
  const curationDataPath = env.CURATION_DATA_PATH || DEFAULT_CURATION_DATA_PATH;
  return { port, clientDistPath, curationDataPath };
}
