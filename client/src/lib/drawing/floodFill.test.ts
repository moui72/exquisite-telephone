import { describe, expect, it } from 'vitest';
import { floodFill } from './floodFill.js';

/**
 * jsdom (unit tests) doesn't implement the real ImageData constructor, so
 * tests build a plain object matching its shape (RGBA bytes, row-major)
 * rather than instantiating via `new ImageData(...)`.
 */
function makeImageData(width: number, height: number, fill: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return { width, height, data } as unknown as ImageData;
}

function pixelAt(imageData: ImageData, x: number, y: number): [number, number, number, number] {
  const i = (y * imageData.width + x) * 4;
  const data = imageData.data;
  return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
}

describe('floodFill (scanline, exact-match seed color)', () => {
  it('fills every pixel in a contiguous region matching the seed pixel color', () => {
    const imageData = makeImageData(5, 5, [255, 255, 255, 255]);

    floodFill(imageData, { x: 2, y: 2 }, '#ff0000');

    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        expect(pixelAt(imageData, x, y)).toEqual([255, 0, 0, 255]);
      }
    }
  });

  it('stops at pixels of a different color, leaving them unchanged', () => {
    const imageData = makeImageData(5, 5, [255, 255, 255, 255]);
    // Draw a vertical wall of black pixels down column x=2, splitting the
    // region into a left half and a right half.
    for (let y = 0; y < 5; y += 1) {
      const i = (y * 5 + 2) * 4;
      imageData.data[i] = 0;
      imageData.data[i + 1] = 0;
      imageData.data[i + 2] = 0;
      imageData.data[i + 3] = 255;
    }

    floodFill(imageData, { x: 0, y: 0 }, '#ff0000');

    // Left half (x < 2) filled red.
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        expect(pixelAt(imageData, x, y)).toEqual([255, 0, 0, 255]);
      }
    }
    // The wall itself is untouched.
    for (let y = 0; y < 5; y += 1) {
      expect(pixelAt(imageData, 2, y)).toEqual([0, 0, 0, 255]);
    }
    // Right half (x > 2) untouched (still original white).
    for (let y = 0; y < 5; y += 1) {
      for (let x = 3; x < 5; x += 1) {
        expect(pixelAt(imageData, x, y)).toEqual([255, 255, 255, 255]);
      }
    }
  });

  it('fills anti-aliased near-seed boundary pixels, leaving no residual slivers (F002)', () => {
    const imageData = makeImageData(6, 3, [255, 255, 255, 255]);
    // A black wall down column x=4, with an anti-aliased edge one column to
    // its left (x=3): a light-gray blend of white and black. Exact-match
    // fill from the white side skips this near-white pixel, leaving the
    // classic unfilled sliver; a tolerance fill must absorb it.
    for (let y = 0; y < 3; y += 1) {
      const wall = (y * 6 + 4) * 4;
      imageData.data[wall] = 0;
      imageData.data[wall + 1] = 0;
      imageData.data[wall + 2] = 0;
      imageData.data[wall + 3] = 255;

      const aa = (y * 6 + 3) * 4;
      imageData.data[aa] = 225;
      imageData.data[aa + 1] = 225;
      imageData.data[aa + 2] = 225;
      imageData.data[aa + 3] = 255;
    }

    floodFill(imageData, { x: 0, y: 1 }, '#ff0000');

    // Every white and near-white pixel left of the wall is filled — no
    // near-color sliver survives at the boundary.
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        expect(pixelAt(imageData, x, y)).toEqual([255, 0, 0, 255]);
      }
    }
    // The black wall is far from the seed color and stays a boundary.
    for (let y = 0; y < 3; y += 1) {
      expect(pixelAt(imageData, 4, y)).toEqual([0, 0, 0, 255]);
    }
  });
});
