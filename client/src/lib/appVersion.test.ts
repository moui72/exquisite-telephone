import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './appVersion';

describe('APP_VERSION build constant', () => {
  it('is defined and non-empty in a client build/test context', () => {
    expect(typeof APP_VERSION).toBe('string');
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });

  it('is a version string beginning with v (dev fallback in a bare test run)', () => {
    // With no build args set, the Vite define composes the dev fallback
    // against the root package.json version (infrastructure.md).
    expect(APP_VERSION).toMatch(/^v\d+\.\d+\.\d+/);
  });
});
