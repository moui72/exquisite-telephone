<script lang="ts">
  import { CircleHelp, Gavel } from '@lucide/svelte';
  import { APP_VERSION } from '../appVersion';

  /**
   * The Salon Footer — a slim bar fixed along the bottom of every view
   * (ui.md Visual Identity): the wine skirting of the gallery wall,
   * trimmed with a double gilt rail. Carries the house wordmark (or the
   * current salon's number once seated), the docent's "?" button that
   * opens the Rules Overview, and — for the host only — the gavel that
   * opens the Moderation modal.
   */
  export let onShowRules: () => void;
  export let onShowModeration: (() => void) | null = null;
  export let roomCode: string | null = null;
  /**
   * The frozen-room signal (ui.md Moderation Panel). Now that the
   * Moderation Panel is a modal the host must open, the host needs to see
   * that the salon can't continue *without* opening it — so the gavel
   * itself carries the indication. Purely presentational: this component
   * has no session/store access, and App.svelte derives the value.
   */
  export let nonContinuable: boolean = false;
</script>

<footer
  class="salon-footer fixed inset-x-0 bottom-0 z-40 bg-gradient-to-b from-wine to-ink"
>
  <div class="mx-auto flex h-12 w-full max-w-2xl items-center justify-between px-4">
    <p class="font-mono text-xs font-bold uppercase tracking-[0.18em] text-champagne/90">
      {#if roomCode}
        Salon <span class="text-gold">No. {roomCode}</span>
      {:else}
        Exquisite Telephone
      {/if}
    </p>
    <div class="flex items-center gap-1">
      {#if onShowModeration}
        <button
          type="button"
          class="relative inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-champagne/80 transition-colors hover:bg-gold/15 hover:text-gold focus-visible:text-gold"
          aria-label={nonContinuable ? 'Moderation — this salon cannot continue' : 'Moderation'}
          on:click={onShowModeration}
        >
          <Gavel size={18} aria-hidden="true" />
          {#if nonContinuable}
            <!-- Not colour alone (Baseline Accessibility): a distinct glyph
                 badge rides the gavel, so the frozen state survives both
                 monochrome rendering and colour-vision differences. -->
            <span
              data-frozen-mark
              aria-hidden="true"
              class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sapphire text-[9px] font-bold leading-none text-white"
              >!</span
            >
          {/if}
        </button>
      {/if}
      <button
        type="button"
        class="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-champagne/80 transition-colors hover:bg-gold/15 hover:text-gold focus-visible:text-gold"
        aria-label="How this salon works"
        on:click={onShowRules}
      >
        <CircleHelp size={18} aria-hidden="true" />
      </button>
      <!-- The build's channel-aware version string ([[ui]] Salon Footer):
           the stamped-ticket role wants the utility Space Mono (font-mono)
           face, small and muted, trailing the rail after the controls. Not
           a link or a control — just readable text a player can read off
           when reporting an issue. -->
      <span class="ml-1 font-mono text-xs tabular-nums tracking-tight text-champagne/40">
        {APP_VERSION}
      </span>
    </div>
  </div>
</footer>

<style>
  /* Double gilt rail: a bright hairline atop a dimmer one, echoing the
     Gilt Frame's outer + inset strokes without a heavy border. On the
     Boudoir bordeaux ground the footer is dark-on-dark, so this gold rail
     is what separates the skirting from the wall — kept a touch stronger
     than a hairline for that reason. */
  .salon-footer {
    border-top: 1px solid theme('colors.gold');
    box-shadow: inset 0 2px 0 rgba(208, 168, 78, 0.5);
  }
</style>
