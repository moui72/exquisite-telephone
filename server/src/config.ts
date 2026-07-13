import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const DEFAULT_PORT = 3000;

// Resolved relative to this module's own location so it works the same
// whether running from `src` (dev, via tsx) or `dist` (built, via node) —
// both sit at the same depth under the repo root (`server/src` /
// `server/dist`), two levels above the client's built static output.
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CLIENT_DIST_PATH = resolve(HERE, '../../client/dist');

export interface Config {
  port: number;
  clientDistPath: string;
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
  return { port, clientDistPath };
}
