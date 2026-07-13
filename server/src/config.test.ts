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
});
