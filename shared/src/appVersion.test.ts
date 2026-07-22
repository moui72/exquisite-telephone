import { describe, expect, it } from 'vitest';
import { composeVersionString } from './appVersion.js';

describe('composeVersionString', () => {
  it.fails('shows a clean vX.Y.Z on prod', () => {
    expect(composeVersionString({ version: '1.2.3', channel: 'prod' })).toBe('v1.2.3');
  });

  it.fails('shows vX.Y.Z-beta+<sha> on beta', () => {
    expect(composeVersionString({ version: '1.2.3', channel: 'beta', sha: 'abc1234' })).toBe(
      'v1.2.3-beta+abc1234',
    );
  });

  it.fails('degrades a missing sha on beta gracefully to vX.Y.Z-beta', () => {
    expect(composeVersionString({ version: '1.2.3', channel: 'beta' })).toBe('v1.2.3-beta');
    expect(composeVersionString({ version: '1.2.3', channel: 'beta', sha: '' })).toBe(
      'v1.2.3-beta',
    );
  });

  it.fails('shows vX.Y.Z-dev on dev', () => {
    expect(composeVersionString({ version: '1.2.3', channel: 'dev' })).toBe('v1.2.3-dev');
  });

  it.fails('treats an absent or unrecognized channel as dev', () => {
    expect(composeVersionString({ version: '1.2.3' })).toBe('v1.2.3-dev');
    expect(composeVersionString({ version: '1.2.3', channel: 'staging' })).toBe('v1.2.3-dev');
  });
});
