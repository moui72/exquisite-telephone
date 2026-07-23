<script lang="ts">
  import { activePlayers, defaultLapsPerBook } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import { Crown, Sparkles } from '@lucide/svelte';
  import GiltFrame from '../components/GiltFrame.svelte';
  import InfoTooltip from '../components/InfoTooltip.svelte';

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
    'room-not-found': 'The house has no salon by that code — check the code and try again.',
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
  $: belowMinimumPlayers =
    (state.room ? activePlayers(state.room).length : 0) < MINIMUM_RECOMMENDED_PLAYERS;

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
    state.room?.lapsPerBook ??
    defaultLapsPerBook(state.room ? activePlayers(state.room).length : 0);

  async function handleLapsPerBookChange(event: Event) {
    const raw = (event.target as HTMLSelectElement).value;
    await session.setLapsPerBook(Number(raw) as 1 | 2 | 3);
  }

  const CURATED_PROMPT_COUNT_OPTIONS: (2 | 3 | 4 | 5)[] = [2, 3, 4, 5];

  // ui.md names the selector's options but no default. The Lobby commits one
  // explicitly the moment the host switches to curated, so the room never
  // starts a curated game with `curatedPromptCount` still null.
  const DEFAULT_CURATED_PROMPT_COUNT = 3;

  async function handlePromptModeChange(event: Event) {
    const mode = (event.target as HTMLSelectElement).value as 'free-form' | 'curated';
    await session.setPromptMode(mode);
    if (mode === 'curated' && state.room?.curatedPromptCount == null) {
      await session.setCuratedPromptCount(DEFAULT_CURATED_PROMPT_COUNT as 2 | 3 | 4 | 5);
    }
  }

  async function handleCuratedPromptCountChange(event: Event) {
    const raw = (event.target as HTMLSelectElement).value;
    await session.setCuratedPromptCount(Number(raw) as 2 | 3 | 4 | 5);
  }

  async function handleAllowWriteInToggle(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    await session.setAllowPromptWriteIn(checked);
  }
</script>

<div class="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 p-4 sm:p-6">
  {#if !state.room}
    <div class="flex flex-col items-center gap-1 text-center">
      <h1
        class="bg-gradient-to-b from-marigold via-[#ECD79A] to-marigold bg-clip-text text-4xl
          font-title tracking-wide text-transparent drop-shadow-[0_1px_0_rgba(20,6,12,0.45)]
          [-webkit-text-stroke:1.5px_theme(colors.ink)] [paint-order:stroke_fill]
          sm:text-6xl"
      >
        Exquisite Telephone
      </h1>
      <p class="max-w-sm text-sm text-butter/75">
        A salon game of drawings whispered down the line. Gather your guests, then write, draw, and
        reveal.
      </p>
    </div>

    <GiltFrame caption="The Foyer — RSVP Required">
      <div role="tablist" aria-label="Join or create a room" class="flex gap-2">
        <!--
          Both tabs share the same slim chamfered silhouette; only the
          active one gets the marigold ring and bubblegum fill. Inactive
          tabs are a quiet tinted cut-corner shape with no outline at
          all — a stroke on an unselected tab competed with the frame.
        -->
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          class="flex-1 px-4 py-3 text-sm font-medium sm:py-2 {mode === 'create'
            ? 'chamfer-frame chamfer-slim bg-bubblegum text-white [--chamfer-color:theme(colors.marigold)]'
            : 'chamfer-frame chamfer-slim bg-marigold/15 text-ink/60 [--chamfer-color:transparent] hover:bg-marigold/25'}"
          on:click={() => (mode = 'create')}
        >
          Create room
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'join'}
          class="flex-1 px-4 py-3 text-sm font-medium sm:py-2 {mode === 'join'
            ? 'chamfer-frame chamfer-slim bg-bubblegum text-white [--chamfer-color:theme(colors.marigold)]'
            : 'chamfer-frame chamfer-slim bg-marigold/15 text-ink/60 [--chamfer-color:transparent] hover:bg-marigold/25'}"
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
          class="chamfer-frame bg-bubblegum px-4 py-3 text-base font-medium text-white [--chamfer-color:theme(colors.butter)] sm:py-2"
        >
          {mode === 'create' ? 'Create room' : 'Join room'}
        </button>
      </form>
    </GiltFrame>
  {:else}
    <div class="flex flex-col gap-4">
      <GiltFrame caption={`Guest List — Salon No. ${state.room.id}`}>
        <p class="text-sm text-ink/75">Room code</p>
        <p class="text-3xl font-bold tracking-widest text-ink">{state.room.id}</p>

        <ul class="flex flex-col gap-2">
          {#each activePlayers(state.room) as player (player.id)}
            <li class="rounded-md border border-marigold/30 px-3 py-2 text-base">
              {player.name}
              {#if player.id === state.room.hostPlayerId}
                <span class="inline-flex items-center gap-1 text-xs text-ink/60">
                  <Crown size={12} class="text-marigold" aria-hidden="true" />
                  (host)
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      </GiltFrame>

      {#if isHost}
        <!--
          T007 decision -- every host setting gets its OWN InfoTooltip; the
          curated-mode tooltip is NOT extended to cover the phrase-count
          selector and the write-in toggle.

          A shared tooltip was the tempting option (they are all curated
          sub-settings) and was rejected for two reasons. First, the three
          have genuinely different consequences: the mode control changes
          where phrases come from, the count control changes how much choice
          each guest gets, and the write-in toggle decides whether the
          curated deck is binding at all. Folding them together would force
          copy explaining a cluster, which is what the tooltips exist to
          avoid. Second, the tooltip sits on the mode control's label row,
          several controls above -- a host adjusting the count would have to
          know to look upward for its explanation.

          One tooltip per setting also gives T009 a rule it can derive from
          the rendered DOM (each host setting input has an info affordance in
          its row) rather than a per-cluster exception table.

          The small-game acknowledgement is treated as its own call, per the
          task: it is not a curated setting, and it is a confirmation rather
          than a configuration -- but it is still a host-only checkbox that
          changes what the host is permitted to do, so it is covered too.
        -->
        <InfoTooltip
          label="About force monochrome"
          explanation="Hides the color palette from everyone's drawing tool, for the whole game."
        >
          <label
            for="monochrome-toggle"
            class="flex items-center gap-2 text-sm font-medium text-ink/90"
          >
            <input
              id="monochrome-toggle"
              type="checkbox"
              checked={state.room.monochromeOnly}
              on:change={handleToggleMonochrome}
            />
            Enforce a Monochrome Decree
          </label>
        </InfoTooltip>

        <div class="flex flex-col gap-1">
          <InfoTooltip
            label="About turn timer"
            explanation="Sets a duration for each turn; once it elapses, the room can advance a stalled round via a timeout vote."
          >
            <label for="turn-timer-select" class="text-sm font-medium text-ink/90">
              Allotted Contemplation Period
            </label>
          </InfoTooltip>
          <select
            id="turn-timer-select"
            class="rounded-md border border-marigold/30 px-3 py-2 text-base"
            value={state.room.turnTimerMinutes ?? ''}
            on:change={handleTurnTimerChange}
          >
            {#each TURN_TIMER_OPTIONS as option (option.value)}
              <option value={option.value ?? ''}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <InfoTooltip
            label="What's a lap?"
            explanation="A lap is one full trip of a book around the circle. This sets how many laps happen before Reveal."
          >
            <label for="laps-per-book-select" class="text-sm font-medium text-ink/90">
              Laps Per Book
            </label>
          </InfoTooltip>
          <select
            id="laps-per-book-select"
            class="rounded-md border border-marigold/30 px-3 py-2 text-base"
            value={lapsPerBookValue}
            on:change={handleLapsPerBookChange}
          >
            {#each LAPS_PER_BOOK_OPTIONS as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <InfoTooltip
            label="How does curated mode work?"
            explanation="Curated deals every guest a private hand of phrases to choose from, and no two players are ever offered the same phrase."
          >
            <label for="prompt-mode-select" class="text-sm font-medium text-ink/90">
              Prompt Mode
            </label>
          </InfoTooltip>
          <select
            id="prompt-mode-select"
            class="rounded-md border border-marigold/30 px-3 py-2 text-base"
            value={state.room.promptMode}
            on:change={handlePromptModeChange}
          >
            <option value="free-form">Free-form — guests compose their own</option>
            <option value="curated">Curated — deal each guest a hand</option>
          </select>
        </div>

        {#if state.room.promptMode === 'curated'}
          <div class="flex flex-col gap-1">
            <InfoTooltip
              label="How large is each hand?"
              explanation="How many phrases each guest is dealt to choose from. A larger hand means more choice, and fewer guests settling for a phrase they didn't much like."
            >
              <label for="curated-prompt-count-select" class="text-sm font-medium text-ink/90">
                Phrases Per Player
              </label>
            </InfoTooltip>
            <select
              id="curated-prompt-count-select"
              class="rounded-md border border-marigold/30 px-3 py-2 text-base"
              value={state.room.curatedPromptCount ?? DEFAULT_CURATED_PROMPT_COUNT}
              on:change={handleCuratedPromptCountChange}
            >
              {#each CURATED_PROMPT_COUNT_OPTIONS as option (option)}
                <option value={option}>{option} phrases</option>
              {/each}
            </select>
          </div>

          <InfoTooltip
            label="About permitting a write-in"
            explanation="Leaves the dealt hand as an offer rather than a rule: a guest may ignore it and write their own opening phrase. Turn it off to keep every book starting from the curated bank."
          >
            <label
              for="allow-prompt-write-in-toggle"
              class="flex items-center gap-2 text-sm font-medium text-ink/90"
            >
              <input
                id="allow-prompt-write-in-toggle"
                type="checkbox"
                checked={state.room.allowPromptWriteIn}
                on:change={handleAllowWriteInToggle}
              />
              Permit guests to write their own instead
            </label>
          </InfoTooltip>
        {/if}

        <p class="text-xs text-ink/60">Player count: recommend 4+ players, minimum 3.</p>

        {#if belowMinimumPlayers}
          <InfoTooltip
            label="About proceeding with a small salon"
            explanation="Below three guests a book returns to its author almost at once, so a phrase has barely any chain to drift along — the reveal has little to show. Ticking this lets the exhibition begin anyway."
          >
            <label class="flex items-start gap-2 text-sm text-ink/90">
              <input type="checkbox" bind:checked={acknowledgeSmallGame} class="mt-1" />
              I am aware this salon is intimately attended (fewer than three guests) and wish to proceed
              nonetheless
            </label>
          </InfoTooltip>
        {/if}

        <button
          type="button"
          class="chamfer-frame bg-bubblegum px-4 py-2 text-base font-medium text-white [--chamfer-color:theme(colors.butter)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={belowMinimumPlayers && !acknowledgeSmallGame}
          on:click={handleStartGame}
        >
          <span class="inline-flex items-center gap-1.5">
            <Sparkles size={18} aria-hidden="true" />
            Commence the Exhibition
          </span>
        </button>
      {/if}
    </div>
  {/if}
</div>
