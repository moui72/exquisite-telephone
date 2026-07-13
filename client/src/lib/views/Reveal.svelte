<script lang="ts">
  import { parseStrokes } from '@exquisite-telephone/shared';
  import type { Room } from '@exquisite-telephone/shared';
  import DrawingCanvas from '../components/DrawingCanvas.svelte';

  /** Renders each Book's full ordered chain once Room.status == 'reveal' (ui.md Reveal View). */
  export let room: Room;

  function playerName(authorId: string): string {
    return room.players.find((p) => p.id === authorId)?.name ?? authorId;
  }
</script>

<div class="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 p-6">
  <h1 class="text-2xl font-semibold text-slate-800">Reveal</h1>

  {#each room.books as book (book.id)}
    <section class="flex flex-col gap-4 border-b border-slate-200 pb-8">
      <h2 class="text-sm font-medium text-slate-500">
        {playerName(book.originAuthorId)}'s book
      </h2>
      {#each [...book.entries].sort((a, b) => a.position - b.position) as entry (entry.id)}
        <div class="flex flex-col gap-1">
          <p class="text-xs text-slate-400">{playerName(entry.authorId)}</p>
          {#if entry.type === 'text'}
            <p class="text-lg text-slate-900">{entry.content}</p>
          {:else}
            <DrawingCanvas strokes={parseStrokes(entry.content)} readOnly />
          {/if}
        </div>
      {/each}
    </section>
  {/each}
</div>
