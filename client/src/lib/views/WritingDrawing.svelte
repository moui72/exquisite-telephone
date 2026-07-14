<script lang="ts">
  import { computeNextEntries, parseDrawOps, serializeDrawOps } from '@exquisite-telephone/shared';
  import type { DrawOps } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import DrawingCanvas from '../components/DrawingCanvas.svelte';
  import TurnStatus from '../components/TurnStatus.svelte';

  export let session: SessionStore = defaultSession;

  let textValue = '';
  let drawnOps: DrawOps = [];

  $: state = $session;
  $: myTurn =
    state.room && state.player
      ? computeNextEntries(state.room).find((e) => e.authorId === state.player!.id)
      : undefined;
  $: myBook = state.room && myTurn ? state.room.books.find((b) => b.id === myTurn!.bookId) : null;
  $: previousEntry =
    myBook && myTurn && myTurn.position > 0 ? myBook.entries[myTurn.position - 1] : null;

  // Reset local draft state whenever the assigned turn changes.
  $: if (myTurn) {
    textValue = '';
    drawnOps = [];
  }

  async function handleSubmitText() {
    if (!myTurn || !textValue.trim()) return;
    await session.submitEntry(myTurn.bookId, textValue.trim());
  }

  async function handleSubmitDrawing() {
    if (!myTurn || drawnOps.length === 0) return;
    await session.submitEntry(myTurn.bookId, serializeDrawOps(drawnOps));
  }

  function handleOpsChange(ops: DrawOps) {
    drawnOps = ops;
  }
</script>

<div class="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
  {#if state.room}
    <TurnStatus room={state.room} />
  {/if}

  {#if !myTurn}
    <p class="text-lg text-slate-600">Waiting for your next turn…</p>
  {:else}
    {#if previousEntry}
      <div class="flex flex-col gap-2">
        <p class="text-sm text-slate-500">What the last player made:</p>
        {#if previousEntry.type === 'text'}
          <p class="text-xl font-medium text-slate-900">{previousEntry.content}</p>
        {:else}
          <DrawingCanvas ops={parseDrawOps(previousEntry.content)} readOnly />
        {/if}
      </div>
    {/if}

    {#if myTurn.type === 'text'}
      <form class="flex flex-col gap-4" on:submit|preventDefault={handleSubmitText}>
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Your phrase
          <input
            class="rounded-md border px-3 py-2 text-base"
            type="text"
            required
            bind:value={textValue}
            autocomplete="off"
          />
        </label>
        <button type="submit" class="rounded-md bg-slate-800 px-4 py-2 text-base text-white">
          Submit
        </button>
      </form>
    {:else}
      <div class="flex flex-col gap-4">
        <DrawingCanvas ops={drawnOps} onOpsChange={handleOpsChange} />
        <button
          type="button"
          class="rounded-md bg-slate-800 px-4 py-2 text-base text-white"
          on:click={handleSubmitDrawing}
        >
          Submit
        </button>
      </div>
    {/if}
  {/if}
</div>
