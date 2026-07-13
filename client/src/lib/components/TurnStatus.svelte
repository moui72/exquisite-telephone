<script lang="ts">
  import { computeNextEntries } from '@exquisite-telephone/shared';
  import type { Room } from '@exquisite-telephone/shared';

  /**
   * "Pass the folded paper" turn-status indicator (ui.md Writing/Drawing
   * View): shows who's still working, never the content of what they're
   * writing or drawing.
   */
  export let room: Room;

  $: pendingAuthorIds = new Set(computeNextEntries(room).map((e) => e.authorId));
</script>

<ul class="flex flex-col gap-1">
  {#each room.players as player (player.id)}
    <li class="flex items-center justify-between text-sm">
      <span>{player.name}</span>
      {#if pendingAuthorIds.has(player.id)}
        <span class="text-amber-600">still working…</span>
      {:else}
        <span class="text-emerald-600">done</span>
      {/if}
    </li>
  {/each}
</ul>
