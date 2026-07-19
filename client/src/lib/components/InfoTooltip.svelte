<script lang="ts">
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

<span class="inline-flex items-center gap-1">
  <button
    type="button"
    class="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-marigold/60 text-xs font-medium text-ink/70"
    aria-expanded={expanded}
    aria-label={label}
    on:click={() => (expanded = !expanded)}
  >
    (?)
  </button>
  {#if expanded}
    <p class="text-xs text-ink/70">{explanation}</p>
  {/if}
</span>
