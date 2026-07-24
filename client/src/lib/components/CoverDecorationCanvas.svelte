<script lang="ts">
  import type { DrawOps } from '@exquisite-telephone/shared';
  import DrawingCanvas from './DrawingCanvas.svelte';
  import GiltFrame from './GiltFrame.svelte';
  import { COVER_TEMPLATE_OPTIONS, coverTemplateBackground } from '../covers/templateArt.js';

  /**
   * The cover-decoration canvas (ui.md Cover Decoration): the origin
   * author decorates their OWN book's cover on the same DrawingCanvas and
   * toolbar as a turn drawing, framed as the easel's GiltFrame and
   * pre-stamped "<username>'s book". Honors Room.monochromeOnly. A picker
   * above the canvas offers the nine named background templates plus blank;
   * the chosen template renders as a low-opacity background BENEATH the ink
   * (the canvas is transparent so it shows through), switchable without
   * clearing the ink. The ink is a client-local draft — `onOpsChange`
   * surfaces edits; there is NO per-stroke socket emit here.
   */
  export let username: string;
  export let ops: DrawOps = [];
  export let onOpsChange: (next: DrawOps) => void = () => {};
  export let monochromeOnly = false;
  export let palettePreset: 'primary' | 'standard' | 'extended' = 'standard';
  export let allowFillTool = true;
  export let coverTemplate: string | null = null;
  export let onTemplateChange: (id: string | null) => void = () => {};

  $: templateBackground = coverTemplateBackground(coverTemplate);
</script>

<GiltFrame caption="The Easel — Your Book's Cover">
  <div class="flex flex-col gap-3">
    <p class="text-center font-mono text-sm text-ink/80">{username}'s book</p>

    <div class="flex flex-wrap gap-1" role="group" aria-label="Cover template">
      {#each COVER_TEMPLATE_OPTIONS as option (option.label)}
        <button
          type="button"
          class="rounded-md border border-gold/60 px-2 py-1 text-xs font-medium"
          class:bg-wine={coverTemplate === option.id}
          class:text-champagne={coverTemplate === option.id}
          class:text-ink={coverTemplate !== option.id}
          aria-pressed={coverTemplate === option.id}
          on:click={() => onTemplateChange(option.id)}
        >
          {option.label}
        </button>
      {/each}
    </div>

    <!-- The template background sits BENEATH the transparent canvas so the
         ink stays on top and legible (low opacity). `overflow-hidden`
         clips the template to the canvas bounds so a chosen background can
         never overflow the drawing area (cover-F001). -->
    <div class="relative w-fit overflow-hidden rounded-md">
      {#if templateBackground}
        <div
          data-cover-template={coverTemplate}
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 rounded-md opacity-20"
          style="background: {templateBackground};"
        ></div>
      {/if}
      <DrawingCanvas
        {ops}
        {onOpsChange}
        {monochromeOnly}
        {palettePreset}
        {allowFillTool}
        transparent={templateBackground !== ''}
      />
    </div>
  </div>
</GiltFrame>
