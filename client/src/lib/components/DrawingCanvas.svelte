<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { Point, StrokeData } from '@exquisite-telephone/shared';

  /**
   * Mobile-friendly, pointer-event-based drawing canvas (constitution
   * Principle II). Captures strokes as vector point data (datamodel.md
   * Entry.content), not raster. Used both to draw (readOnly=false) and
   * to replay an existing drawing for reference/reveal (readOnly=true).
   *
   * Pointer listeners are registered in onMount and torn down in
   * onDestroy (constitution touch-cleanup quality standard).
   */
  export let strokes: StrokeData = [];
  export let readOnly = false;
  export let onStrokeComplete: (strokes: StrokeData) => void = () => {};

  let canvasEl: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let currentStroke: Point[] | null = null;

  function toPoint(event: PointerEvent | MouseEvent): Point {
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = canvasEl.width / rect.width;
    const scaleY = canvasEl.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function drawSegment(from: Point, to: Point) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function redrawAll() {
    if (!ctx || !canvasEl) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    for (const stroke of strokes) {
      for (let i = 1; i < stroke.length; i += 1) {
        drawSegment(stroke[i - 1]!, stroke[i]!);
      }
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (readOnly) return;
    canvasEl.setPointerCapture?.(event.pointerId);
    currentStroke = [toPoint(event)];
  }

  function handlePointerMove(event: PointerEvent) {
    if (readOnly || !currentStroke) return;
    const point = toPoint(event);
    const previous = currentStroke[currentStroke.length - 1]!;
    currentStroke = [...currentStroke, point];
    drawSegment(previous, point);
  }

  function handlePointerUp() {
    if (readOnly || !currentStroke) return;
    if (currentStroke.length >= 2) {
      onStrokeComplete([...strokes, currentStroke]);
    }
    currentStroke = null;
  }

  onMount(() => {
    // jsdom (unit tests) doesn't implement canvas 2D contexts; guard so
    // tests can exercise stroke capture without a real renderer.
    try {
      ctx = canvasEl.getContext('2d');
    } catch {
      ctx = null;
    }
    if (ctx) {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b';
    }
    redrawAll();

    canvasEl.addEventListener('pointerdown', handlePointerDown);
    canvasEl.addEventListener('pointermove', handlePointerMove);
    canvasEl.addEventListener('pointerup', handlePointerUp);
    canvasEl.addEventListener('pointercancel', handlePointerUp);
    canvasEl.addEventListener('pointerleave', handlePointerUp);
  });

  onDestroy(() => {
    canvasEl?.removeEventListener('pointerdown', handlePointerDown);
    canvasEl?.removeEventListener('pointermove', handlePointerMove);
    canvasEl?.removeEventListener('pointerup', handlePointerUp);
    canvasEl?.removeEventListener('pointercancel', handlePointerUp);
    canvasEl?.removeEventListener('pointerleave', handlePointerUp);
  });

  $: if (ctx) {
    void strokes;
    redrawAll();
  }
</script>

<!-- canvas's native ARIA role is "img" per the HTML-AAM spec; svelte's a11y
     check flags this as a false positive since canvas is nominally interactive. -->
<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
<canvas
  bind:this={canvasEl}
  width="320"
  height="240"
  class="touch-none rounded-md border border-slate-300 bg-white"
  role="img"
  aria-label={readOnly ? 'Drawing preview' : 'Drawing canvas'}
></canvas>
