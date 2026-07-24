import type { Point } from '@exquisite-telephone/shared';

/**
 * Squared color-distance tolerance. A pixel is treated as part of the
 * seed region when its RGBA is within this Euclidean distance (squared)
 * of the seed color. This absorbs anti-aliased boundary pixels — blends
 * of the region and a stroke edge that match neither exactly — so a fill
 * leaves no thin unfilled slivers, while a genuinely different color (a
 * solid stroke) stays far outside the threshold and remains a boundary.
 * `48` per channel is generous enough for typical 1–2px anti-aliasing yet
 * well below the distance to a contrasting ink color.
 */
const TOLERANCE_PER_CHANNEL = 48;
const TOLERANCE_SQ = TOLERANCE_PER_CHANNEL * TOLERANCE_PER_CHANNEL * 3;

/**
 * Pure scanline flood-fill: mutates `imageData` in place, filling every
 * pixel in the contiguous region whose color is within a distance
 * tolerance of the seed pixel's color with `fillColor`. Anti-aliased
 * near-seed edge pixels are absorbed into the region; pixels far from the
 * seed color act as a boundary and are left unchanged.
 *
 * No DOM/canvas dependency beyond the ImageData-shaped input, so this is
 * usable both live on a real canvas and in unit tests (jsdom doesn't
 * implement `getContext('2d')`).
 */
export function floodFill(imageData: ImageData, seed: Point, fillColor: string): void {
  const { width, height, data } = imageData;
  const x0 = Math.floor(seed.x);
  const y0 = Math.floor(seed.y);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return;

  const [fr, fg, fb, fa] = parseColor(fillColor);
  const seedIndex = (y0 * width + x0) * 4;
  const tr = data[seedIndex]!;
  const tg = data[seedIndex + 1]!;
  const tb = data[seedIndex + 2]!;
  const ta = data[seedIndex + 3]!;

  // Already the fill color: nothing to do.
  if (tr === fr && tg === fg && tb === fb && ta === fa) return;

  // With a distance tolerance, a filled pixel can still fall within the
  // threshold of the seed (e.g. filling a near-white region with an
  // off-white), so setFill no longer guarantees a pixel stops matching.
  // A visited bitmap keeps the scan finite regardless of the fill color.
  const visited = new Uint8Array(width * height);

  function matchesTarget(x: number, y: number): boolean {
    const p = y * width + x;
    if (visited[p]) return false;
    const i = p * 4;
    const dr = data[i]! - tr;
    const dg = data[i + 1]! - tg;
    const db = data[i + 2]! - tb;
    const da = data[i + 3]! - ta;
    return dr * dr + dg * dg + db * db + da * da <= TOLERANCE_SQ;
  }

  function setFill(x: number, y: number): void {
    const p = y * width + x;
    visited[p] = 1;
    const i = p * 4;
    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = fa;
  }

  // Stack-based scanline fill: for each seed, extend left/right along the
  // row, filling as it goes, then queue the spans directly above/below.
  const stack: Point[] = [{ x: x0, y: y0 }];
  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    if (!matchesTarget(x, y)) continue;

    let left = x;
    while (left - 1 >= 0 && matchesTarget(left - 1, y)) left -= 1;
    let right = x;
    while (right + 1 < width && matchesTarget(right + 1, y)) right += 1;

    for (let px = left; px <= right; px += 1) {
      setFill(px, y);
    }

    for (let px = left; px <= right; px += 1) {
      if (y - 1 >= 0 && matchesTarget(px, y - 1)) stack.push({ x: px, y: y - 1 });
      if (y + 1 < height && matchesTarget(px, y + 1)) stack.push({ x: px, y: y + 1 });
    }
  }
}

/** Parses a `#rrggbb` or `#rgb` hex color into RGBA bytes (alpha fully opaque). */
function parseColor(color: string): [number, number, number, number] {
  let hex = color.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b, 255];
}
