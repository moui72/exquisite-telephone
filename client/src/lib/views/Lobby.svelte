<script lang="ts">
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import ModerationPanel from '../components/ModerationPanel.svelte';
  import GiltFrame from '../components/GiltFrame.svelte';

  export let session: SessionStore = defaultSession;

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
</script>

<div class="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
  <h1 class="text-2xl font-semibold font-display text-ink">Exquisite Telephone</h1>

  {#if !state.room}
    <div role="tablist" aria-label="Join or create a room" class="flex gap-2">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'create'}
        class="flex-1 rounded-md border border-marigold/60 px-4 py-2 text-sm font-medium"
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
        class="flex-1 rounded-md border border-marigold/60 px-4 py-2 text-sm font-medium"
        class:bg-bubblegum={mode === 'join'}
        class:text-white={mode === 'join'}
        class:bg-butter={mode !== 'join'}
        class:text-ink={mode !== 'join'}
        on:click={() => (mode = 'join')}
      >
        Join room
      </button>
    </div>

    <form class="flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink/90">
        Display name
        <input
          class="rounded-md border border-marigold/30 px-3 py-2 text-base"
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
            class="rounded-md border border-marigold/30 px-3 py-2 text-base uppercase tracking-widest"
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
        class="rounded-md bg-bubblegum px-4 py-2 text-base font-medium text-white"
      >
        {mode === 'create' ? 'Create room' : 'Join room'}
      </button>
    </form>
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
