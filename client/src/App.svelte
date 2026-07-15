<script lang="ts">
  import Lobby from './lib/views/Lobby.svelte';
  import WritingDrawing from './lib/views/WritingDrawing.svelte';
  import Reveal from './lib/views/Reveal.svelte';
  import { session as defaultSession } from './lib/stores/index.js';
  import type { SessionStore } from './lib/stores/session.js';

  export let session: SessionStore = defaultSession;

  $: state = $session;
</script>

{#if state.reconnecting}
  <main class="flex min-h-screen items-center justify-center p-6">
    <p class="text-lg text-slate-600">Reconnecting…</p>
  </main>
{:else if state.error === 'game-ended'}
  <main class="flex min-h-screen items-center justify-center p-6">
    <p class="text-lg text-slate-600">This game has ended.</p>
  </main>
{:else if !state.room || state.room.status === 'lobby'}
  <Lobby {session} />
{:else if state.room.status === 'writing'}
  <WritingDrawing {session} />
{:else if state.room.status === 'reveal'}
  <Reveal {session} />
{:else if state.room.status === 'ended'}
  <main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
    <p class="text-lg text-slate-600">This game has ended.</p>
    <button
      type="button"
      class="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
      on:click={() => session.leaveGame()}
    >
      Return to home
    </button>
  </main>
{/if}
