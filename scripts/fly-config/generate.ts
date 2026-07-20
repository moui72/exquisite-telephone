import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const templatePath = resolve(here, 'fly.template.toml');

export type Channel = 'prod' | 'beta';

/**
 * The per-channel values table — deliberately ONE key.
 *
 * `app` is the only thing the two Fly configs are allowed to differ in.
 * Keeping this table to a single key is what makes the lockstep
 * mechanical rather than conventional: adding a channel-specific setting
 * means adding a key here, which fails the allowlist assertion in
 * generate.test.ts and so cannot happen silently.
 *
 * Comments are NOT channel-specific — they live in the template and are
 * unified across both outputs. A note true of only one channel says so in
 * its own text rather than becoming a key here.
 */
export const channelValues: Record<Channel, { app: string }> = {
  prod: { app: 'exquisite-telephone' },
  beta: { app: 'exquisite-telephone-beta' },
};

/** Where each channel's generated config is written, relative to the repo root. */
export const channelOutput: Record<Channel, string> = {
  prod: 'fly.toml',
  beta: 'fly.staging.toml',
};

/** Render the template for one channel. */
export function generate(channel: Channel): string {
  const values = channelValues[channel];
  if (!values) throw new Error(`Unknown channel: ${channel}`);

  return readFileSync(templatePath, 'utf-8').replace(/__APP__/g, values.app);
}

/** Write every channel's config to disk. Returns the paths written. */
export function writeAll(): string[] {
  return (Object.keys(channelValues) as Channel[]).map((channel) => {
    const outPath = resolve(repoRoot, channelOutput[channel]);
    writeFileSync(outPath, generate(channel));
    return channelOutput[channel];
  });
}

// `pnpm run gen:fly` entry point.
if (process.argv[1] && resolve(process.argv[1]) === resolve(here, 'generate.ts')) {
  for (const written of writeAll()) console.log(`generated ${written}`);
}
