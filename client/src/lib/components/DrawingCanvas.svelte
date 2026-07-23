<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { DrawOps, Point } from '@exquisite-telephone/shared';
  import { floodFill } from '../drawing/floodFill.js';

  const DEFAULT_COLOR = '#1e293b';
  const DEFAULT_WIDTH = 3;

  /** 8-color preset palette (ui.md Writing/Drawing View), including black. */
  const PALETTE_COLORS = [
    '#000000',
    '#1e293b',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ffffff',
  ];

  /** 3 line-width presets (thin/medium/thick), in canvas pixels. */
  const WIDTH_PRESETS: { label: string; width: number }[] = [
    { label: 'Thin', width: 1 },
    { label: 'Medium', width: 3 },
    { label: 'Thick', width: 8 },
  ];

  /**
   * Mobile-friendly, pointer-event-based drawing canvas (constitution
   * Principle II). Captures strokes as vector draw ops (datamodel.md
   * Entry.content), not raster. Used both to draw (readOnly=false) and
   * to replay an existing drawing for reference/reveal (readOnly=true).
   *
   * Has a small toolbar (ui.md Writing/Drawing View): an 8-color preset
   * palette, 3 line-width presets, and a fill tool that flood-fills an
   * enclosed region from the tapped point instead of drawing a stroke.
   * The active color/width selection applies to new strokes only.
   *
   * Pointer listeners are registered in onMount and torn down in
   * onDestroy (constitution touch-cleanup quality standard).
   */
  export let ops: DrawOps = [];
  export let readOnly = false;
  export let onOpsChange: (ops: DrawOps) => void = () => {};
  /**
   * When true (Room.monochromeOnly, host-configured lobby setting), the
   * color palette is hidden and every new stroke uses the default ink
   * color, regardless of any prior palette selection (ui.md Writing/
   * Drawing View).
   */
  export let monochromeOnly = false;
  /**
   * When true, the canvas element has no opaque white background, so a
   * template background rendered behind it (cover decoration — ui.md) shows
   * through where there is no ink. Default false keeps the opaque white
   * "page" surface for turn drawings and Reveal replays.
   */
  export let transparent = false;

  let canvasEl: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let currentStroke: Point[] | null = null;
  let activeColor = DEFAULT_COLOR;
  let activeWidth = DEFAULT_WIDTH;
  let tool: 'stroke' | 'fill' = 'stroke';

  $: effectiveColor = monochromeOnly ? DEFAULT_COLOR : activeColor;

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

  function applyFill(point: Point, color: string) {
    if (!ctx || !canvasEl) return;
    const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    floodFill(imageData, point, color);
    ctx.putImageData(imageData, 0, 0);
  }

  function redrawAll() {
    if (!ctx || !canvasEl) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    for (const op of ops) {
      if (op.type === 'stroke') {
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;
        for (let i = 1; i < op.points.length; i += 1) {
          drawSegment(op.points[i - 1]!, op.points[i]!);
        }
      } else {
        applyFill(op.point, op.color);
      }
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (readOnly) return;
    if (tool === 'fill') {
      const point = toPoint(event);
      applyFill(point, effectiveColor);
      onOpsChange([...ops, { type: 'fill', point, color: effectiveColor }]);
      return;
    }
    if (ctx) {
      ctx.strokeStyle = effectiveColor;
      ctx.lineWidth = activeWidth;
    }
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
      onOpsChange([
        ...ops,
        { type: 'stroke', points: currentStroke, color: effectiveColor, width: activeWidth },
      ]);
    }
    currentStroke = null;
  }

  function selectColor(color: string) {
    activeColor = color;
  }

  function selectWidth(width: number) {
    activeWidth = width;
  }

  function toggleFillTool() {
    tool = tool === 'fill' ? 'stroke' : 'fill';
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
      ctx.lineWidth = activeWidth;
      ctx.lineCap = 'round';
      ctx.strokeStyle = activeColor;
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
    void ops;
    redrawAll();
  }
</script>

{#if !readOnly}
  <div class="mb-2 flex flex-wrap items-center gap-3 rounded-md border-2 border-gold/50 bg-champagne/60 p-2 font-body">
    {#if !monochromeOnly}
      <div class="flex gap-1" role="group" aria-label="Stroke color">
        {#each PALETTE_COLORS as color (color)}
          <button
            type="button"
            class="h-6 w-6 rounded-full border-2 {activeColor === color
              ? 'border-wine'
              : color === '#ffffff'
                ? 'border-gold/30'
                : 'border-transparent'}"
            style="background-color: {color};"
            aria-label="Color {color}"
            aria-pressed={activeColor === color}
            on:click={() => selectColor(color)}
          ></button>
        {/each}
      </div>
    {/if}

    <div class="flex gap-1" role="group" aria-label="Line width">
      {#each WIDTH_PRESETS as preset (preset.label)}
        <button
          type="button"
          class="rounded-md border border-gold/60 px-2 py-1 text-xs font-medium"
          class:bg-wine={activeWidth === preset.width}
          class:text-champagne={activeWidth === preset.width}
          class:text-ink={activeWidth !== preset.width}
          aria-pressed={activeWidth === preset.width}
          on:click={() => selectWidth(preset.width)}
        >
          {preset.label}
        </button>
      {/each}
    </div>

    <button
      type="button"
      class="rounded-md border border-gold/60 px-2 py-1 text-xs font-medium"
      class:bg-wine={tool === 'fill'}
      class:text-champagne={tool === 'fill'}
      class:text-ink={tool !== 'fill'}
      aria-pressed={tool === 'fill'}
      on:click={toggleFillTool}
    >
      Fill tool
    </button>
  </div>
{/if}

<!-- canvas's native ARIA role is "img" per the HTML-AAM spec; svelte's a11y
     check flags this as a false positive since canvas is nominally interactive. -->
<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
<canvas
  bind:this={canvasEl}
  width="320"
  height="240"
  class="touch-none rounded-md border-2 border-gold/70"
  class:bg-white={!transparent}
  role="img"
  aria-label={readOnly ? 'Drawing preview' : 'Drawing canvas'}
></canvas>
