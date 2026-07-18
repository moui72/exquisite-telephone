<script lang="ts">
  /**
   * The Gilt Frame — the game's signature ornate component (ui.md Visual
   * Identity): an engraved gold frame with a small plaque underneath
   * bearing a mock-formal caption. Reused everywhere an artifact appears:
   * the Lobby room card, the Writing/Drawing easel, and each Reveal book.
   */
  export let caption: string;

  const reduceMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<div class="gilt-frame rounded-lg border-4 border-marigold bg-butter p-3 shadow-lg" class:gilt-frame-motion={!reduceMotion}>
  <div class="gilt-frame-inner rounded border-2 border-marigold/60 p-2">
    <slot />
  </div>
  <p class="gilt-frame-plaque mt-2 text-center font-mono text-xs text-ink/80">
    {caption}
  </p>
</div>

<style>
  .gilt-frame-motion {
    animation: gilt-frame-shimmer 6s ease-in-out infinite;
  }

  @keyframes gilt-frame-shimmer {
    0%,
    100% {
      box-shadow: 0 0 0 rgba(245, 166, 35, 0);
    }
    50% {
      box-shadow: 0 0 12px rgba(245, 166, 35, 0.4);
    }
  }
</style>
