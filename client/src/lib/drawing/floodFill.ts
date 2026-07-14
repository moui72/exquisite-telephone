import type { Point } from '@exquisite-telephone/shared';

/**
 * Pure scanline flood-fill: mutates `imageData` in place, filling every
 * pixel in the contiguous region matching the seed pixel's exact color
 * with `fillColor`. Pixels of any other color act as a boundary and are
 * left unchanged (ui.md Production Annotations — exact-match only, no
 * anti-aliasing tolerance).
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

  function matchesTarget(x: number, y: number): boolean {
    const i = (y * width + x) * 4;
    return data[i] === tr && data[i + 1] === tg && data[i + 2] === tb && data[i + 3] === ta;
  }

  function setFill(x: number, y: number): void {
    const i = (y * width + x) * 4;
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
