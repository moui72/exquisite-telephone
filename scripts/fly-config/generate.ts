import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const templatePath = resolve(here, 'fly.template.toml');

export type Channel = 'prod' | 'beta';

/**
 * The per-channel values table — the allowlist of legitimate channel
 * differences.
 *
 * Every key here is a value the two Fly configs are ALLOWED to differ in.
 * Keeping this table minimal is what makes the lockstep mechanical rather
 * than conventional: adding a channel-specific setting means adding a key
 * here, which changes the allowlist assertion in generate.test.ts and so
 * cannot happen silently.
 *
 * - `app` — the Fly app name (the original, permanent difference).
 * - `e2eSeamEnabled` — the test-only seam gate (infrastructure.md —
 *   End-to-End Test Gate): `true` on beta (where the e2e suite runs after
 *   each deploy), `false` on prod (so the seam is un-triggerable there).
 *
 * Comments are NOT channel-specific — they live in the template and are
 * unified across both outputs. A note true of only one channel says so in
 * its own text rather than becoming a key here.
 */
export const channelValues: Record<Channel, { app: string; e2eSeamEnabled: string }> = {
  prod: { app: 'exquisite-telephone', e2eSeamEnabled: 'false' },
  beta: { app: 'exquisite-telephone-beta', e2eSeamEnabled: 'true' },
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

  return readFileSync(templatePath, 'utf-8')
    .replace(/__APP__/g, values.app)
    .replace(/__E2E_SEAM_ENABLED__/g, values.e2eSeamEnabled);
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
