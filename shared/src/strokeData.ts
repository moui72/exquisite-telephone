/** A single point captured from a pointer event, in canvas-local coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** One continuous pointer-down-to-pointer-up stroke. */
export type Stroke = Point[];

/**
 * A drawing Entry's vector representation (datamodel.md Entry.content):
 * "an ordered array of strokes, each a list of points" — replayed onto a
 * canvas at reveal/export time rather than stored as raster.
 */
export type StrokeData = Stroke[];

export function serializeStrokes(strokes: StrokeData): string {
  return JSON.stringify(strokes);
}

/** Parses stroke data, tolerating empty/malformed content as "no strokes". */
export function parseStrokes(content: string): StrokeData {
  if (!content) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as StrokeData) : [];
  } catch {
    return [];
  }
}
