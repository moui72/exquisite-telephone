<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { activePlayers } from '@exquisite-telephone/shared';
  import type { DrawOps } from '@exquisite-telephone/shared';
  import { Send } from '@lucide/svelte';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import { coverDraft, draftFor } from '../stores/coverDraft.js';
  import CoverDecorationCanvas from '../components/CoverDecorationCanvas.svelte';

  /**
   * The dedicated decoration screen for `Room.status === 'decorating'`
   * (ui.md Cover Decoration — "The decoration window"). After the last
   * entry completes the game, every active player gets a final 2-minute
   * window to finish their own book's cover: the cover canvas, a shared
   * countdown derived on every client from `Room.decorationWindowStartedAt`,
   * a "Present your cover" submit-early control, and a submitted-count
   * readout from `Room.coverSubmissions`. The client never advances itself
   * — Reveal opens for everyone when the server drives the `status` change
   * (all-submitted early close, or the sweep's expiry).
   */
  export let session: SessionStore = defaultSession;

  const WINDOW_MS = 120_000;

  let presented = false;

  // The shared client-local draft for this player's own book (ui.md Cover
  // Decoration): the same draft edited during the writing-phase waiting
  // state, carried across the view swap by book id.
  $: draft = draftFor($coverDraft, myBook?.id ?? null);

  function handleTemplateChange(id: string | null) {
    if (myBook) coverDraft.setTemplate(myBook.id, id);
  }

  // Ticks the shared countdown once a second (registered/torn down across
  // the component lifecycle — constitution touch/timer cleanup standard).
  let now = Date.now();
  let tickInterval: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    tickInterval = setInterval(() => {
      now = Date.now();
    }, 1000);
  });
  onDestroy(() => {
    if (tickInterval) clearInterval(tickInterval);
  });

  $: state = $session;
  $: room = state.room;
  $: player = state.player;
  $: myBook =
    room && player ? (room.books.find((b) => b.originAuthorId === player!.id) ?? null) : null;

  $: startedAt = room?.decorationWindowStartedAt ?? null;
  $: remainingMs = startedAt !== null ? Math.max(0, startedAt + WINDOW_MS - now) : 0;
  $: countdownLabel = formatCountdown(remainingMs);

  $: submittedCount = room?.coverSubmissions?.length ?? 0;
  $: activeCount = room ? activePlayers(room).length : 0;

  function formatCountdown(msRemaining: number): string {
    const totalSeconds = Math.floor(msRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function handleOpsChange(ops: DrawOps) {
    if (myBook) coverDraft.setOps(myBook.id, ops);
  }

  async function handlePresent() {
    if (!myBook) return;
    presented = true;
    await session.submitCover(myBook.id, draft.ops, draft.template);
  }
</script>

<div class="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
  <div class="flex flex-col items-center gap-1 text-center">
    <h1 class="font-title text-2xl text-ink">The Final Flourish</h1>
    <p class="text-sm text-ink/60">
      Adorn your book's cover before the gallery opens — you have a moment more.
    </p>
  </div>

  <p
    data-testid="decoration-countdown"
    class="text-center font-mono text-lg text-ink/80"
    aria-label="Time remaining to decorate"
  >
    {countdownLabel}
  </p>

  <p class="text-center text-sm text-ink/60">
    {submittedCount} of {activeCount} covers presented
  </p>

  {#if myBook && player}
    <CoverDecorationCanvas
      username={player.name}
      ops={draft.ops}
      onOpsChange={handleOpsChange}
      monochromeOnly={room?.monochromeOnly ?? false}
      coverTemplate={draft.template}
      onTemplateChange={handleTemplateChange}
    />
  {/if}

  {#if presented}
    <p class="text-center text-lg text-ink/75">
      Presented. Waiting for the other guests to finish their covers…
    </p>
  {:else}
    <button
      type="button"
      class="chamfer-frame bg-bubblegum px-4 py-2 text-base text-white [--chamfer-color:theme(colors.butter)]"
      on:click={handlePresent}
    >
      <span class="inline-flex items-center gap-1.5">
        <Send size={16} aria-hidden="true" />
        Present your cover
      </span>
    </button>
  {/if}
</div>
