import { describe, expect, it } from 'vitest';
import { generateCoverArt } from './coverArt.js';

describe('generateCoverArt (deterministic, hash-seeded cover art — ui.md Reveal View)', () => {
  it('produces identical output for the same seed', () => {
    const a = generateCoverArt('player-123');
    const b = generateCoverArt('player-123');

    expect(a).toEqual(b);
  });

  it('produces different output for different seeds (not a hardcoded constant)', () => {
    const a = generateCoverArt('player-123');
    const b = generateCoverArt('player-456');

    expect(a).not.toEqual(b);
  });

  it('produces at least one shape with valid HSL and position values', () => {
    const art = generateCoverArt('someone');

    expect(art.shapes.length).toBeGreaterThan(0);
    for (const shape of art.shapes) {
      expect(shape.hue).toBeGreaterThanOrEqual(0);
      expect(shape.hue).toBeLessThan(360);
      expect(shape.saturation).toBeGreaterThanOrEqual(0);
      expect(shape.saturation).toBeLessThanOrEqual(100);
      expect(shape.lightness).toBeGreaterThanOrEqual(0);
      expect(shape.lightness).toBeLessThanOrEqual(100);
      expect(shape.cx).toBeGreaterThanOrEqual(0);
      expect(shape.cx).toBeLessThanOrEqual(100);
      expect(shape.cy).toBeGreaterThanOrEqual(0);
      expect(shape.cy).toBeLessThanOrEqual(100);
      expect(shape.r).toBeGreaterThan(0);
    }
  });
});
