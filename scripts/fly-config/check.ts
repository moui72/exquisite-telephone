import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { channelOutput, channelValues, generate, type Channel } from './generate.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Regenerate every channel's config in memory and compare against what is
 * committed. Non-zero exit on any difference, so CI catches a hand-edited
 * fly.toml / fly.staging.toml instead of letting it reach a deploy.
 */
let drifted = false;

for (const channel of Object.keys(channelValues) as Channel[]) {
  const file = channelOutput[channel];
  const expected = generate(channel);
  const actual = readFileSync(resolve(repoRoot, file), 'utf-8');

  if (expected === actual) {
    console.log(`ok       ${file}`);
    continue;
  }

  drifted = true;
  console.error(`DRIFTED  ${file} does not match the generated output`);
}

if (drifted) {
  console.error(
    '\nfly config drift: these files are generated from' +
      ' scripts/fly-config/fly.template.toml.\nEdit the template, then run `pnpm run gen:fly`.',
  );
  process.exit(1);
}
