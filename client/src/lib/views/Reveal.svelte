<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { parseDrawOps } from '@exquisite-telephone/shared';
  import type { Book } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import DrawingCanvas from '../components/DrawingCanvas.svelte';
  import ModerationPanel from '../components/ModerationPanel.svelte';
  import GiltFrame from '../components/GiltFrame.svelte';
  import { exportBookToPng } from '../export/pngExport.js';
  import { generateCoverArt } from '../reveal/coverArt.js';
  import { prefersReducedMotion } from '../stores/prefersReducedMotion.js';

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

  /** How often the clock-derived position is recomputed while auto-advancing. */
  const RECOMPUTE_INTERVAL_MS = 250;

  $: state = $session;
  $: room = state.room;
  $: isHost = room !== null && state.player !== null && state.player.id === room.hostPlayerId;

  /**
   * Pure function of elapsed time since the reveal sequence's shared
   * start — datamodel.md's Reveal pacing rule: every client derives the
   * same book index / revealed-entry count from the same
   * `Room.revealStartedAt` and the same fixed cadence constants, rather
   * than incrementing local counters, so clock drift and mount-time
   * differences between clients can't cause divergence.
   */
  function computeRevealPosition(
    books: Book[],
    elapsedMs: number,
  ): { bookIndex: number; revealedCount: number; showEverything: boolean } {
    let remaining = Math.max(0, elapsedMs);

    for (let i = 0; i < books.length; i++) {
      const total = books[i]!.entries.length;

      if (remaining < COVER_DELAY_MS) {
        return { bookIndex: i, revealedCount: 0, showEverything: false };
      }

      const afterCover = remaining - COVER_DELAY_MS;
      const ticks = Math.floor(afterCover / TICK_MS);
      const revealed = Math.min(ticks * ENTRIES_PER_TICK, total);

      if (revealed < total) {
        return { bookIndex: i, revealedCount: revealed, showEverything: false };
      }

      // This book is fully revealed; consume the time it took to fully
      // reveal it and move on to considering the next book.
      const ticksNeededForFull = Math.ceil(total / ENTRIES_PER_TICK);
      const fullBookDuration = COVER_DELAY_MS + ticksNeededForFull * TICK_MS;
      remaining -= fullBookDuration;

      if (i === books.length - 1) {
        return { bookIndex: i, revealedCount: total, showEverything: true };
      }
    }

    // No books at all.
    return { bookIndex: 0, revealedCount: 0, showEverything: true };
  }

  // Manual previous/next/skip controls override the clock-derived
  // position locally (ui.md Reveal View) — once set, these win over the
  // auto-computed position for the rest of this component's lifetime,
  // or until reset by another manual action.
  let manualBookIndex: number | null = null;
  let manualRevealedCount: number | null = null;
  let manualShowEverything = false;

  // Recomputation driver (constitution Quality Standards — touch/timer
  // cleanup): registered in onMount, cleared in onDestroy. It only
  // triggers periodic re-renders of the clock-derived position — the
  // position itself is computed fresh each time from `Room.revealStartedAt`,
  // not incremented.
  let recomputeHandle: ReturnType<typeof setInterval> | undefined;
  let nowTick = Date.now();

  // Defensive fallback: `Room.revealStartedAt` should always be set once
  // `status === 'reveal'`, but if it's ever null, fall back to this
  // client's own mount time so the view still degrades gracefully
  // instead of producing NaN/garbage positions.
  let mountFallbackStart = Date.now();

  $: effectiveStart = room?.revealStartedAt ?? mountFallbackStart;
  $: elapsedMs = nowTick - effectiveStart;
  $: derived = room ? computeRevealPosition(room.books, elapsedMs) : null;

  $: currentBookIndex = manualBookIndex ?? derived?.bookIndex ?? 0;
  $: revealedCount = manualRevealedCount ?? derived?.revealedCount ?? 0;
  $: showEverything = manualShowEverything || (derived?.showEverything ?? false);

  function goToBook(index: number) {
    if (!room) return;
    const clamped = Math.max(0, Math.min(index, room.books.length - 1));
    manualBookIndex = clamped;
    manualRevealedCount = 0;
  }

  function handlePrevious() {
    goToBook(currentBookIndex - 1);
  }

  function handleNext() {
    goToBook(currentBookIndex + 1);
  }

  function handleShowEverything() {
    manualShowEverything = true;
  }

  onMount(() => {
    nowTick = Date.now();
    recomputeHandle = setInterval(() => {
      nowTick = Date.now();
    }, RECOMPUTE_INTERVAL_MS);
  });
  onDestroy(() => {
    if (recomputeHandle !== undefined) {
      clearInterval(recomputeHandle);
    }
  });

  $: currentBook = room ? (room.books[currentBookIndex] ?? null) : null;
  $: coverArt = currentBook ? generateCoverArt(currentBook.originAuthorId) : null;
  $: visibleEntries = currentBook
    ? [...currentBook.entries].sort((a, b) => a.position - b.position).slice(0, revealedCount)
    : [];

  function playerName(authorId: string): string {
    return room?.players.find((p) => p.id === authorId)?.name ?? authorId;
  }

  /** Mock-formal exhibit title incorporating the origin author's name (ui.md Reveal View). */
  function exhibitCaption(book: Book, index: number): string {
    return `Exhibit No. ${index + 1} — Untitled, Mixed Media, ${playerName(book.originAuthorId)}`;
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
  <h1 class="text-2xl font-semibold font-display text-ink">Reveal</h1>

  {#if room}
    <ModerationPanel {session} />

    <div class="flex flex-wrap items-center gap-3 border-b border-marigold/30 pb-6">
      {#if isHost}
        <button
          type="button"
          class="rounded-md border border-marigold/60 bg-butter px-4 py-2 text-sm font-medium text-ink"
          on:click={handleEndGame}
        >
          Close the Exhibition
        </button>
        <button
          type="button"
          class="rounded-md bg-grass px-4 py-2 text-sm font-medium text-white"
          on:click={handlePlayAgain}
        >
          Stage an Encore
        </button>
        <span class="text-sm text-ink/60">
          {room.playAgainVotes.length} of {room.players.length} guests ready for an encore
        </span>
      {:else}
        <button
          type="button"
          class="rounded-md border border-marigold/60 bg-butter px-4 py-2 text-sm font-medium text-ink"
          on:click={handleLeaveGame}
        >
          Depart the Salon
        </button>
        <button
          type="button"
          class="rounded-md bg-grass px-4 py-2 text-sm font-medium text-white"
          on:click={handleVoteToPlayAgain}
        >
          Vote for an Encore
        </button>
      {/if}
    </div>

    {#if !showEverything && currentBook}
      <section
        class="flex flex-col gap-4 border-b border-marigold/30 pb-8"
        class:reveal-spotlight={!$prefersReducedMotion}
      >
        <GiltFrame caption={exhibitCaption(currentBook, currentBookIndex)}>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium text-ink/60">
              {playerName(currentBook.originAuthorId)}'s book
            </h2>
            <button
              type="button"
              class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink"
              on:click={() => handleSave(currentBook.id)}
            >
              Preserve as Keepsake
            </button>
          </div>

          {#if revealedCount === 0}
            <div class="flex flex-col items-center gap-4 py-8">
              <svg
                viewBox="0 0 100 100"
                role="img"
                aria-label="cover art"
                class="h-48 w-48 rounded-lg bg-butter"
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
                <p class="text-xs text-ink/45">{playerName(entry.authorId)}</p>
                {#if entry.type === 'text'}
                  <p class="text-lg text-ink">{entry.content}</p>
                {:else}
                  <DrawingCanvas ops={parseDrawOps(entry.content)} readOnly />
                {/if}
              </div>
            {/each}
          {/if}
        </GiltFrame>
      </section>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentBookIndex === 0}
          on:click={handlePrevious}
        >
          Previous
        </button>
        <button
          type="button"
          class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentBookIndex >= room.books.length - 1}
          on:click={handleNext}
        >
          Next
        </button>
        <button
          type="button"
          class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink"
          on:click={handleShowEverything}
        >
          Show everything
        </button>
      </div>
    {:else}
      {#each room.books as book, index (book.id)}
        <section class="flex flex-col gap-4 border-b border-marigold/30 pb-8">
          <GiltFrame caption={exhibitCaption(book, index)}>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-medium text-ink/60">
                {playerName(book.originAuthorId)}'s book
              </h2>
              <button
                type="button"
                class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink"
                on:click={() => handleSave(book.id)}
              >
                Preserve as Keepsake
              </button>
            </div>
            {#each [...book.entries].sort((a, b) => a.position - b.position) as entry (entry.id)}
              <div class="flex flex-col gap-1">
                <p class="text-xs text-ink/45">{playerName(entry.authorId)}</p>
                {#if entry.type === 'text'}
                  <p class="text-lg text-ink">{entry.content}</p>
                {:else}
                  <DrawingCanvas ops={parseDrawOps(entry.content)} readOnly />
                {/if}
              </div>
            {/each}
          </GiltFrame>
        </section>
      {/each}
    {/if}
  {/if}
</div>
