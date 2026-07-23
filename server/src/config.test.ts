import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('server config', () => {
  it('defaults to port 3000 when PORT is not set', () => {
    const config = loadConfig({});

    expect(config.port).toBe(3000);
  });

  it('uses PORT from the environment when set', () => {
    const config = loadConfig({ PORT: '4321' });

    expect(config.port).toBe(4321);
  });

  it('falls back to the default when PORT is not a valid number', () => {
    const config = loadConfig({ PORT: 'not-a-number' });

    expect(config.port).toBe(3000);
  });

  it('defaults clientDistPath to the built client dist relative to the compiled server output', () => {
    const config = loadConfig({});

    const here = dirname(fileURLToPath(import.meta.url));
    const expected = resolve(here, '../../client/dist');
    expect(config.clientDistPath).toBe(expected);
  });

  it('uses CLIENT_DIST_PATH from the environment when set', () => {
    const config = loadConfig({ CLIENT_DIST_PATH: '/srv/static' });

    expect(config.clientDistPath).toBe('/srv/static');
  });

  /**
   * Resolves the plan's Open Question 2. `.curation-data/` is chosen
   * because it collides with none of the repo's existing ignores
   * (`node_modules/`, `dist/`, `build/`, `.vite/`, `coverage/`,
   * `.project/.lock`) and names itself unambiguously.
   */
  it('defaults curationDataPath to a local gitignored path', () => {
    const config = loadConfig({});

    const here = dirname(fileURLToPath(import.meta.url));
    const expected = resolve(here, '../../.curation-data/curation.json');
    expect(config.curationDataPath).toBe(expected);
  });

  it('uses CURATION_DATA_PATH from the environment when set', () => {
    const config = loadConfig({ CURATION_DATA_PATH: '/data/curation.json' });

    expect(config.curationDataPath).toBe('/data/curation.json');
  });

  it('leaves the test-only seam OFF by default (inert in normal runtime)', () => {
    const config = loadConfig({});

    expect(config.e2eSeamEnabled).toBe(false);
    expect(config.e2eTestSignalSecret).toBeUndefined();
  });

  it('enables the seam only when E2E_SEAM_ENABLED is exactly "true"', () => {
    expect(loadConfig({ E2E_SEAM_ENABLED: 'true' }).e2eSeamEnabled).toBe(true);
    expect(loadConfig({ E2E_SEAM_ENABLED: 'false' }).e2eSeamEnabled).toBe(false);
    expect(loadConfig({ E2E_SEAM_ENABLED: '1' }).e2eSeamEnabled).toBe(false);
  });

  it('reads the test-signal secret from E2E_TEST_SIGNAL_SECRET', () => {
    expect(loadConfig({ E2E_TEST_SIGNAL_SECRET: 's3cret' }).e2eTestSignalSecret).toBe('s3cret');
  });
});
