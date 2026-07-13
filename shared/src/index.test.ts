import { describe, expect, it } from 'vitest';
import { SHARED_PACKAGE_READY } from './index.js';

describe('shared package scaffold', () => {
  it('builds and runs under the test runner', () => {
    expect(SHARED_PACKAGE_READY).toBe(true);
  });
});
