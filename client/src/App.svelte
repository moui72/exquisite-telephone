<script lang="ts">
  import Lobby from './lib/views/Lobby.svelte';
  import WritingDrawing from './lib/views/WritingDrawing.svelte';
  import Reveal from './lib/views/Reveal.svelte';
  import SalonFooter from './lib/components/SalonFooter.svelte';
  import RulesOverview from './lib/components/RulesOverview.svelte';
  import ModerationPanel from './lib/components/ModerationPanel.svelte';
  import { session as defaultSession } from './lib/stores/index.js';
  import type { SessionStore } from './lib/stores/session.js';

  export let session: SessionStore = defaultSession;

  let showRulesOverview = false;
  let showModeration = false;

  $: state = $session;
  // Kicked (ui.md States): the local player's own record showing
  // kicked: true takes over regardless of Room.status — a kick can
  // happen mid-writing or mid-reveal, and this client must stop
  // rendering its normal view the instant it observes its own flag.
  $: myPlayerRecord = state.room?.players.find((p) => p.id === state.player?.id) ?? null;
  $: isKicked = myPlayerRecord?.kicked === true;
  // The footer's gavel (and the Moderation modal it opens) exist only for
  // the host of a live, non-ended room.
  $: isHost =
    state.room !== null &&
    state.player !== null &&
    state.player.id === state.room.hostPlayerId &&
    state.room.status !== 'ended' &&
    !isKicked;
</script>

<div class="pb-12">
{#if state.reconnecting}
  <main class="flex min-h-screen items-center justify-center p-6">
    <p class="text-lg text-ink/75">Retrieving your ticket…</p>
  </main>
{:else if state.error === 'game-ended'}
  <main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
    <p class="text-lg text-ink/75">The Exhibition has Closed.</p>
    <button
      type="button"
      class="rounded bg-bubblegum px-4 py-2 text-white hover:bg-bubblegum/90"
      on:click={() => session.leaveGame()}
    >
      Return to the Foyer
    </button>
  </main>
{:else if isKicked}
  <main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
    <p class="text-lg text-ink/75">You have been asked to leave the salon by the host.</p>
    <button
      type="button"
      class="rounded bg-bubblegum px-4 py-2 text-white hover:bg-bubblegum/90"
      on:click={() => session.leaveGame()}
    >
      Return to the Foyer
    </button>
  </main>
{:else if !state.room || state.room.status === 'lobby'}
  <Lobby {session} />
{:else if state.room.status === 'writing'}
  <WritingDrawing {session} />
{:else if state.room.status === 'reveal'}
  <Reveal {session} />
{:else if state.room.status === 'ended'}
  <main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
    <p class="text-lg text-ink/75">The Exhibition has Closed.</p>
    <button
      type="button"
      class="rounded bg-bubblegum px-4 py-2 text-white hover:bg-bubblegum/90"
      on:click={() => session.leaveGame()}
    >
      Return to the Foyer
    </button>
  </main>
{/if}
</div>

<SalonFooter
  roomCode={state.room?.id ?? null}
  onShowRules={() => (showRulesOverview = true)}
  onShowModeration={isHost ? () => (showModeration = true) : null}
  nonContinuable={state.room?.nonContinuable ?? false}
/>

{#if showRulesOverview}
  <RulesOverview onClose={() => (showRulesOverview = false)} />
{/if}

{#if showModeration}
  <ModerationPanel {session} onClose={() => (showModeration = false)} />
{/if}
