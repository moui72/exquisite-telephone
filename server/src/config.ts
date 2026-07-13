const DEFAULT_PORT = 3000;

export interface Config {
  port: number;
}

/**
 * Reads runtime config from the environment. Kept separate from
 * `index.ts` so the entry point stays pure wiring (constitution
 * Principle X — bootstrap files wire dependencies only).
 */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsedPort = env.PORT ? Number.parseInt(env.PORT, 10) : NaN;
  const port = Number.isInteger(parsedPort) ? parsedPort : DEFAULT_PORT;
  return { port };
}
