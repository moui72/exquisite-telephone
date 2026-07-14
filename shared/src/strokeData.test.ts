import { describe, expect, it } from 'vitest';
import { parseDrawOps, serializeDrawOps, type DrawOps, type FillOp, type StrokeOp } from './strokeData.js';

describe('draw op serialization (datamodel.md Entry.content for drawings)', () => {
  it('round-trips a StrokeOp carrying its own color and width', () => {
    const strokeOp: StrokeOp = {
      type: 'stroke',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      color: '#ff0000',
      width: 3,
    };
    const ops: DrawOps = [strokeOp];

    const content = serializeDrawOps(ops);
    expect(typeof content).toBe('string');
    expect(parseDrawOps(content)).toEqual(ops);
  });

  it('round-trips a FillOp seeded at a point with a color', () => {
    const fillOp: FillOp = { type: 'fill', point: { x: 5, y: 5 }, color: '#00ff00' };
    const ops: DrawOps = [fillOp];

    const content = serializeDrawOps(ops);
    expect(parseDrawOps(content)).toEqual(ops);
  });

  it('preserves order for a mixed array of stroke and fill ops', () => {
    const ops: DrawOps = [
      { type: 'stroke', points: [{ x: 0, y: 0 }], color: '#000000', width: 1 },
      { type: 'fill', point: { x: 1, y: 1 }, color: '#ffffff' },
      { type: 'stroke', points: [{ x: 2, y: 2 }], color: '#0000ff', width: 5 },
    ];

    const content = serializeDrawOps(ops);
    expect(parseDrawOps(content)).toEqual(ops);
  });

  it('parses an empty string as no ops', () => {
    expect(parseDrawOps('')).toEqual([]);
  });

  it('parses malformed content as no ops rather than throwing', () => {
    expect(parseDrawOps('not json')).toEqual([]);
  });
});
