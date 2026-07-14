<script lang="ts">
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';

  export let session: SessionStore = defaultSession;

  let mode: 'create' | 'join' = 'create';
  let displayName = '';
  let roomCodeInput = '';
  let acknowledgeSmallGame = false;

  /** Below this many players, starting requires an explicit host override (datamodel.md Normalization Rules). */
  const MINIMUM_RECOMMENDED_PLAYERS = 3;

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
</script>

<div class="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
  <h1 class="text-2xl font-semibold text-slate-800">Exquisite Telephone</h1>

  {#if !state.room}
    <div role="tablist" aria-label="Join or create a room" class="flex gap-2">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'create'}
        class="flex-1 rounded-md border px-4 py-2 text-sm font-medium"
        class:bg-slate-800={mode === 'create'}
        class:text-white={mode === 'create'}
        on:click={() => (mode = 'create')}
      >
        Create room
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'join'}
        class="flex-1 rounded-md border px-4 py-2 text-sm font-medium"
        class:bg-slate-800={mode === 'join'}
        class:text-white={mode === 'join'}
        on:click={() => (mode = 'join')}
      >
        Join room
      </button>
    </div>

    <form class="flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Display name
        <input
          class="rounded-md border px-3 py-2 text-base"
          type="text"
          required
          bind:value={displayName}
          autocomplete="name"
        />
      </label>

      {#if mode === 'join'}
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Room code
          <input
            class="rounded-md border px-3 py-2 text-base uppercase tracking-widest"
            type="text"
            required
            bind:value={roomCodeInput}
            maxlength="6"
          />
        </label>
      {/if}

      {#if state.error}
        <p role="alert" class="text-sm text-red-600">{state.error}</p>
      {/if}

      <button
        type="submit"
        class="rounded-md bg-slate-800 px-4 py-2 text-base font-medium text-white"
      >
        {mode === 'create' ? 'Create room' : 'Join room'}
      </button>
    </form>
  {:else}
    <div class="flex flex-col gap-4">
      <p class="text-sm text-slate-600">Room code</p>
      <p class="text-3xl font-bold tracking-widest text-slate-900">{state.room.id}</p>

      <ul class="flex flex-col gap-2">
        {#each state.room.players as player (player.id)}
          <li class="rounded-md border px-3 py-2 text-base">
            {player.name}
            {#if player.id === state.room.hostPlayerId}
              <span class="text-xs text-slate-500">(host)</span>
            {/if}
          </li>
        {/each}
      </ul>

      {#if isHost}
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Turn timer
          <select
            class="rounded-md border px-3 py-2 text-base"
            value={state.room.turnTimerMinutes ?? ''}
            on:change={handleTurnTimerChange}
          >
            {#each TURN_TIMER_OPTIONS as option (option.value)}
              <option value={option.value ?? ''}>{option.label}</option>
            {/each}
          </select>
        </label>

        <p class="text-xs text-slate-500">
          Player count: recommend 4+ players, minimum 3.
        </p>

        {#if belowMinimumPlayers}
          <label class="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" bind:checked={acknowledgeSmallGame} class="mt-1" />
            I know this won't really work but I want to test something
          </label>
        {/if}

        <button
          type="button"
          class="rounded-md bg-emerald-700 px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={belowMinimumPlayers && !acknowledgeSmallGame}
          on:click={handleStartGame}
        >
          Start game
        </button>
      {/if}
    </div>
  {/if}
</div>
