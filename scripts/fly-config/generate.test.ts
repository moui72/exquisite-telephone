import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse } from 'smol-toml';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => resolve(here, '__fixtures__', name);

/**
 * The pre-change fly.toml / fly.staging.toml are the oracle: the deployed
 * apps are running on them, so a value diff means the generator is wrong,
 * not that the configs were.
 *
 * Comparison is over PARSED TOML, never raw bytes. The two committed files
 * carry different comment blocks (fly.staging.toml's lockstep/drift-history
 * notes, fly.toml's `fly scale count 1` note), and one template with a
 * one-key values table cannot reproduce two different comment blocks.
 * Forcing it to would push comments into the values table and defeat the
 * allowlist below.
 */
const channels = [
  { channel: 'prod', app: 'exquisite-telephone', fixture: 'fly.baseline.toml' },
  { channel: 'beta', app: 'exquisite-telephone-beta', fixture: 'fly.staging.baseline.toml' },
] as const;

describe('fly config generator', () => {
  for (const { channel, app, fixture: fixtureName } of channels) {
    it.fails(`reproduces the ${channel} config's parsed values, differing only in app`, async () => {
      const { generate } = await import('./generate.ts');

      const generated = parse(generate(channel)) as Record<string, unknown>;
      const baseline = parse(readFileSync(fixture(fixtureName), 'utf-8')) as Record<
        string,
        unknown
      >;

      expect(generated.app).toBe(app);

      // Every other key must match the oracle exactly.
      const generatedRest = { ...generated };
      const baselineRest = { ...baseline };
      delete generatedRest.app;
      delete baselineRest.app;
      expect(generatedRest).toEqual(baselineRest);
      expect(Object.keys(generated).sort()).toEqual(Object.keys(baseline).sort());
    });
  }

  it.fails('keeps the per-channel values table to exactly one key (app)', async () => {
    const { channelValues } = await import('./generate.ts');

    // The allowlist guard: a new channel-specific key cannot be introduced
    // without a deliberate change to this test.
    for (const values of Object.values(channelValues)) {
      expect(Object.keys(values)).toEqual(['app']);
    }
  });

  it.fails('covers both deploy channels', async () => {
    const { channelValues } = await import('./generate.ts');

    expect(Object.keys(channelValues).sort()).toEqual(['beta', 'prod']);
  });
});
