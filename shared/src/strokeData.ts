/** A single point captured from a pointer event, in canvas-local coordinates. */
export interface Point {
  x: number;
  y: number;
}

/**
 * One continuous pointer-down-to-pointer-up freehand stroke, carrying its
 * own color and line width (datamodel.md Entry.content).
 */
export interface StrokeOp {
  type: 'stroke';
  points: Point[];
  color: string;
  width: number;
}

/**
 * A flood-fill seeded at `point`, replayed by re-running the fill algorithm
 * against the canvas as rendered up to this op in the sequence (see
 * ui.md Writing/Drawing View).
 */
export interface FillOp {
  type: 'fill';
  point: Point;
  color: string;
}

/** A single drawing operation, replayed strictly in array order. */
export type DrawOp = StrokeOp | FillOp;

/**
 * A drawing Entry's vector representation (datamodel.md Entry.content):
 * an ordered array of draw ops — replayed onto a canvas at reveal/export
 * time rather than stored as raster.
 */
export type DrawOps = DrawOp[];

export function serializeDrawOps(ops: DrawOps): string {
  return JSON.stringify(ops);
}

/** Parses draw ops, tolerating empty/malformed content as "no ops". */
export function parseDrawOps(content: string): DrawOps {
  if (!content) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as DrawOps) : [];
  } catch {
    return [];
  }
}
