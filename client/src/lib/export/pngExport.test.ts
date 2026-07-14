import { describe, expect, it, vi } from 'vitest';
import type { Book, Player } from '@exquisite-telephone/shared';
import { serializeDrawOps } from '@exquisite-telephone/shared';
import {
  computeCanvasSize,
  exportBookToPng,
  renderBookOntoContext,
  TEXT_ROW_HEIGHT,
  DRAWING_ROW_HEIGHT,
  CANVAS_WIDTH,
  type MinimalCanvasContext,
} from './pngExport.js';

const roomId = 'ABCDE';
const ada: Player = { id: 'ada', roomId, name: 'Ada', connected: true, sessionToken: 't1' };
const grace: Player = { id: 'grace', roomId, name: 'Grace', connected: true, sessionToken: 't2' };
const players = [ada, grace];

function makeFixtureBook(): Book {
  const strokes = serializeDrawOps([
    {
      type: 'stroke',
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ],
      color: '#1e293b',
      width: 3,
    },
  ]);
  return {
    id: 'book-1',
    roomId,
    originAuthorId: ada.id,
    entries: [
      {
        id: 'e0',
        bookId: 'book-1',
        authorId: ada.id,
        position: 0,
        type: 'text',
        content: 'a spoonful of sugar',
      },
      {
        id: 'e1',
        bookId: 'book-1',
        authorId: grace.id,
        position: 1,
        type: 'drawing',
        content: strokes,
      },
      {
        id: 'e2',
        bookId: 'book-1',
        authorId: ada.id,
        position: 2,
        type: 'text',
        content: 'medicine goes down',
      },
    ],
  };
}

function makeFakeContext(
  width = CANVAS_WIDTH,
  height = TEXT_ROW_HEIGHT * 2 + DRAWING_ROW_HEIGHT,
): MinimalCanvasContext & { calls: string[] } {
  const calls: string[] = [];
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  return {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'round',
    font: '',
    fillRect(x, y, w, h) {
      calls.push(`fillRect(${x},${y},${w},${h})`);
    },
    fillText(text, x, y) {
      calls.push(`fillText(${text},${x},${y})`);
    },
    beginPath() {
      calls.push('beginPath()');
    },
    moveTo(x, y) {
      calls.push(`moveTo(${x},${y})`);
    },
    lineTo(x, y) {
      calls.push(`lineTo(${x},${y})`);
    },
    stroke() {
      calls.push('stroke()');
    },
    getImageData(x, y, w, h) {
      calls.push(`getImageData(${x},${y},${w},${h})`);
      return { width: w, height: h, data: pixels } as unknown as ImageData;
    },
    putImageData(imageData, x, y) {
      calls.push(`putImageData(${x},${y})`);
      void imageData;
    },
  };
}

describe('computeCanvasSize (fixed row per entry type)', () => {
  it('sums row heights for a fixture book with known entries', () => {
    const book = makeFixtureBook();

    const size = computeCanvasSize(book);

    expect(size.width).toBe(CANVAS_WIDTH);
    expect(size.height).toBe(TEXT_ROW_HEIGHT * 2 + DRAWING_ROW_HEIGHT);
  });
});

describe('renderBookOntoContext (composite drawings + text captions)', () => {
  it('draws each text entry as fillText and each drawing entry as replayed strokes, in order', () => {
    const book = makeFixtureBook();
    const ctx = makeFakeContext();

    renderBookOntoContext(ctx, book, players);

    // Background first.
    expect(ctx.calls[0]).toMatch(/^fillRect/);

    const firstTextIndex = ctx.calls.findIndex((c) => c.includes('a spoonful of sugar'));
    const strokeIndex = ctx.calls.findIndex((c) => c.startsWith('beginPath'));
    const secondTextIndex = ctx.calls.findIndex((c) => c.includes('medicine goes down'));

    expect(firstTextIndex).toBeGreaterThan(-1);
    expect(strokeIndex).toBeGreaterThan(firstTextIndex);
    expect(secondTextIndex).toBeGreaterThan(strokeIndex);

    // The stroke's points are replayed via moveTo/lineTo, offset into the
    // drawing entry's row (below the first text row).
    expect(ctx.calls).toContain(`moveTo(1,${2 + TEXT_ROW_HEIGHT})`);
    expect(ctx.calls).toContain(`lineTo(3,${4 + TEXT_ROW_HEIGHT})`);
    expect(ctx.calls).toContain(`lineTo(5,${6 + TEXT_ROW_HEIGHT})`);
    expect(ctx.calls.filter((c) => c === 'stroke()')).toHaveLength(1);
  });

  it('replays a FillOp via the shared floodFill algorithm', () => {
    const fillOps = serializeDrawOps([{ type: 'fill', point: { x: 7, y: 9 }, color: '#22c55e' }]);
    const book: Book = {
      id: 'book-2',
      roomId,
      originAuthorId: ada.id,
      entries: [
        {
          id: 'e0',
          bookId: 'book-2',
          authorId: grace.id,
          position: 0,
          type: 'drawing',
          content: fillOps,
        },
      ],
    };
    const ctx = makeFakeContext(CANVAS_WIDTH, DRAWING_ROW_HEIGHT);

    renderBookOntoContext(ctx, book, players);

    expect(ctx.calls).toContain(`getImageData(0,0,${CANVAS_WIDTH},${DRAWING_ROW_HEIGHT})`);
    expect(ctx.calls).toContain('putImageData(0,0)');
  });
});

describe('exportBookToPng (flatten to a single PNG)', () => {
  it('sizes the canvas, renders the book, and returns the PNG data URL', () => {
    const book = makeFixtureBook();
    const ctx = makeFakeContext();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toDataURL: vi.fn(() => 'data:image/png;base64,FAKE'),
    };
    const createCanvas = vi.fn(() => fakeCanvas);

    const dataUrl = exportBookToPng(book, players, createCanvas);

    expect(createCanvas).toHaveBeenCalledWith(
      CANVAS_WIDTH,
      TEXT_ROW_HEIGHT * 2 + DRAWING_ROW_HEIGHT,
    );
    expect(fakeCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(dataUrl).toBe('data:image/png;base64,FAKE');
    expect(ctx.calls.length).toBeGreaterThan(0);
  });
});
