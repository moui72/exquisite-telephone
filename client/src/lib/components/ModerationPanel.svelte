<script lang="ts">
  import { Crown, DoorOpen, X } from '@lucide/svelte';
  import GiltFrame from './GiltFrame.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';

  /**
   * Host-only moderation controls (host-game-moderation-controls plan),
   * rendered as a modal overlay opened from the Salon Footer's gavel
   * button: a per-player kick list, an "End game" button reachable from
   * any Room.status, and a "Restart game" button shown only once a kick
   * has frozen the room (`Room.nonContinuable`). The parent controls
   * when it opens; it renders nothing for non-hosts regardless.
   */
  export let session: SessionStore = defaultSession;
  export let onClose: () => void;

  $: state = $session;
  $: room = state.room;
  $: isHost = room !== null && state.player !== null && state.player.id === room.hostPlayerId;
  // Kicked players are removed entirely from the visible roster (ui.md
  // Moderation Panel, reversed 2026-07-17) — the underlying Player
  // record is untouched server-side, this is a display-only filter.
  $: visiblePlayers = room?.players.filter((p) => !p.kicked) ?? [];

  // Every destructive host control is confirmation-gated (ui.md —
  // Moderation Panel; closes feedback F001): a mis-tap on a name or button
  // must not irreversibly kick, end, or restart. All three route through
  // the shared ConfirmDialog in the destructive variant — a plain
  // are-you-sure, no read-state (pre-reveal there is nothing read to lose).
  type PendingConfirm =
    | { kind: 'end' }
    | { kind: 'restart' }
    | { kind: 'kick'; playerId: string; playerName: string };

  let pending: PendingConfirm | null = null;

  $: confirmDialog =
    pending === null
      ? null
      : pending.kind === 'kick'
        ? {
            heading: `Kick ${pending.playerName}?`,
            body: 'They will be removed from the salon for the rest of the game.',
            confirmLabel: 'Kick',
          }
        : pending.kind === 'end'
          ? {
              heading: 'End the game for everyone?',
              body: 'This closes the exhibition for every guest.',
              confirmLabel: 'End game',
            }
          : {
              heading: 'Restart from turn 0? All current progress is lost.',
              body: 'Every entry authored so far is discarded.',
              confirmLabel: 'Restart',
            };

  function requestKick(playerId: string, playerName: string) {
    pending = { kind: 'kick', playerId, playerName };
  }

  function requestEndGame() {
    pending = { kind: 'end' };
  }

  function requestRestartGame() {
    pending = { kind: 'restart' };
  }

  function confirmPending() {
    const p = pending;
    pending = null;
    if (p === null) return;
    if (p.kind === 'end') void session.endGame();
    else if (p.kind === 'restart') void session.restartGame();
    else void session.kickPlayer(p.playerId);
  }

  function cancelPending() {
    pending = null;
  }
</script>

{#if isHost && room}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-wine/50 p-4"
    role="presentation"
    on:click|self={onClose}
  >
    <div
      class="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Moderation"
    >
      <GiltFrame caption="The Host's Gavel">
        <div class="flex flex-col gap-4 p-1">
          <section>
            <h2 class="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink/50">
              Guest List
            </h2>
            <ul class="mt-1 flex flex-col divide-y divide-gold/25">
              {#each visiblePlayers as player (player.id)}
                <li class="flex min-h-11 items-center justify-between gap-3 py-1.5 text-sm">
                  <span class="inline-flex min-w-0 items-center gap-1.5 truncate text-ink/90">
                    {#if player.id === room.hostPlayerId}
                      <Crown size={14} aria-hidden="true" class="shrink-0 text-gold" />
                    {/if}
                    {player.name}
                  </span>
                  {#if player.id === room.hostPlayerId}
                    <span class="font-mono text-[0.65rem] uppercase tracking-wide text-ink/40">
                      Host
                    </span>
                  {:else}
                    <button
                      type="button"
                      class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-ink/20 px-3 text-xs font-medium text-ink/70 transition-colors hover:border-red-700/50 hover:bg-red-50 hover:text-red-700"
                      on:click={() => requestKick(player.id, player.name)}
                    >
                      <DoorOpen size={14} aria-hidden="true" />
                      Escort from the Salon
                    </button>
                  {/if}
                </li>
              {/each}
            </ul>
          </section>

          {#if room.nonContinuable}
            <p
              role="alert"
              class="rounded border-l-4 border-red-700/70 bg-red-700/5 p-3 text-sm text-ink/90"
            >
              This salon cannot continue — a guest was removed mid-round. Restage the Salon below
              to continue.
            </p>
          {/if}

          <section>
            <h2 class="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink/50">
              The House
            </h2>
            <div class="mt-2 flex flex-wrap gap-2">
              {#if room.nonContinuable}
                <button
                  type="button"
                  class="chamfer-frame chamfer-slim inline-flex min-h-11 items-center justify-center bg-sapphire px-5 text-sm font-medium text-white hover:bg-sapphire/90 [--chamfer-color:theme(colors.gold)]"
                  on:click={requestRestartGame}
                >
                  Restage the Salon
                </button>
              {/if}
              <button
                type="button"
                class="chamfer-frame chamfer-slim inline-flex min-h-11 items-center justify-center bg-gold/15 px-5 text-sm font-medium text-ink/80 hover:bg-gold/25 [--chamfer-color:transparent]"
                on:click={requestEndGame}
              >
                Close the Exhibition
              </button>
            </div>
          </section>
        </div>

        <button
          slot="plaque-action"
          type="button"
          class="chamfer-frame chamfer-slim inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 bg-sapphire px-4 text-sm font-medium text-white hover:bg-sapphire/90 [--chamfer-color:theme(colors.gold)]"
          on:click={onClose}
        >
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </GiltFrame>
    </div>
  </div>

  {#if confirmDialog}
    <ConfirmDialog
      heading={confirmDialog.heading}
      body={confirmDialog.body}
      confirmLabel={confirmDialog.confirmLabel}
      cancelLabel="Cancel"
      destructive
      onConfirm={confirmPending}
      onCancel={cancelPending}
    />
  {/if}
{/if}
