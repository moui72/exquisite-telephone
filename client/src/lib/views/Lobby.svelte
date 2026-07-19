<script lang="ts">
  import { defaultLapsPerBook } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import ModerationPanel from '../components/ModerationPanel.svelte';
  import GiltFrame from '../components/GiltFrame.svelte';
  import RulesOverview from '../components/RulesOverview.svelte';

  export let session: SessionStore = defaultSession;

  let showRulesOverview = false;

  let mode: 'create' | 'join' = 'create';
  let displayName = '';
  let roomCodeInput = '';
  let acknowledgeSmallGame = false;

  /** Below this many players, starting requires an explicit host override (datamodel.md Normalization Rules). */
  const MINIMUM_RECOMMENDED_PLAYERS = 3;

  /**
   * ui.md States — Error: every server error code reaching this view is
   * translated to docent-voice copy, never shown raw (F002,
   * .project/feedback/feedback-main-8da5.md). Covers every code
   * reachable from a Lobby-triggered action (create room, join room,
   * start game, rejoin); a generic fallback covers any unmapped code.
   */
  const ERROR_COPY: Record<string, string> = {
    'room-not-found': "The house has no salon by that code — check the code and try again.",
    'not-host': 'Only the host may do that.',
    'too-few-players': 'The salon needs a few more guests before the exhibition can begin.',
    'room-not-in-lobby': 'This salon has already begun — late arrivals cannot be seated.',
    'invalid-token': 'Your invitation has expired — please reconnect to rejoin the salon.',
    'game-ended': 'This salon has already ended.',
  };
  const FALLBACK_ERROR_COPY = 'Something went awry at the salon — please try again.';
  $: errorCopy = state.error ? (ERROR_COPY[state.error] ?? FALLBACK_ERROR_COPY) : null;

  $: state = $session;
  $: isHost =
    state.room !== null && state.player !== null && state.player.id === state.room.hostPlayerId;
  $: belowMinimumPlayers = (state.room?.players.length ?? 0) < MINIMUM_RECOMMENDED_PLAYERS;

  async function handleSubmit() {
    if (mode === 'create') {
      await session.createRoom(displayName);
    } else {
      await session.joinRoom(roomCodeInput.toUpperCase(), displayName);
    }
  }

  async function handleStartGame() {
    await session.startGame(belowMinimumPlayers ? acknowledgeSmallGame : undefined);
  }

  const TURN_TIMER_OPTIONS: { value: 15 | 30 | 60 | 240 | 720 | null; label: string }[] = [
    { value: null, label: 'Off' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 240, label: '4 hours' },
    { value: 720, label: '12 hours' },
  ];

  async function handleTurnTimerChange(event: Event) {
    const raw = (event.target as HTMLSelectElement).value;
    const turnTimerMinutes = raw === '' ? null : (Number(raw) as 15 | 30 | 60 | 240 | 720);
    await session.setTurnTimer(turnTimerMinutes);
  }

  async function handleToggleMonochrome(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    await session.setMonochrome(checked);
  }

  const LAPS_PER_BOOK_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
    { value: 1, label: '1 lap' },
    { value: 2, label: '2 laps' },
    { value: 3, label: '3 laps' },
  ];

  // Live default while the host hasn't explicitly chosen a value (ui.md
  // Lobby View, datamodel.md Normalization Rules — Laps per book): tracks
  // player count until the host's own selection locks it in.
  $: lapsPerBookValue =
    state.room?.lapsPerBook ?? defaultLapsPerBook(state.room?.players.length ?? 0);

  async function handleLapsPerBookChange(event: Event) {
    const raw = (event.target as HTMLSelectElement).value;
    await session.setLapsPerBook(Number(raw) as 1 | 2 | 3);
  }
</script>

<div class="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 p-4 sm:p-6">
  <button
    type="button"
    class="min-h-11 self-center text-sm font-medium text-ink/70 underline"
    on:click={() => (showRulesOverview = true)}
  >
    How this salon works
  </button>

  {#if showRulesOverview}
    <RulesOverview onClose={() => (showRulesOverview = false)} />
  {/if}

  {#if !state.room}
    <div class="flex flex-col items-center gap-1 text-center">
      <h1
        class="bg-gradient-to-b from-marigold via-[#FFDD94] to-marigold bg-clip-text text-4xl
          font-title tracking-wide text-transparent drop-shadow-[0_1px_0_rgba(46,26,71,0.35)]
          sm:text-6xl"
      >
        Exquisite Telephone
      </h1>
      <p class="max-w-sm text-sm text-ink/60">
        A salon game of drawings whispered down the line. Gather your guests, then write, draw,
        and reveal.
      </p>
    </div>

    <GiltFrame caption="The Foyer — RSVP Required">
      <div role="tablist" aria-label="Join or create a room" class="flex gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          class="flex-1 rounded-md border border-marigold/60 px-4 py-3 text-sm font-medium sm:py-2"
          class:bg-bubblegum={mode === 'create'}
          class:text-white={mode === 'create'}
          class:bg-butter={mode !== 'create'}
          class:text-ink={mode !== 'create'}
          on:click={() => (mode = 'create')}
        >
          Create room
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'join'}
          class="flex-1 rounded-md border border-marigold/60 px-4 py-3 text-sm font-medium sm:py-2"
          class:bg-bubblegum={mode === 'join'}
          class:text-white={mode === 'join'}
          class:bg-butter={mode !== 'join'}
          class:text-ink={mode !== 'join'}
          on:click={() => (mode = 'join')}
        >
          Join room
        </button>
      </div>

      <form class="mt-4 flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
        <label class="flex flex-col gap-1 text-sm font-medium text-ink/90">
          Display name
          <input
            class="rounded-md border border-marigold/30 px-3 py-3 text-base sm:py-2"
            type="text"
            required
            bind:value={displayName}
            autocomplete="name"
          />
        </label>

        {#if mode === 'join'}
          <label class="flex flex-col gap-1 text-sm font-medium text-ink/90">
            Room code
            <input
              class="rounded-md border border-marigold/30 px-3 py-3 text-base uppercase tracking-widest sm:py-2"
              type="text"
              required
              bind:value={roomCodeInput}
              maxlength="6"
            />
          </label>
        {/if}

        {#if errorCopy}
          <p role="alert" class="text-sm text-red-600">{errorCopy}</p>
        {/if}

        <button
          type="submit"
          class="rounded-md bg-bubblegum px-4 py-3 text-base font-medium text-white sm:py-2"
        >
          {mode === 'create' ? 'Create room' : 'Join room'}
        </button>
      </form>
    </GiltFrame>
  {:else}
    <div class="flex flex-col gap-4">
      <ModerationPanel {session} />

      <GiltFrame caption={`Guest List — Salon No. ${state.room.id}`}>
        <p class="text-sm text-ink/75">Room code</p>
        <p class="text-3xl font-bold tracking-widest text-ink">{state.room.id}</p>

        <ul class="flex flex-col gap-2">
          {#each state.room.players as player (player.id)}
            <li class="rounded-md border border-marigold/30 px-3 py-2 text-base">
              {player.name}
              {#if player.id === state.room.hostPlayerId}
                <span class="text-xs text-ink/60">(host)</span>
              {/if}
            </li>
          {/each}
        </ul>
      </GiltFrame>

      {#if isHost}
        <label class="flex items-center gap-2 text-sm font-medium text-ink/90">
          <input
            type="checkbox"
            checked={state.room.monochromeOnly}
            on:change={handleToggleMonochrome}
          />
          Enforce a Monochrome Decree
        </label>

        <label class="flex flex-col gap-1 text-sm font-medium text-ink/90">
          Allotted Contemplation Period
          <select
            class="rounded-md border border-marigold/30 px-3 py-2 text-base"
            value={state.room.turnTimerMinutes ?? ''}
            on:change={handleTurnTimerChange}
          >
            {#each TURN_TIMER_OPTIONS as option (option.value)}
              <option value={option.value ?? ''}>{option.label}</option>
            {/each}
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm font-medium text-ink/90">
          Laps Per Book
          <select
            class="rounded-md border border-marigold/30 px-3 py-2 text-base"
            value={lapsPerBookValue}
            on:change={handleLapsPerBookChange}
          >
            {#each LAPS_PER_BOOK_OPTIONS as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>

        <p class="text-xs text-ink/60">
          Player count: recommend 4+ players, minimum 3.
        </p>

        {#if belowMinimumPlayers}
          <label class="flex items-start gap-2 text-sm text-ink/90">
            <input type="checkbox" bind:checked={acknowledgeSmallGame} class="mt-1" />
            I am aware this salon is intimately attended (fewer than three guests) and wish to proceed
            nonetheless
          </label>
        {/if}

        <button
          type="button"
          class="rounded-md bg-bubblegum px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={belowMinimumPlayers && !acknowledgeSmallGame}
          on:click={handleStartGame}
        >
          Commence the Exhibition
        </button>
      {/if}
    </div>
  {/if}
</div>
