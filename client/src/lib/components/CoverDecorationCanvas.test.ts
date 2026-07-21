import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CoverDecorationCanvas from './CoverDecorationCanvas.svelte';

afterEach(() => cleanup());

function firePointer(canvas: Element, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  canvas.dispatchEvent(event);
}

/**
 * T009/T010 — the cover-decoration canvas (ui.md Cover Decoration). Reuses
 * DrawingCanvas, pre-stamped "<username>'s book", honors monochromeOnly,
 * and edits a client-local draft (draw ops) via onOpsChange without any
 * per-stroke socket emit (covers finalize once, via onSubmitCover).
 */
describe('CoverDecorationCanvas', () => {
  it("renders the pre-stamped \"<username>'s book\" plaque and a drawing canvas", () => {
    const { getByText, container } = render(CoverDecorationCanvas, {
      props: { username: 'Ada', ops: [] },
    });

    expect(getByText("Ada's book")).toBeInTheDocument();
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('aria-label')).toBe('Drawing canvas');
  });

  it('updates the client-local draft via onOpsChange on pointer up (no per-stroke emit)', () => {
    const onOpsChange = vi.fn();
    const { container } = render(CoverDecorationCanvas, {
      props: { username: 'Ada', ops: [], onOpsChange },
    });
    const canvas = container.querySelector('canvas')!;

    firePointer(canvas, 'pointerdown', 0, 0);
    firePointer(canvas, 'pointermove', 10, 10);
    firePointer(canvas, 'pointerup', 10, 10);

    expect(onOpsChange).toHaveBeenCalledTimes(1);
    const next = onOpsChange.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0].type).toBe('stroke');
  });

  it('honors monochromeOnly by hiding the color palette (passed through to DrawingCanvas)', () => {
    const { container, queryByRole } = render(CoverDecorationCanvas, {
      props: { username: 'Ada', ops: [], monochromeOnly: true },
    });

    // The canvas is still present...
    expect(container.querySelector('canvas')).not.toBeNull();
    // ...but the color palette group is hidden.
    expect(queryByRole('group', { name: /stroke color/i })).not.toBeInTheDocument();
  });

  it('shows the color palette when monochromeOnly is false', () => {
    const { queryByRole } = render(CoverDecorationCanvas, {
      props: { username: 'Ada', ops: [], monochromeOnly: false },
    });

    expect(queryByRole('group', { name: /stroke color/i })).toBeInTheDocument();
  });
});
