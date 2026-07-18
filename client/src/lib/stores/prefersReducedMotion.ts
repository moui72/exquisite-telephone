import { readable, type Readable } from 'svelte/store';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Reflects the live value of `matchMedia('(prefers-reduced-motion: reduce)')
 * .matches`, updating on the media query's `change` event (ui.md Reveal
 * View / Visual Identity). Used to suppress only the decorative
 * spotlight/curtain flourish around each Reveal unveil — never the
 * clock-derived auto-advance pacing itself, which keeps running
 * identically regardless of motion preference.
 */
export function createPrefersReducedMotionStore(): Readable<boolean> {
  return readable(
    typeof matchMedia === 'function' ? matchMedia(REDUCED_MOTION_QUERY).matches : false,
    (set) => {
      if (typeof matchMedia !== 'function') return;
      const mql = matchMedia(REDUCED_MOTION_QUERY);
      const handler = (event: { matches: boolean }) => set(event.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    },
  );
}

export const prefersReducedMotion = createPrefersReducedMotionStore();
