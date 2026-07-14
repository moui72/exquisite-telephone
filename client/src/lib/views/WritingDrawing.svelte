<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { computeNextEntries, parseDrawOps, serializeDrawOps } from '@exquisite-telephone/shared';
  import type { DrawOps } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import DrawingCanvas from '../components/DrawingCanvas.svelte';
  import TurnStatus from '../components/TurnStatus.svelte';

  export let session: SessionStore = defaultSession;

  let textValue = '';
  let drawnOps: DrawOps = [];

  // Ticks the countdown (ui.md Writing/Drawing View) once a second.
  // Registered/cleaned up across the component lifecycle (constitution
  // Quality Standards — touch/timer cleanup).
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
  $: myTurn =
    state.room && state.player
      ? computeNextEntries(state.room).find((e) => e.authorId === state.player!.id)
      : undefined;
  $: myBook = state.room && myTurn ? state.room.books.find((b) => b.id === myTurn!.bookId) : null;
  $: previousEntry =
    myBook && myTurn && myTurn.position > 0 ? myBook.entries[myTurn.position - 1] : null;
  // Distinguishes "finished my part of this round, waiting on others" from
  // a generic wait state (ui.md Writing/Drawing View): true when the
  // player has no entry offered this round, but still has an incomplete
  // book of their own elsewhere in the room.
  $: waitingForRoundToFinish =
    !myTurn &&
    state.room &&
    state.player &&
    state.room.books.some(
      (b) => b.originAuthorId === state.player!.id && b.entries.length < state.room!.players.length,
    );

  // Reset local draft state whenever the assigned turn changes.
  $: if (myTurn) {
    textValue = '';
    drawnOps = [];
  }

  // Countdown to this player's individual deadline (datamodel.md
  // Normalization Rules — Turn timer): only shown when the host has set
  // Room.turnTimerMinutes. `now` re-evaluates this every tick.
  $: deadline =
    state.room && state.player && state.room.turnTimerMinutes && state.room.roundStartedAt != null
      ? state.room.roundStartedAt +
        (state.room.timerExtensions[state.player.id] ?? state.room.turnTimerMinutes * 60_000)
      : null;
  $: countdownLabel = deadline !== null ? formatCountdown(Math.max(0, deadline - now)) : null;

  function formatCountdown(msRemaining: number): string {
    const totalSeconds = Math.floor(msRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  // Timeout-vote prompt (ui.md Writing/Drawing View): shown to every
  // eligible voter while a vote is open. Names the stalled player(s) by
  // name (never their in-progress content).
  $: pendingTimeoutVote = state.room?.pendingTimeoutVote ?? null;
  $: canVoteOnTimeout =
    pendingTimeoutVote !== null &&
    state.player !== null &&
    pendingTimeoutVote.eligibleVoterIds.includes(state.player.id);
  $: stalledPlayerNames =
    pendingTimeoutVote && state.room
      ? pendingTimeoutVote.stalledPlayerIds
          .map((id) => state.room!.players.find((p) => p.id === id)?.name ?? id)
          .join(', ')
      : '';

  async function handleCastTimeoutVote(choice: 'full' | 'half' | '15m' | 'force-empty') {
    await session.castTimeoutVote(choice);
  }
</script>

<div class="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
  {#if state.room}
    <TurnStatus room={state.room} />
  {/if}

  {#if countdownLabel !== null}
    <p data-testid="turn-timer-countdown" class="text-sm font-medium text-amber-700">
      Time remaining: {countdownLabel}
    </p>
  {/if}

  {#if canVoteOnTimeout}
    <div class="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-4">
      <p class="text-sm text-slate-700">
        {stalledPlayerNames} still hasn't submitted this round. What should happen?
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-md border px-3 py-1 text-sm"
          on:click={() => handleCastTimeoutVote('full')}
        >
          Give a full turn
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-1 text-sm"
          on:click={() => handleCastTimeoutVote('half')}
        >
          Give a half turn
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-1 text-sm"
          on:click={() => handleCastTimeoutVote('15m')}
        >
          Give 15 minutes
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-1 text-sm"
          on:click={() => handleCastTimeoutVote('force-empty')}
        >
          Force empty now
        </button>
      </div>
    </div>
  {/if}

  {#if !myTurn}
    {#if waitingForRoundToFinish}
      <p class="text-lg text-slate-600">Waiting for the round to finish…</p>
    {:else}
      <p class="text-lg text-slate-600">Waiting for your next turn…</p>
    {/if}
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
        <DrawingCanvas
          ops={drawnOps}
          onOpsChange={handleOpsChange}
          monochromeOnly={state.room?.monochromeOnly ?? false}
        />
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
