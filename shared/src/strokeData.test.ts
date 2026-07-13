import { describe, expect, it } from 'vitest';
import { parseStrokes, serializeStrokes, type StrokeData } from './strokeData.js';

describe('stroke data serialization (datamodel.md Entry.content for drawings)', () => {
  it('round-trips an ordered array of strokes, each a list of points', () => {
    const strokes: StrokeData = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      [{ x: 5, y: 5 }],
    ];

    const content = serializeStrokes(strokes);
    expect(typeof content).toBe('string');
    expect(parseStrokes(content)).toEqual(strokes);
  });

  it('parses an empty string as no strokes', () => {
    expect(parseStrokes('')).toEqual([]);
  });

  it('parses malformed content as no strokes rather than throwing', () => {
    expect(parseStrokes('not json')).toEqual([]);
  });
});
