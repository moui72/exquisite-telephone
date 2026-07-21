import { parseDrawOps } from '@exquisite-telephone/shared';
import type { Book, Player } from '@exquisite-telephone/shared';
import { floodFill } from '../drawing/floodFill.js';

/**
 * Client-side PNG export pipeline (infrastructure.md Export Pipeline):
 * replays a book's stroke-data drawing entries onto an off-screen
 * canvas, composites them with rendered text captions, and flattens the
 * result to a single PNG — no server-side rendering dependency.
 */

export const CANVAS_WIDTH = 320;
export const TEXT_ROW_HEIGHT = 60;
export const DRAWING_ROW_HEIGHT = 240;

/**
 * Marigold — the theme's gold/foil frame accent (ui.md Visual Identity).
 * Used in the export for the per-panel dividers and the gilt frame border,
 * so the exported strip reads as intentional gallery framing.
 */
export const MARIGOLD = '#F5A623';

/** Thickness in px of the divider band drawn at each internal panel seam. */
export const DIVIDER_HEIGHT = 2;

/** Thickness in px of the gilt frame border drawn around the whole strip. */
export const FRAME_BORDER_WIDTH = 4;

/** Height in px of the footer band below the last panel. */
export const FOOTER_HEIGHT = 40;

/** The "Exquisite Telephone" wordmark stamped into the export footer. */
export const WORDMARK = 'Exquisite Telephone';

/*
 * PRODUCTION ANNOTATION: `PRODUCTION_URL` is the canonical production
 * custom domain (infrastructure.md Deployment), written into the export
 * footer as a *static* string rather than derived from the running host.
 * This is intentional (plan Production Annotation Summary): a strip saved
 * from the beta channel should still advertise the production URL a
 * recipient can visit, not the beta host it happened to be exported from.
 * It is a channel-agnostic constant a future multi-domain setup would
 * need to revisit — do not replace it with `location.host` or similar.
 */
export const PRODUCTION_URL = 'ex-tel.ty-pe.com';

/** The subset of CanvasRenderingContext2D this pipeline uses — kept
 * minimal so it's easy to fake in tests without a real canvas. */
export interface MinimalCanvasContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: string;
  font: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  getImageData(x: number, y: number, w: number, h: number): ImageData;
  putImageData(imageData: ImageData, x: number, y: number): void;
}

export interface ExportCanvas {
  width: number;
  height: number;
  getContext(type: '2d'): MinimalCanvasContext | null;
  toDataURL(type?: string): string;
}

export function computeCanvasSize(book: Book): { width: number; height: number } {
  const height = book.entries.reduce(
    (total, entry) => total + (entry.type === 'text' ? TEXT_ROW_HEIGHT : DRAWING_ROW_HEIGHT),
    0,
  );
  return { width: CANVAS_WIDTH, height };
}

/**
 * Total export canvas size: the composited panel content plus the footer
 * band beneath it. The frame border is drawn inset over the outer edges,
 * so it does not add to the dimensions.
 */
export function computeExportCanvasSize(book: Book): { width: number; height: number } {
  const content = computeCanvasSize(book);
  return { width: content.width, height: content.height + FOOTER_HEIGHT };
}

function playerName(players: Player[], authorId: string): string {
  return players.find((p) => p.id === authorId)?.name ?? authorId;
}

export function renderBookOntoContext(
  ctx: MinimalCanvasContext,
  book: Book,
  players: Player[],
): void {
  const { width, height } = computeCanvasSize(book);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  let y = 0;
  const ordered = [...book.entries].sort((a, b) => a.position - b.position);
  for (const [index, entry] of ordered.entries()) {
    // Per-panel divider (infrastructure.md Export Pipeline — Strip
    // styling): a Marigold band at each internal seam so an individual
    // turn reads as its own framed panel rather than one continuous
    // column. No band above the first panel — the frame border handles
    // the outer edge.
    if (index > 0) {
      ctx.fillStyle = MARIGOLD;
      ctx.fillRect(0, y, width, DIVIDER_HEIGHT);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(playerName(players, entry.authorId), 12, y + 16);

    if (entry.type === 'text') {
      ctx.fillStyle = '#0f172a';
      ctx.font = '20px sans-serif';
      ctx.fillText(entry.content, 12, y + TEXT_ROW_HEIGHT / 2 + 8);
      y += TEXT_ROW_HEIGHT;
    } else {
      ctx.lineCap = 'round';
      for (const op of parseDrawOps(entry.content)) {
        if (op.type === 'stroke') {
          if (op.points.length === 0) continue;
          ctx.strokeStyle = op.color;
          ctx.lineWidth = op.width;
          ctx.beginPath();
          ctx.moveTo(op.points[0]!.x, op.points[0]!.y + y);
          for (const point of op.points.slice(1)) {
            ctx.lineTo(point.x, point.y + y);
          }
          ctx.stroke();
        } else {
          const imageData = ctx.getImageData(0, y, width, DRAWING_ROW_HEIGHT);
          floodFill(imageData, { x: op.point.x, y: op.point.y }, op.color);
          ctx.putImageData(imageData, 0, y);
        }
      }
      y += DRAWING_ROW_HEIGHT;
    }
  }
}

function defaultCreateCanvas(width: number, height: number): ExportCanvas {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Renders `book` and flattens it to a single PNG data URL. */
export function exportBookToPng(
  book: Book,
  players: Player[],
  createCanvas: (width: number, height: number) => ExportCanvas = defaultCreateCanvas,
): string {
  const size = computeCanvasSize(book);
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  renderBookOntoContext(ctx, book, players);
  return canvas.toDataURL('image/png');
}
