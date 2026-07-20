<script lang="ts">
  import { CircleHelp, Gavel } from '@lucide/svelte';

  /**
   * The Salon Footer — a slim bar fixed along the bottom of every view
   * (ui.md Visual Identity): the velvet skirting of the gallery wall,
   * trimmed with a double gilt rail. Carries the house wordmark (or the
   * current salon's number once seated), the docent's "?" button that
   * opens the Rules Overview, and — for the host only — the gavel that
   * opens the Moderation modal.
   */
  export let onShowRules: () => void;
  export let onShowModeration: (() => void) | null = null;
  export let roomCode: string | null = null;
</script>

<footer
  class="salon-footer fixed inset-x-0 bottom-0 z-40 bg-gradient-to-b from-velvet to-ink"
>
  <div class="mx-auto flex h-12 w-full max-w-2xl items-center justify-between px-4">
    <p class="font-mono text-xs font-bold uppercase tracking-[0.18em] text-butter/90">
      {#if roomCode}
        Salon <span class="text-marigold">No. {roomCode}</span>
      {:else}
        Exquisite Telephone
      {/if}
    </p>
    <div class="flex items-center gap-1">
      {#if onShowModeration}
        <button
          type="button"
          class="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-butter/80 transition-colors hover:bg-marigold/15 hover:text-marigold focus-visible:text-marigold"
          aria-label="Moderation"
          on:click={onShowModeration}
        >
          <Gavel size={18} aria-hidden="true" />
        </button>
      {/if}
      <button
        type="button"
        class="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-butter/80 transition-colors hover:bg-marigold/15 hover:text-marigold focus-visible:text-marigold"
        aria-label="How this salon works"
        on:click={onShowRules}
      >
        <CircleHelp size={18} aria-hidden="true" />
      </button>
    </div>
  </div>
</footer>

<style>
  /* Double gilt rail: a bright hairline atop a dimmer one, echoing the
     Gilt Frame's outer + inset strokes without a heavy border. */
  .salon-footer {
    border-top: 1px solid theme('colors.marigold');
    box-shadow: inset 0 2px 0 rgba(245, 166, 35, 0.35);
  }
</style>
