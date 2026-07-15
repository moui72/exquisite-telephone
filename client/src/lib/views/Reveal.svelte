<script lang="ts">
  import { parseDrawOps } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import DrawingCanvas from '../components/DrawingCanvas.svelte';
  import { exportBookToPng } from '../export/pngExport.js';

  /** Renders each Book's full ordered chain once Room.status == 'reveal' (ui.md Reveal View). */
  export let session: SessionStore = defaultSession;
  export let exportFn: typeof exportBookToPng = exportBookToPng;

  $: state = $session;
  $: room = state.room;
  $: isHost = room !== null && state.player !== null && state.player.id === room.hostPlayerId;

  function playerName(authorId: string): string {
    return room?.players.find((p) => p.id === authorId)?.name ?? authorId;
  }

  function handleSave(bookId: string) {
    if (!room) return;
    const book = room.books.find((b) => b.id === bookId);
    if (!book) return;

    const dataUrl = exportFn(book, room.players);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${playerName(book.originAuthorId)}-book.png`;
    link.click();
  }

  async function handleLeaveGame() {
    session.leaveGame();
  }

  async function handleEndGame() {
    await session.endGame();
  }

  async function handleVoteToPlayAgain() {
    await session.voteToPlayAgain();
  }

  async function handlePlayAgain() {
    await session.playAgain();
  }
</script>

<div class="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 p-6">
  <h1 class="text-2xl font-semibold text-slate-800">Reveal</h1>

  {#if room}
    <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-6">
      {#if isHost}
        <button
          type="button"
          class="rounded-md border px-4 py-2 text-sm font-medium text-slate-700"
          on:click={handleEndGame}
        >
          End game
        </button>
        <button
          type="button"
          class="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
          on:click={handlePlayAgain}
        >
          Play again
        </button>
        <span class="text-sm text-slate-500">
          {room.playAgainVotes.length} of {room.players.length} ready
        </span>
      {:else}
        <button
          type="button"
          class="rounded-md border px-4 py-2 text-sm font-medium text-slate-700"
          on:click={handleLeaveGame}
        >
          Leave game
        </button>
        <button
          type="button"
          class="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
          on:click={handleVoteToPlayAgain}
        >
          Vote to play again
        </button>
      {/if}
    </div>

    {#each room.books as book (book.id)}
      <section class="flex flex-col gap-4 border-b border-slate-200 pb-8">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-slate-500">
            {playerName(book.originAuthorId)}'s book
          </h2>
          <button
            type="button"
            class="rounded-md border px-3 py-1 text-sm font-medium text-slate-700"
            on:click={() => handleSave(book.id)}
          >
            Save as PNG
          </button>
        </div>
        {#each [...book.entries].sort((a, b) => a.position - b.position) as entry (entry.id)}
          <div class="flex flex-col gap-1">
            <p class="text-xs text-slate-400">{playerName(entry.authorId)}</p>
            {#if entry.type === 'text'}
              <p class="text-lg text-slate-900">{entry.content}</p>
            {:else}
              <DrawingCanvas ops={parseDrawOps(entry.content)} readOnly />
            {/if}
          </div>
        {/each}
      </section>
    {/each}
  {/if}
</div>
