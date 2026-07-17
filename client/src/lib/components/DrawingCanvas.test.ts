import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DrawingCanvas from './DrawingCanvas.svelte';

afterEach(() => cleanup());

function firePointer(canvas: Element, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  canvas.dispatchEvent(event);
}

/** A fake 2D context sufficient for the fill-tool path (getImageData/putImageData). */
function makeFakeCtx() {
  const width = 320;
  const height = 240;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  return {
    lineWidth: 1,
    lineCap: 'round',
    strokeStyle: '#000000',
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    getImageData: vi.fn(() => ({ width, height, data })),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('DrawingCanvas (mobile-friendly stroke capture)', () => {
  it('renders a canvas that is not read-only by default', () => {
    const { container } = render(DrawingCanvas, { props: { ops: [] } });
    const canvas = container.querySelector('canvas');

    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('aria-label')).toBe('Drawing canvas');
  });

  it('marks the canvas read-only for replay/preview use', () => {
    const { container } = render(DrawingCanvas, { props: { ops: [], readOnly: true } });
    const canvas = container.querySelector('canvas');

    expect(canvas?.getAttribute('aria-label')).toBe('Drawing preview');
  });

  it('calls onOpsChange with a StrokeOp appended on pointer up', async () => {
    const onOpsChange = vi.fn();
    const { container } = render(DrawingCanvas, { props: { ops: [], onOpsChange } });
    const canvas = container.querySelector('canvas')!;

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const ops = onOpsChange.mock.calls[0][0];
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('stroke');
    expect(ops[0].points.length).toBeGreaterThanOrEqual(2);
  });

  it('does not capture strokes when readOnly', async () => {
    const onOpsChange = vi.fn();
    const { container } = render(DrawingCanvas, {
      props: { ops: [], readOnly: true, onOpsChange },
    });
    const canvas = container.querySelector('canvas')!;

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onOpsChange).not.toHaveBeenCalled();
  });

  it('scales pointer coordinates from CSS-rendered size to bitmap resolution', async () => {
    const onOpsChange = vi.fn();
    const { container } = render(DrawingCanvas, { props: { ops: [], onOpsChange } });
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

    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const ops = onOpsChange.mock.calls[0][0];
    expect(ops[0].points[0]).toEqual({ x: 80, y: 60 });
    expect(ops[0].points[1]).toEqual({ x: 120, y: 90 });
  });

  it('uses the clicked palette color for the next drawn stroke', async () => {
    const onOpsChange = vi.fn();
    const { container, getByLabelText } = render(DrawingCanvas, {
      props: { ops: [], onOpsChange },
    });
    const canvas = container.querySelector('canvas')!;

    await fireEvent.click(getByLabelText('Color #ef4444'));

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const ops = onOpsChange.mock.calls[0][0];
    expect(ops[0].type).toBe('stroke');
    expect(ops[0].color).toBe('#ef4444');
  });

  it('uses the selected width preset for the next drawn stroke', async () => {
    const onOpsChange = vi.fn();
    const { container, getByText } = render(DrawingCanvas, { props: { ops: [], onOpsChange } });
    const canvas = container.querySelector('canvas')!;

    await fireEvent.click(getByText('Thick'));

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const ops = onOpsChange.mock.calls[0][0];
    expect(ops[0].type).toBe('stroke');
    expect(ops[0].width).toBe(8);
  });

  it('appends a FillOp instead of starting a stroke when the fill tool is active', async () => {
    const fakeCtx = makeFakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);

    const onOpsChange = vi.fn();
    const { container, getByText } = render(DrawingCanvas, { props: { ops: [], onOpsChange } });
    const canvas = container.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 320,
      bottom: 240,
      width: 320,
      height: 240,
      x: 0,
      y: 0,
      toJSON() {},
    });

    await fireEvent.click(getByText('Fill tool'));

    firePointer(canvas, 'pointerdown', 5, 5);

    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const ops = onOpsChange.mock.calls[0][0];
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('fill');
    expect(ops[0].point).toEqual({ x: 5, y: 5 });
    expect(fakeCtx.getImageData).toHaveBeenCalled();
    expect(fakeCtx.putImageData).toHaveBeenCalled();

    // No stroke should start: a subsequent pointermove/up shouldn't emit again.
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);
    expect(onOpsChange).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('hides the color palette and forces the default ink color when monochromeOnly is true', async () => {
    const onOpsChange = vi.fn();
    const { container, queryByLabelText, queryByRole } = render(DrawingCanvas, {
      props: { ops: [], onOpsChange, monochromeOnly: true },
    });
    const canvas = container.querySelector('canvas')!;

    expect(queryByLabelText('Color #ef4444')).not.toBeInTheDocument();
    expect(queryByRole('group', { name: /stroke color/i })).not.toBeInTheDocument();

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const ops = onOpsChange.mock.calls[0][0];
    expect(ops[0].color).toBe('#1e293b');
  });

  it('applies the newly-selected color/width to a stroke already in progress (F2 regression)', async () => {
    const fakeCtx = makeFakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);

    const onOpsChange = vi.fn();
    const { container, getByLabelText, getByText } = render(DrawingCanvas, {
      props: { ops: [], onOpsChange },
    });
    const canvas = container.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 320,
      bottom: 240,
      width: 320,
      height: 240,
      x: 0,
      y: 0,
      toJSON() {},
    });

    // Select a non-default color and width BEFORE starting the stroke.
    await fireEvent.click(getByLabelText('Color #ef4444'));
    await fireEvent.click(getByText('Thick'));

    firePointer(canvas, 'pointerdown', 0, 0);
    // The context must already reflect the newly-selected color/width
    // during this in-progress stroke, not just after it's finalized.
    expect(fakeCtx.strokeStyle).toBe('#ef4444');
    expect(fakeCtx.lineWidth).toBe(8);

    firePointer(canvas, 'pointermove', 10, 10);
    expect(fakeCtx.strokeStyle).toBe('#ef4444');
    expect(fakeCtx.lineWidth).toBe(8);

    vi.restoreAllMocks();
  });

  it('removes its pointer listeners on unmount without throwing', () => {
    const { container, unmount } = render(DrawingCanvas, { props: { ops: [] } });
    const canvas = container.querySelector('canvas')!;
    const removeSpy = vi.spyOn(canvas, 'removeEventListener');

    expect(() => unmount()).not.toThrow();
    expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });
});
