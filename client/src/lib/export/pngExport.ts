import { parseStrokes } from '@exquisite-telephone/shared';
import type { Book, Player } from '@exquisite-telephone/shared';

/**
 * Client-side PNG export pipeline (infrastructure.md Export Pipeline):
 * replays a book's stroke-data drawing entries onto an off-screen
 * canvas, composites them with rendered text captions, and flattens the
 * result to a single PNG — no server-side rendering dependency.
 */

export const CANVAS_WIDTH = 320;
export const TEXT_ROW_HEIGHT = 60;
export const DRAWING_ROW_HEIGHT = 240;

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
  for (const entry of [...book.entries].sort((a, b) => a.position - b.position)) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(playerName(players, entry.authorId), 12, y + 16);

    if (entry.type === 'text') {
      ctx.fillStyle = '#0f172a';
      ctx.font = '20px sans-serif';
      ctx.fillText(entry.content, 12, y + TEXT_ROW_HEIGHT / 2 + 8);
      y += TEXT_ROW_HEIGHT;
    } else {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const stroke of parseStrokes(entry.content)) {
        if (stroke.length === 0) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0]!.x, stroke[0]!.y + y);
        for (const point of stroke.slice(1)) {
          ctx.lineTo(point.x, point.y + y);
        }
        ctx.stroke();
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
