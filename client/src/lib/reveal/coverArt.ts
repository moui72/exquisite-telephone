/**
 * Deterministic, hash-seeded "cover art" for the Reveal page's animated
 * book viewer (ui.md Reveal View): a handful of overlapping colorful
 * circles, stable across re-renders for a given seed (typically a Book's
 * `originAuthorId`) rather than reshuffling every time. Pure function, no
 * external dependency.
 */

export interface CoverShape {
  /** Percent (0-100) horizontal center. */
  cx: number;
  /** Percent (0-100) vertical center. */
  cy: number;
  /** Percent (0-100) radius. */
  r: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export interface CoverArt {
  backgroundHue: number;
  shapes: CoverShape[];
}

const SHAPE_COUNT = 5;

/** Simple 32-bit string hash (FNV-1a variant) — deterministic, no external dependency. */
function hashString(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic pseudo-random number generator (mulberry32), seeded from a numeric hash. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateCoverArt(seed: string): CoverArt {
  const rand = mulberry32(hashString(seed));

  const backgroundHue = Math.floor(rand() * 360);

  const shapes: CoverShape[] = [];
  for (let i = 0; i < SHAPE_COUNT; i++) {
    shapes.push({
      cx: Math.floor(rand() * 100),
      cy: Math.floor(rand() * 100),
      r: 15 + Math.floor(rand() * 35),
      hue: Math.floor(rand() * 360),
      saturation: 55 + Math.floor(rand() * 40),
      lightness: 45 + Math.floor(rand() * 30),
    });
  }

  return { backgroundHue, shapes };
}
