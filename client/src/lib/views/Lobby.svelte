<script lang="ts">
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';

  export let session: SessionStore = defaultSession;

  let mode: 'create' | 'join' = 'create';
  let displayName = '';
  let roomCodeInput = '';

  $: state = $session;
  $: isHost =
    state.room !== null && state.player !== null && state.player.id === state.room.hostPlayerId;

  async function handleSubmit() {
    if (mode === 'create') {
      await session.createRoom(displayName);
    } else {
      await session.joinRoom(roomCodeInput.toUpperCase(), displayName);
    }
  }

  async function handleStartGame() {
    await session.startGame();
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
        <button
          type="button"
          class="rounded-md bg-emerald-700 px-4 py-2 text-base font-medium text-white"
          on:click={handleStartGame}
        >
          Start game
        </button>
      {/if}
    </div>
  {/if}
</div>
