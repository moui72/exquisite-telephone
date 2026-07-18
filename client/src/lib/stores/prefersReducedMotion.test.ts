import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPrefersReducedMotionStore } from './prefersReducedMotion.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubMatchMedia(initialMatches: boolean) {
  let changeHandler: ((event: { matches: boolean }) => void) | null = null;
  const mql = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((_event: string, handler: (event: { matches: boolean }) => void) => {
      changeHandler = handler;
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => mql),
  );
  return {
    fireChange(matches: boolean) {
      mql.matches = matches;
      changeHandler?.({ matches });
    },
  };
}

describe('prefersReducedMotion store', () => {
  it('reflects the current matchMedia().matches value', () => {
    stubMatchMedia(true);
    const store = createPrefersReducedMotionStore();

    expect(get(store)).toBe(true);
  });

  it('reflects false when the media query does not match', () => {
    stubMatchMedia(false);
    const store = createPrefersReducedMotionStore();

    expect(get(store)).toBe(false);
  });

  it('updates when the media query change event fires', () => {
    const { fireChange } = stubMatchMedia(false);
    const store = createPrefersReducedMotionStore();

    expect(get(store)).toBe(false);
    fireChange(true);
    expect(get(store)).toBe(true);
  });
});
