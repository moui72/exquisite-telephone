<script lang="ts">
  import { activePlayers, computeNextEntries } from '@exquisite-telephone/shared';
  import type { Room } from '@exquisite-telephone/shared';

  /**
   * "Pass the folded paper" turn-status indicator (ui.md Writing/Drawing
   * View): shows who's still working, never the content of what they're
   * writing or drawing.
   */
  export let room: Room;

  $: pendingAuthorIds = new Set(computeNextEntries(room).map((e) => e.authorId));
</script>

<!-- Framed as a champagne placard so the status list reads on parchment,
     not on the bordeaux damask wall (redesign 2026-07-22). -->
<ul class="plaque flex flex-col gap-1 px-4 py-3">
  {#each activePlayers(room) as player (player.id)}
    <li class="flex items-center justify-between text-sm text-ink">
      <span>{player.name}</span>
      {#if pendingAuthorIds.has(player.id)}
        <span class="text-gold">at their easel…</span>
      {:else}
        <span class="text-emerald">piece presented</span>
      {/if}
    </li>
  {/each}
</ul>
