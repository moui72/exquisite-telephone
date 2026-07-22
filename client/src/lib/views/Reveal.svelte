<script lang="ts">
  import { parseDrawOps } from '@exquisite-telephone/shared';
  import type { Book, Entry } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import { ChevronLeft, ChevronRight, DoorOpen, Download, Eye, Repeat, RotateCcw, X } from '@lucide/svelte';
  import DrawingCanvas from '../components/DrawingCanvas.svelte';
  import GiltFrame from '../components/GiltFrame.svelte';
  import { exportBookToPng } from '../export/pngExport.js';
  import { generateCoverArt } from '../reveal/coverArt.js';
  import { coverTemplateBackground } from '../covers/templateArt.js';
  import { SvelteSet } from 'svelte/reactivity';

  /**
   * Renders Room.status == 'reveal' (ui.md Reveal View): a self-guided
   * card grid — one cover-art card per book — where clicking a card opens
   * a per-book modal the viewer pages through at their own pace (click and
   * keyboard). Page 1 shows the origin prompt in isolation; each later
   * page shows the previous item above the newly revealed one; the last
   * page offers save-to-PNG, and a "reveal all" control shows the whole
   * chain at once. Page position is kept per book, per viewer, client-local
   * (closing preserves it, reopening resumes). Read state is shared: a card
   * shows "read by" (Room.bookReads) and "being read by"
   * (Room.currentlyReading) badges, and opening/closing the modal emits
   * setReadingBook so other clients see it live.
   */
  export let session: SessionStore = defaultSession;
  export let exportFn: typeof exportBookToPng = exportBookToPng;

  $: state = $session;
  $: room = state.room;
  $: isHost = room !== null && state.player !== null && state.player.id === room.hostPlayerId;

  // Per-viewer, client-local state (never synced): which book's modal is
  // open, the kept page position per book, whether reveal-all is showing,
  // and which cards this viewer has already opened (for dimming).
  let openBookId: string | null = null;
  let pageByBook: Record<string, number> = {};
  let revealAll = false;
  let viewedBooks = new SvelteSet<string>();

  function sortedEntries(book: Book): Entry[] {
    return [...book.entries].sort((a, b) => a.position - b.position);
  }

  function playerName(authorId: string): string {
    return room?.players.find((p) => p.id === authorId)?.name ?? authorId;
  }

  /** Mock-formal exhibit title incorporating the origin author's name (ui.md Reveal View). */
  function exhibitCaption(book: Book, index: number): string {
    return `Exhibit No. ${index + 1} — Untitled, Mixed Media, ${playerName(book.originAuthorId)}`;
  }

  /** Deduped player names who completed a read of this book (Room.bookReads). */
  function readByNames(bookId: string): string[] {
    return (room?.bookReads[bookId] ?? []).map(playerName);
  }

  /** Player names with this book currently open in their modal (Room.currentlyReading). */
  function beingReadByNames(bookId: string): string[] {
    if (!room) return [];
    return Object.entries(room.currentlyReading)
      .filter(([, openId]) => openId === bookId)
      .map(([playerId]) => playerName(playerId));
  }

  $: openBook = room && openBookId ? (room.books.find((b) => b.id === openBookId) ?? null) : null;
  $: openEntries = openBook ? sortedEntries(openBook) : [];
  $: lastPageIndex = Math.max(0, openEntries.length - 1);
  $: currentPage = openBookId
    ? Math.min(pageByBook[openBookId] ?? 0, lastPageIndex)
    : 0;
  $: onLastPage = currentPage >= lastPageIndex;

  function openBookModal(bookId: string) {
    if (!(bookId in pageByBook)) {
      pageByBook = { ...pageByBook, [bookId]: 0 };
    }
    viewedBooks.add(bookId);
    revealAll = false;
    openBookId = bookId;
    void session.setReadingBook(bookId);
  }

  function closeModal() {
    if (openBookId === null) return;
    void session.setReadingBook(null);
    openBookId = null;
    revealAll = false;
  }

  function setPage(page: number) {
    if (openBookId === null) return;
    const clamped = Math.max(0, Math.min(page, lastPageIndex));
    pageByBook = { ...pageByBook, [openBookId]: clamped };
  }

  function nextPage() {
    setPage(currentPage + 1);
  }

  function previousPage() {
    setPage(currentPage - 1);
  }

  function backToStart() {
    revealAll = false;
    setPage(0);
  }

  function handleRevealAll() {
    revealAll = true;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (openBookId === null) return;
    if (event.key === 'Escape') {
      closeModal();
    } else if (!revealAll && event.key === 'ArrowRight') {
      event.preventDefault();
      nextPage();
    } else if (!revealAll && event.key === 'ArrowLeft') {
      event.preventDefault();
      previousPage();
    }
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

  async function handleVoteToPlayAgain() {
    await session.voteToPlayAgain();
  }

  // Host unread-books warning (ui.md Reveal View — F003). A client-side,
  // per-book confirm before "End game" / "Play again": no server change,
  // and a force-through path emits the action anyway (the small-game
  // override pattern). Derived purely from the shared read state.
  function bookName(bookId: string): string {
    const book = room?.books.find((b) => b.id === bookId);
    return book ? `${playerName(book.originAuthorId)}'s book` : bookId;
  }

  $: unreadWarning = ((): string | null => {
    if (!room) return null;
    const unread = room.books.filter((b) => (room.bookReads[b.id] ?? []).length === 0);
    if (unread.length > 0) {
      const names = unread.map((b) => bookName(b.id)).join(', ');
      return `${names} ${unread.length === 1 ? 'has' : 'have'} not been read by anyone yet.`;
    }
    const openIds = [...new Set(Object.values(room.currentlyReading))];
    if (openIds.length > 0) {
      const names = openIds.map((id) => bookName(id)).join(', ');
      return `Every book has been read, but ${names} ${openIds.length === 1 ? 'is' : 'are'} still open.`;
    }
    return null;
  })();

  let pendingAction: 'end' | 'playAgain' | null = null;

  function runHostAction(action: 'end' | 'playAgain') {
    if (action === 'end') {
      void session.endGame();
    } else {
      void session.playAgain();
    }
  }

  function requestHostAction(action: 'end' | 'playAgain') {
    if (unreadWarning) {
      pendingAction = action;
      return;
    }
    runHostAction(action);
  }

  function forceHostAction() {
    if (pendingAction) {
      runHostAction(pendingAction);
    }
    pendingAction = null;
  }

  function cancelHostAction() {
    pendingAction = null;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 p-6">
  <div class="flex flex-col items-center gap-1 text-center">
    <h1
      class="bg-gradient-to-b from-marigold via-[#FFDD94] to-marigold bg-clip-text text-4xl
        font-title tracking-wide text-transparent drop-shadow-[0_1px_0_rgba(46,26,71,0.35)]
        [-webkit-text-stroke:1.5px_theme(colors.ink)] [paint-order:stroke_fill]
        sm:text-5xl"
    >
      The Gallery Opens
    </h1>
    <p class="text-sm text-ink/60">Every book, unveiled. Choose a work to view at your leisure.</p>
  </div>

  {#if room}
    <div class="flex flex-wrap items-center gap-3 border-b border-marigold/30 pb-6">
      {#if isHost}
        <button
          type="button"
          class="rounded-md border border-marigold/60 bg-butter px-4 py-2 text-sm font-medium text-ink"
          on:click={() => requestHostAction('end')}
        >
          <span class="inline-flex items-center gap-1.5">
            <DoorOpen size={16} aria-hidden="true" />
            Close the Exhibition
          </span>
        </button>
        <button
          type="button"
          class="rounded-md bg-grass px-4 py-2 text-sm font-medium text-white"
          on:click={() => requestHostAction('playAgain')}
        >
          <span class="inline-flex items-center gap-1.5">
            <Repeat size={16} aria-hidden="true" />
            Stage an Encore
          </span>
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
          <span class="inline-flex items-center gap-1.5">
            <DoorOpen size={16} aria-hidden="true" />
            Depart the Salon
          </span>
        </button>
        <button
          type="button"
          class="rounded-md bg-grass px-4 py-2 text-sm font-medium text-white"
          on:click={handleVoteToPlayAgain}
        >
          <span class="inline-flex items-center gap-1.5">
            <Repeat size={16} aria-hidden="true" />
            Vote for an Encore
          </span>
        </button>
      {/if}
    </div>

    <!-- Card grid: one cover-art card per book. -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each room.books as book, index (book.id)}
        {@const art = generateCoverArt(book.originAuthorId)}
        {@const readers = readByNames(book.id)}
        {@const beingRead = beingReadByNames(book.id)}
        <div class="flex flex-col gap-2">
          <button
            type="button"
            class="group flex flex-col gap-3 rounded-lg border-4 border-marigold bg-butter p-3 text-left shadow-lg transition-opacity"
            class:opacity-60={viewedBooks.has(book.id)}
            aria-label={`Open ${playerName(book.originAuthorId)}'s book`}
            on:click={() => openBookModal(book.id)}
          >
            {#if book.cover}
              <!-- The card face is the origin author's decorated cover
                   (ui.md Reveal View): the drawn ops replayed read-only over
                   the coverTemplate background, if any (parity with the
                   easel — the ink stays on top and legible). -->
              {@const templateBg = coverTemplateBackground(book.coverTemplate ?? null)}
              <div class="relative flex h-40 w-full items-center justify-center overflow-hidden rounded bg-white">
                {#if templateBg}
                  <div
                    data-cover-template={book.coverTemplate}
                    aria-hidden="true"
                    class="pointer-events-none absolute inset-0 opacity-20"
                    style="background: {templateBg};"
                  ></div>
                {/if}
                <DrawingCanvas ops={book.cover} readOnly transparent={templateBg !== ''} />
              </div>
            {:else}
              <svg
                viewBox="0 0 100 100"
                role="img"
                aria-label="cover art"
                class="h-40 w-full rounded bg-butter"
              >
                {#each art.shapes as shape, i (i)}
                  <circle
                    cx={shape.cx}
                    cy={shape.cy}
                    r={shape.r}
                    fill="hsl({shape.hue}, {shape.saturation}%, {shape.lightness}%)"
                    opacity="0.85"
                  />
                {/each}
              </svg>
            {/if}
            <p class="font-mono text-xs text-ink/80">{exhibitCaption(book, index)}</p>
          </button>

          <div class="flex flex-col gap-1">
            {#if beingRead.length > 0}
              <p class="text-xs text-grass">
                Being read by {beingRead.join(', ')}
              </p>
            {/if}
            {#if readers.length > 0}
              <p class="text-xs text-ink/60">
                Read by {readers.join(', ')}
              </p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if pendingAction && unreadWarning}
    <div
      class="fixed inset-0 z-30 flex items-center justify-center bg-velvet/70 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label="Unread books warning"
    >
      <div class="flex w-full max-w-md flex-col gap-4 rounded-lg border-4 border-marigold bg-butter p-5">
        <h2 class="font-title text-lg text-ink">Before the doors close…</h2>
        <p class="text-sm text-ink/80">{unreadWarning}</p>
        <p class="text-sm text-ink/60">
          {pendingAction === 'end'
            ? 'Close the exhibition anyway?'
            : 'Stage an encore anyway?'}
        </p>
        <div class="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="rounded-md border border-marigold/60 bg-butter px-4 py-2 text-sm font-medium text-ink"
            on:click={cancelHostAction}
          >
            Keep viewing
          </button>
          <button
            type="button"
            class="rounded-md bg-bubblegum px-4 py-2 text-sm font-medium text-white"
            on:click={forceHostAction}
          >
            {pendingAction === 'end' ? 'Close anyway' : 'Encore anyway'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if room && openBook}
    <!-- Per-book modal: self-guided paging. -->
    <div
      class="fixed inset-0 z-20 flex items-center justify-center bg-velvet/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${playerName(openBook.originAuthorId)}'s book`}
    >
      <div class="flex max-h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto">
        <GiltFrame caption={exhibitCaption(openBook, room.books.indexOf(openBook))}>
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-ink/60">
              {playerName(openBook.originAuthorId)}'s book
            </h2>
            <button
              type="button"
              class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink"
              aria-label="Close book"
              on:click={closeModal}
            >
              <span class="inline-flex items-center gap-1.5">
                <X size={14} aria-hidden="true" />
                Close
              </span>
            </button>
          </div>

          {#if revealAll}
            <div class="flex flex-col gap-4 py-2">
              {#each openEntries as entry (entry.id)}
                <div class="flex flex-col gap-1">
                  <p class="text-xs text-ink/45">{playerName(entry.authorId)}</p>
                  {#if entry.type === 'text'}
                    <p class="text-lg text-ink">{entry.content}</p>
                  {:else}
                    <DrawingCanvas ops={parseDrawOps(entry.content)} readOnly />
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            {#key currentPage}
              <div class="page-turn flex flex-col gap-4 py-2">
                {#if currentPage > 0}
                  {@const prev = openEntries[currentPage - 1]}
                  {#if prev}
                    <div class="flex flex-col gap-1 opacity-70">
                      <p class="text-xs text-ink/45">{playerName(prev.authorId)}</p>
                      {#if prev.type === 'text'}
                        <p class="text-lg text-ink">{prev.content}</p>
                      {:else}
                        <DrawingCanvas ops={parseDrawOps(prev.content)} readOnly />
                      {/if}
                    </div>
                    <p class="text-center text-xs text-marigold">↓ became ↓</p>
                  {/if}
                {/if}
                {#if openEntries[currentPage]}
                  {@const entry = openEntries[currentPage]}
                  <div class="flex flex-col gap-1">
                    <p class="text-xs text-ink/45">{playerName(entry.authorId)}</p>
                    {#if entry.type === 'text'}
                      <p class="text-lg text-ink">{entry.content}</p>
                    {:else}
                      <DrawingCanvas ops={parseDrawOps(entry.content)} readOnly />
                    {/if}
                  </div>
                {/if}
              </div>
            {/key}
          {/if}
        </GiltFrame>

        <div class="flex flex-wrap items-center gap-3">
          {#if !revealAll}
            <button
              type="button"
              class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage === 0}
              on:click={previousPage}
            >
              <span class="inline-flex items-center gap-1">
                <ChevronLeft size={16} aria-hidden="true" />
                Previous
              </span>
            </button>
            <button
              type="button"
              class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
              disabled={onLastPage}
              on:click={nextPage}
            >
              <span class="inline-flex items-center gap-1">
                Next
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            </button>
            <span class="font-mono text-xs text-ink/60">
              Page {currentPage + 1} of {openEntries.length}
            </span>
          {/if}
          <button
            type="button"
            class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink"
            on:click={backToStart}
          >
            <span class="inline-flex items-center gap-1.5">
              <RotateCcw size={16} aria-hidden="true" />
              Back to start
            </span>
          </button>
          <button
            type="button"
            class="rounded-md border border-marigold/60 bg-butter px-3 py-1 text-sm font-medium text-ink"
            on:click={handleRevealAll}
          >
            <span class="inline-flex items-center gap-1.5">
              <Eye size={16} aria-hidden="true" />
              Reveal all
            </span>
          </button>
          {#if revealAll || onLastPage}
            <button
              type="button"
              class="rounded-md bg-marigold px-3 py-1 text-sm font-medium text-ink"
              on:click={() => openBook && handleSave(openBook.id)}
            >
              <span class="inline-flex items-center gap-1.5">
                <Download size={14} aria-hidden="true" />
                Preserve as Keepsake
              </span>
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .page-turn {
    animation: page-turn 0.28s ease-out;
  }

  @keyframes page-turn {
    from {
      opacity: 0;
      transform: translateX(1.5rem);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
