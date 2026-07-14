import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DrawingCanvas from './DrawingCanvas.svelte';

afterEach(() => cleanup());

function firePointer(canvas: Element, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  canvas.dispatchEvent(event);
}

describe('DrawingCanvas (mobile-friendly stroke capture)', () => {
  it('renders a canvas that is not read-only by default', () => {
    const { container } = render(DrawingCanvas, { props: { strokes: [] } });
    const canvas = container.querySelector('canvas');

    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('aria-label')).toBe('Drawing canvas');
  });

  it('marks the canvas read-only for replay/preview use', () => {
    const { container } = render(DrawingCanvas, { props: { strokes: [], readOnly: true } });
    const canvas = container.querySelector('canvas');

    expect(canvas?.getAttribute('aria-label')).toBe('Drawing preview');
  });

  it('calls onStrokeComplete with the captured points on pointer up', async () => {
    const onStrokeComplete = vi.fn();
    const { container } = render(DrawingCanvas, { props: { strokes: [], onStrokeComplete } });
    const canvas = container.querySelector('canvas')!;

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onStrokeComplete).toHaveBeenCalledTimes(1);
    const strokes = onStrokeComplete.mock.calls[0][0];
    expect(strokes).toHaveLength(1);
    expect(strokes[0].length).toBeGreaterThanOrEqual(2);
  });

  it('does not capture strokes when readOnly', async () => {
    const onStrokeComplete = vi.fn();
    const { container } = render(DrawingCanvas, {
      props: { strokes: [], readOnly: true, onStrokeComplete },
    });
    const canvas = container.querySelector('canvas')!;

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onStrokeComplete).not.toHaveBeenCalled();
  });

  it('scales pointer coordinates from CSS-rendered size to bitmap resolution', async () => {
    const onStrokeComplete = vi.fn();
    const { container } = render(DrawingCanvas, { props: { strokes: [], onStrokeComplete } });
    const canvas = container.querySelector('canvas')!;

    // Canvas bitmap is 320x240 (its width/height attrs), but CSS-rendered
    // size is stretched to 160x120 — half size on both axes — so a pointer
    // at (40, 30) in page coordinates should be recorded as (80, 60) in
    // bitmap space.
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 160,
      bottom: 120,
      width: 160,
      height: 120,
      x: 0,
      y: 0,
      toJSON() {},
    });

    firePointer(canvas, 'pointerdown', 40, 30);
    firePointer(canvas, 'pointermove', 60, 45);
    firePointer(canvas, 'pointerup', 60, 45);

    expect(onStrokeComplete).toHaveBeenCalledTimes(1);
    const strokes = onStrokeComplete.mock.calls[0][0];
    expect(strokes[0][0]).toEqual({ x: 80, y: 60 });
    expect(strokes[0][1]).toEqual({ x: 120, y: 90 });
  });

  it('removes its pointer listeners on unmount without throwing', () => {
    const { container, unmount } = render(DrawingCanvas, { props: { strokes: [] } });
    const canvas = container.querySelector('canvas')!;
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');

    expect(() => unmount()).not.toThrow();
    expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });
});
