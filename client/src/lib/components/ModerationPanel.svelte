<script lang="ts">
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';

  /**
   * Host-only moderation controls (host-game-moderation-controls plan):
   * a collapsible per-player kick list, an "End game" button reachable
   * from any Room.status, and a "Restart game" button shown only once
   * a kick has frozen the room (`Room.nonContinuable`). Mounted from
   * Lobby/WritingDrawing/Reveal — visible during lobby/writing/reveal.
   */
  export let session: SessionStore = defaultSession;

  let expanded = false;

  $: state = $session;
  $: room = state.room;
  $: isHost = room !== null && state.player !== null && state.player.id === room.hostPlayerId;

  async function handleKick(targetPlayerId: string) {
    await session.kickPlayer(targetPlayerId);
  }

  async function handleEndGame() {
    await session.endGame();
  }

  async function handleRestartGame() {
    await session.restartGame();
  }
</script>

{#if isHost && room}
  <div class="rounded-md border border-slate-200 p-3">
    <button
      type="button"
      class="flex w-full min-h-11 items-center justify-between text-sm font-medium text-slate-700"
      aria-expanded={expanded}
      on:click={() => (expanded = !expanded)}
    >
      Moderation
      <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
    </button>

    {#if expanded}
      <ul class="mt-3 flex flex-col gap-2">
        {#each room.players as player (player.id)}
          <li class="flex items-center justify-between text-sm">
            <span class:line-through={player.kicked} class:text-slate-400={player.kicked}>
              {player.name}
            </span>
            {#if player.id !== room.hostPlayerId}
              <button
                type="button"
                class="min-h-11 rounded-md border px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                disabled={player.kicked}
                on:click={() => handleKick(player.id)}
              >
                {player.kicked ? 'Kicked' : 'Kick'}
              </button>
            {/if}
          </li>
        {/each}
      </ul>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="min-h-11 rounded-md border px-4 py-2 text-sm font-medium text-slate-700"
          on:click={handleEndGame}
        >
          End game
        </button>
        {#if room.nonContinuable}
          <button
            type="button"
            class="min-h-11 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white"
            on:click={handleRestartGame}
          >
            Restart game
          </button>
        {/if}
      </div>
    {/if}
  </div>
{/if}
