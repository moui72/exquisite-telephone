import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('maps pointer coordinates correctly when the canvas is rendered LARGER than its bitmap (focus mode — T002)', async () => {
    // Focus mode (ui.md — "Focus mode (larger viewports)", plan T001)
    // stretches the 320×240 canvas to a larger CSS-rendered size. This is
    // the inverse of the shrink case above: the canvas is rendered at
    // 640×480 (double its bitmap on both axes), so a pointer at (100, 50)
    // in page coordinates must be recorded at (50, 25) in bitmap space.
    // No new scaling code — the existing rect-ratio math already handles
    // any rendered size; this pins that accuracy at the expanded size.
    const onOpsChange = vi.fn();
    const { container } = render(DrawingCanvas, { props: { ops: [], onOpsChange } });
    const canvas = container.querySelector('canvas')!;

    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 640,
      bottom: 480,
      width: 640,
      height: 480,
      x: 0,
      y: 0,
      toJSON() {},
    });

    firePointer(canvas, 'pointerdown', 100, 50);
    firePointer(canvas, 'pointermove', 200, 100);
    firePointer(canvas, 'pointerup', 200, 100);

    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const ops = onOpsChange.mock.calls[0][0];
    expect(ops[0].points[0]).toEqual({ x: 50, y: 25 });
    expect(ops[0].points[1]).toEqual({ x: 100, y: 50 });

    vi.restoreAllMocks();
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

    await fireEvent.click(getByText('Bucket'));

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

  it('hides the color palette and forces the default ink color when paletteMode is monochrome', async () => {
    const onOpsChange = vi.fn();
    const { container, queryByLabelText, queryByRole } = render(DrawingCanvas, {
      props: { ops: [], onOpsChange, paletteMode: 'monochrome' },
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

  it('includes a white swatch in the palette, with a visible default border, and uses it for new strokes once selected (F002)', async () => {
    const onOpsChange = vi.fn();
    const { container, getByLabelText } = render(DrawingCanvas, {
      props: { ops: [], onOpsChange },
    });

    const whiteSwatch = getByLabelText('Color #ffffff');
    expect(whiteSwatch).toBeInTheDocument();
    // Visible by default (not selected yet) against the champagne/60 toolbar
    // background -- distinct from border-transparent, which the other
    // swatches use when inactive.
    expect(whiteSwatch.className).toMatch(/border-gold\/30/);

    const canvas = container.querySelector('canvas')!;
    await fireEvent.click(whiteSwatch);

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onOpsChange).toHaveBeenCalled();
    const calls = onOpsChange.mock.calls;
    const ops = calls[calls.length - 1][0];
    expect(ops[ops.length - 1].color).toBe('#ffffff');
  });

  it('renders the standard preset by default (includes orange #f97316)', () => {
    const { getByLabelText } = render(DrawingCanvas, { props: { ops: [] } });
    expect(getByLabelText('Color #f97316')).toBeInTheDocument();
  });

  it('renders only the primary preset swatches when paletteMode is primary', () => {
    const { getByLabelText, queryByLabelText } = render(DrawingCanvas, {
      props: { ops: [], paletteMode: 'primary' },
    });
    // Primary = primary colors plus black and white.
    expect(getByLabelText('Color #3b82f6')).toBeInTheDocument();
    expect(getByLabelText('Color #000000')).toBeInTheDocument();
    expect(getByLabelText('Color #ffffff')).toBeInTheDocument();
    // Non-primary standard swatches are absent.
    expect(queryByLabelText('Color #f97316')).not.toBeInTheDocument();
    expect(queryByLabelText('Color #8b5cf6')).not.toBeInTheDocument();
  });

  it('renders the extended preset swatch set when paletteMode is extended', () => {
    const { getByLabelText } = render(DrawingCanvas, {
      props: { ops: [], paletteMode: 'extended' },
    });
    // Extended is a superset of standard, plus extended-only swatches.
    expect(getByLabelText('Color #f97316')).toBeInTheDocument();
    expect(getByLabelText('Color #0ea5e9')).toBeInTheDocument();
  });

  it('hides the fill (bucket) control entirely when allowFillTool is false', () => {
    const { queryByRole, getByRole } = render(DrawingCanvas, {
      props: { ops: [], allowFillTool: false },
    });
    // The pen tool remains; only the bucket option is removed.
    expect(getByRole('radio', { name: /pen/i })).toBeInTheDocument();
    expect(queryByRole('radio', { name: /bucket/i })).not.toBeInTheDocument();
  });

  it('shows the fill (bucket) control when allowFillTool is true (default)', () => {
    const { getByRole } = render(DrawingCanvas, { props: { ops: [] } });
    expect(getByRole('radio', { name: /bucket/i })).toBeInTheDocument();
  });

  it('hides the whole palette in monochrome mode, including extended-only swatches', () => {
    const { queryByLabelText, queryByRole } = render(DrawingCanvas, {
      props: { ops: [], paletteMode: 'monochrome' },
    });
    expect(queryByLabelText('Color #0ea5e9')).not.toBeInTheDocument();
    expect(queryByRole('group', { name: /stroke color/i })).not.toBeInTheDocument();
  });

  it('includes brown and pink skin-tone swatches in the standard preset', () => {
    const { getByLabelText } = render(DrawingCanvas, { props: { ops: [] } });
    expect(getByLabelText('Color #8d5524')).toBeInTheDocument();
    expect(getByLabelText('Color #ffc1a6')).toBeInTheDocument();
  });

  it('includes brown and pink skin-tone swatches in the extended preset', () => {
    const { getByLabelText } = render(DrawingCanvas, {
      props: { ops: [], paletteMode: 'extended' },
    });
    expect(getByLabelText('Color #8d5524')).toBeInTheDocument();
    expect(getByLabelText('Color #ffc1a6')).toBeInTheDocument();
  });

  it('omits the skin-tone swatches from the primary preset', () => {
    const { queryByLabelText } = render(DrawingCanvas, {
      props: { ops: [], paletteMode: 'primary' },
    });
    expect(queryByLabelText('Color #8d5524')).not.toBeInTheDocument();
    expect(queryByLabelText('Color #ffc1a6')).not.toBeInTheDocument();
  });

  it('renders and commits an in-progress stroke in the color active at its first point (F001)', async () => {
    const fakeCtx = makeFakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);

    const onOpsChange = vi.fn();
    const { container, getByLabelText } = render(DrawingCanvas, {
      props: { ops: [], onOpsChange },
    });
    const canvas = container.querySelector('canvas')!;

    // Pick red, then begin the stroke: the live context must paint red.
    await fireEvent.click(getByLabelText('Color #ef4444'));
    firePointer(canvas, 'pointerdown', 0, 0);
    expect(fakeCtx.strokeStyle).toBe('#ef4444');

    // Change the palette selection mid-stroke. The in-progress stroke was
    // started as red and must stay red for every remaining segment...
    await fireEvent.click(getByLabelText('Color #3b82f6'));
    firePointer(canvas, 'pointermove', 10, 10);
    expect(fakeCtx.strokeStyle).toBe('#ef4444');

    // ...and it must be committed as red, not the color chosen mid-stroke.
    firePointer(canvas, 'pointerup', 10, 10);
    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const ops = onOpsChange.mock.calls[0][0];
    expect(ops[0].type).toBe('stroke');
    expect(ops[0].color).toBe('#ef4444');

    vi.restoreAllMocks();
  });

  // 5da8: an in-progress stroke must survive a redraw triggered mid-stroke.
  // `redrawAll()` clears the canvas and replays only committed `ops`; when a
  // reactive redraw fires while a stroke is still in progress (an external
  // state update re-passing `ops`, a DPR/resize repaint) it erases the live
  // segments `handlePointerMove` painted, so the stroke vanishes until it is
  // committed on pointerup. Here a prop update mid-stroke stands in for that
  // external redraw; the in-progress stroke must be repainted, not dropped.
  // RED (it.fails) on current code: the redraw replays only ops and never
  // repaints `currentStroke`.
  it.fails('keeps in-progress stroke segments visible across a mid-stroke redraw (5da8)', async () => {
    const fakeCtx = makeFakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);

    const { container, rerender } = render(DrawingCanvas, { props: { ops: [] } });
    const canvas = container.querySelector('canvas')!;

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointermove', 20, 20);

    (fakeCtx.clearRect as unknown as ReturnType<typeof vi.fn>).mockClear();
    (fakeCtx.lineTo as unknown as ReturnType<typeof vi.fn>).mockClear();

    // A new (empty) ops reference drives the reactive redraw mid-stroke,
    // exactly as an external state update would in the running app.
    await rerender({ ops: [] });

    // The redraw ran (canvas was cleared)...
    expect(fakeCtx.clearRect).toHaveBeenCalled();
    // ...and it must have repainted the still-in-progress stroke rather than
    // leaving it erased until pointerup commits it.
    expect(fakeCtx.lineTo).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('exposes an explicit pen/bucket radio reflecting and switching the active tool (F006)', async () => {
    const { getByRole } = render(DrawingCanvas, { props: { ops: [] } });

    const pen = getByRole('radio', { name: /pen/i });
    const bucket = getByRole('radio', { name: /bucket/i });

    // Pen is the default active tool; the radio shows it as checked.
    expect(pen).toHaveAttribute('aria-checked', 'true');
    expect(bucket).toHaveAttribute('aria-checked', 'false');

    await fireEvent.click(bucket);
    expect(bucket).toHaveAttribute('aria-checked', 'true');
    expect(pen).toHaveAttribute('aria-checked', 'false');

    await fireEvent.click(pen);
    expect(pen).toHaveAttribute('aria-checked', 'true');
    expect(bucket).toHaveAttribute('aria-checked', 'false');
  });

  it('shows a pen-only radio (no bucket option) when fill is forbidden (F006 + T004)', () => {
    const { getByRole, queryByRole } = render(DrawingCanvas, {
      props: { ops: [], allowFillTool: false },
    });
    expect(getByRole('radio', { name: /pen/i })).toHaveAttribute('aria-checked', 'true');
    expect(queryByRole('radio', { name: /bucket/i })).not.toBeInTheDocument();
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

describe('theme regression guard (plan-1449)', () => {
  it('the toolbar template contains no leftover slate- or bg-white classes (the canvas element\'s own bg-white is correct and out of scope)', () => {
    const source = readFileSync(resolve(__dirname, './DrawingCanvas.svelte'), 'utf-8');

    // Scope the scan to the toolbar's template region only: from the
    // `{#if !readOnly}` wrapper up to (but not including) the `<canvas`
    // element, so the canvas's own intentional `bg-white` "page" surface
    // is never part of this assertion (plan-1449 explicit carve-out).
    const toolbarStart = source.indexOf('{#if !readOnly}');
    const canvasStart = source.indexOf('<canvas');
    expect(toolbarStart).toBeGreaterThan(-1);
    expect(canvasStart).toBeGreaterThan(toolbarStart);

    const toolbarTemplate = source.slice(toolbarStart, canvasStart);
    expect(toolbarTemplate).not.toMatch(/slate-/);
    expect(toolbarTemplate).not.toMatch(/bg-white/);
  });
});
