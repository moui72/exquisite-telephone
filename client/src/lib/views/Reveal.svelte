<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { parseDrawOps } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import DrawingCanvas from '../components/DrawingCanvas.svelte';
  import ModerationPanel from '../components/ModerationPanel.svelte';
  import { exportBookToPng } from '../export/pngExport.js';
  import { generateCoverArt } from '../reveal/coverArt.js';

  /**
   * Renders Room.status == 'reveal' (ui.md Reveal View): an animated,
   * one-book-at-a-time viewer is the default — a book's cover (author
   * name + deterministic generated art) shown for a delay, then entries
   * revealed a couple at a time on a timer — settling into a static
   * full-grid mode (every book's complete chain) once every book has
   * been shown, by auto-advance, "show everything", or manual nav.
   */
  export let session: SessionStore = defaultSession;
  export let exportFn: typeof exportBookToPng = exportBookToPng;

  /** Cover shown for 2.5s, then entries reveal 2-at-a-time every 4s (ui.md Reveal View). */
  const COVER_DELAY_MS = 2500;
  const TICK_MS = 4000;
  const ENTRIES_PER_TICK = 2;

  $: state = $session;
  $: room = state.room;
  $: isHost = room !== null && state.player !== null && state.player.id === room.hostPlayerId;

  let currentBookIndex = 0;
  let revealedCount = 0;
  let showEverything = false;

  // Timer driving auto-advance (constitution Quality Standards — touch/
  // timer cleanup): registered in onMount, cleared in onDestroy, matching
  // WritingDrawing.svelte's existing countdown-timer pattern. A plain
  // `setTimeout` drives the one-off 2.5s cover delay; a `setInterval`
  // takes over for the repeating 4s reveal ticks thereafter. Manual
  // controls reset this timing so an auto-tick doesn't immediately
  // override a manual action.
  let timerHandle: ReturnType<typeof setTimeout> | undefined;
  let timerIsInterval = false;

  function clearTimer() {
    if (timerHandle !== undefined) {
      if (timerIsInterval) {
        clearInterval(timerHandle);
      } else {
        clearTimeout(timerHandle);
      }
      timerHandle = undefined;
    }
  }

  function startCoverDelay() {
    clearTimer();
    timerIsInterval = false;
    timerHandle = setTimeout(startTickInterval, COVER_DELAY_MS);
  }

  function startTickInterval() {
    clearTimer();
    timerIsInterval = true;
    timerHandle = setInterval(revealNext, TICK_MS);
  }

  function revealNext() {
    if (!room) return;
    const book = room.books[currentBookIndex];
    if (!book) return;

    const total = book.entries.length;
    revealedCount = Math.min(revealedCount + ENTRIES_PER_TICK, total);

    if (revealedCount >= total) {
      advanceToNextBookOrFinish();
    }
  }

  function advanceToNextBookOrFinish() {
    if (!room) return;
    if (currentBookIndex < room.books.length - 1) {
      currentBookIndex += 1;
      revealedCount = 0;
      startCoverDelay();
    } else {
      showEverything = true;
      clearTimer();
    }
  }

  function goToBook(index: number) {
    if (!room) return;
    const clamped = Math.max(0, Math.min(index, room.books.length - 1));
    currentBookIndex = clamped;
    revealedCount = 0;
    startCoverDelay();
  }

  function handlePrevious() {
    goToBook(currentBookIndex - 1);
  }

  function handleNext() {
    goToBook(currentBookIndex + 1);
  }

  function handleShowEverything() {
    showEverything = true;
    clearTimer();
  }

  onMount(() => {
    if (room && room.books.length > 0) {
      startCoverDelay();
    }
  });
  onDestroy(() => {
    clearTimer();
  });

  $: currentBook = room ? (room.books[currentBookIndex] ?? null) : null;
  $: coverArt = currentBook ? generateCoverArt(currentBook.originAuthorId) : null;
  $: visibleEntries = currentBook
    ? [...currentBook.entries].sort((a, b) => a.position - b.position).slice(0, revealedCount)
    : [];

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
    <ModerationPanel {session} />

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

    {#if !showEverything && currentBook}
      <section class="flex flex-col gap-4 border-b border-slate-200 pb-8">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-slate-500">
            {playerName(currentBook.originAuthorId)}'s book
          </h2>
          <button
            type="button"
            class="rounded-md border px-3 py-1 text-sm font-medium text-slate-700"
            on:click={() => handleSave(currentBook.id)}
          >
            Save as PNG
          </button>
        </div>

        {#if revealedCount === 0}
          <div class="flex flex-col items-center gap-4 py-8">
            <svg
              viewBox="0 0 100 100"
              role="img"
              aria-label="cover art"
              class="h-48 w-48 rounded-lg bg-slate-100"
            >
              {#if coverArt}
                {#each coverArt.shapes as shape, i (i)}
                  <circle
                    cx={shape.cx}
                    cy={shape.cy}
                    r={shape.r}
                    fill="hsl({shape.hue}, {shape.saturation}%, {shape.lightness}%)"
                    opacity="0.85"
                  />
                {/each}
              {/if}
            </svg>
          </div>
        {:else}
          {#each visibleEntries as entry (entry.id)}
            <div class="flex flex-col gap-1">
              <p class="text-xs text-slate-400">{playerName(entry.authorId)}</p>
              {#if entry.type === 'text'}
                <p class="text-lg text-slate-900">{entry.content}</p>
              {:else}
                <DrawingCanvas ops={parseDrawOps(entry.content)} readOnly />
              {/if}
            </div>
          {/each}
        {/if}
      </section>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-md border px-3 py-1 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentBookIndex === 0}
          on:click={handlePrevious}
        >
          Previous
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-1 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentBookIndex >= room.books.length - 1}
          on:click={handleNext}
        >
          Next
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-1 text-sm font-medium text-slate-700"
          on:click={handleShowEverything}
        >
          Show everything
        </button>
      </div>
    {:else}
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
  {/if}
</div>
