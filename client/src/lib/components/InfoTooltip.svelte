<script lang="ts">
  import { CircleHelp } from '@lucide/svelte';

  /**
   * A small "(?)" affordance that reveals a short explanation on
   * click/tap (toggle, not hover-only — constitution Principle II,
   * mobile-friendly interaction). Used next to host settings whose
   * effect isn't self-explanatory.
   */
  export let label: string;
  export let explanation: string;

  let expanded = false;
</script>

<div class="flex flex-col gap-1">
  <div class="flex items-center gap-2">
    <!-- The setting's own label/control row renders here, so the "?"
         sits beside it while the explanation opens below the full row
         instead of squeezing the label into a narrower column. -->
    <slot />
    <button
      type="button"
      class="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full text-ink/60 hover:text-ink"
      aria-expanded={expanded}
      aria-label={label}
      on:click={() => (expanded = !expanded)}
    >
      <CircleHelp size={16} aria-hidden="true" />
    </button>
  </div>
  {#if expanded}
    <p class="text-xs text-ink/70">{explanation}</p>
  {/if}
</div>
