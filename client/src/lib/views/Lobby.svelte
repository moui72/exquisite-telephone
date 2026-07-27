<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { activePlayers, defaultLapsPerBook } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import { Crown, Sparkles } from '@lucide/svelte';
  import GiltFrame from '../components/GiltFrame.svelte';
  import InfoTooltip from '../components/InfoTooltip.svelte';
  import { copyToClipboard } from '../clipboard.js';

  export let session: SessionStore = defaultSession;

  let mode: 'create' | 'join' = 'create';
  let displayName = '';
  let roomCodeInput = '';
  let acknowledgeSmallGame = false;

  // Inline self-rename in the guest roster (F002, ui.md Lobby View): a player
  // clicks their own entry to edit their display name while in the lobby.
  // Empty/whitespace-only submissions are ignored client-side, matching the
  // server's trimmed-non-empty rule (datamodel.md — Display-name rename).
  let editingName = false;
  let nameDraft = '';

  function startEditingName(currentName: string) {
    nameDraft = currentName;
    editingName = true;
  }

  async function handleRenameSubmit() {
    const trimmed = nameDraft.trim();
    editingName = false;
    if (trimmed) await session.setDisplayName(trimmed);
  }

  // Click-to-copy the room code (ui.md Lobby View). The confirmation is a
  // brief inline cue rendered in a child <span>, not a toast — no toast
  // system exists, and keeping it a child element keeps the code element's
  // own text node equal to the bare code for callers/tests that match it.
  let copied = false;
  let copiedResetTimer: ReturnType<typeof setTimeout> | undefined;

  async function handleCopyCode(code: string) {
    if (await copyToClipboard(code)) {
      copied = true;
      clearTimeout(copiedResetTimer);
      copiedResetTimer = setTimeout(() => (copied = false), 2000);
    }
  }

  // Copy-join-link context menu (ui.md Lobby View). Opened by the native
  // contextmenu event on pointer devices and by a long-press on touch; a
  // minimal custom overlay with a single action, dismissed on outside
  // click / Escape. The join link points at this same SPA — see the Foyer
  // ?room= pre-fill — so no server route is involved.
  let contextMenuOpen = false;
  let contextMenuX = 0;
  let contextMenuY = 0;

  // Long-press tuning for touch. 500ms is the pinned threshold: long enough
  // that a normal tap (which should copy the bare code, T001) never trips
  // it, short enough to feel deliberate. `suppressNextClick` swallows the
  // click the browser synthesises after a touch long-press so it does not
  // also fire tap-to-copy.
  const LONG_PRESS_MS = 500;
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressNextClick = false;

  function openContextMenuAt(x: number, y: number) {
    contextMenuX = x;
    contextMenuY = y;
    contextMenuOpen = true;
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    openContextMenuAt(event.clientX, event.clientY);
  }

  function handleRoomCodeClick(code: string) {
    // A click synthesised right after a touch long-press is swallowed here
    // (the flag is consumed later by the window handler) so it never
    // tap-copies.
    if (suppressNextClick) return;
    void handleCopyCode(code);
  }

  function handleTouchStart(event: TouchEvent) {
    clearTimeout(longPressTimer);
    const touch = event.touches[0];
    const x = touch?.clientX ?? 0;
    const y = touch?.clientY ?? 0;
    longPressTimer = setTimeout(() => {
      suppressNextClick = true;
      openContextMenuAt(x, y);
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer);
  }

  function closeContextMenu() {
    contextMenuOpen = false;
  }

  // The shareable join link for a room code — an `<origin>/?room=<code>` URL
  // pointing at this same SPA (see the Foyer ?room= pre-fill). Used both by
  // the visible click-to-copy chip and the context menu's "copy join link".
  function joinLinkFor(code: string): string {
    return `${window.location.origin}/?room=${code}`;
  }

  async function handleCopyJoinLink(code: string) {
    closeContextMenu();
    await handleCopyCode(joinLinkFor(code));
  }

  // Context-menu "copy room code" — copies the bare code, mirroring the
  // room-code tap-to-copy so the action is discoverable from the menu too.
  async function handleCopyRoomCodeFromMenu(code: string) {
    closeContextMenu();
    await handleCopyCode(code);
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (contextMenuOpen && event.key === 'Escape') closeContextMenu();
  }

  let contextMenuEl: HTMLElement | undefined;

  function handleWindowClick(event: MouseEvent) {
    // Consume the suppressed post-long-press click without dismissing.
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (!contextMenuOpen) return;
    if (contextMenuEl && contextMenuEl.contains(event.target as Node)) return;
    closeContextMenu();
  }

  onDestroy(() => {
    clearTimeout(copiedResetTimer);
    clearTimeout(longPressTimer);
  });

  // Foyer join-link pre-fill (ui.md Lobby View / Foyer). When the app is
  // opened with a `?room=` query parameter — the shareable link produced by
  // "copy join link" — select the join tab and seed the room-code field.
  // Purely client-side convenience: it never auto-joins. The param is then
  // stripped from the address bar so a later manual share of the current URL
  // does not leak a stale code (URL-param-hygiene open question resolved to
  // strip).
  onMount(() => {
    const room = new URLSearchParams(window.location.search).get('room');
    if (room) {
      roomCodeInput = room;
      mode = 'join';
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  });

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

  // The short options (0.5/1/1.5/2) are fractional minutes for a rapid-fire
  // pace — labeled in seconds/minutes so the fraction is never shown (see
  // shared Room.turnTimerMinutes and ui.md Lobby View).
  const TURN_TIMER_OPTIONS: {
    value: 0.5 | 1 | 1.5 | 2 | 15 | 30 | 60 | 240 | 720 | null;
    label: string;
  }[] = [
    { value: null, label: 'Off' },
    { value: 0.5, label: '30 seconds' },
    { value: 1, label: '60 seconds' },
    { value: 1.5, label: '90 seconds' },
    { value: 2, label: '2 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 240, label: '4 hours' },
    { value: 720, label: '12 hours' },
  ];

  async function handleTurnTimerChange(event: Event) {
    const raw = (event.target as HTMLSelectElement).value;
    const turnTimerMinutes =
      raw === '' ? null : (Number(raw) as 0.5 | 1 | 1.5 | 2 | 15 | 30 | 60 | 240 | 720);
    await session.setTurnTimer(turnTimerMinutes);
  }

  async function handlePaletteModeChange(event: Event) {
    const mode = (event.target as HTMLSelectElement).value as
      | 'monochrome'
      | 'primary'
      | 'standard'
      | 'extended';
    await session.setPaletteMode(mode);
  }

  async function handleToggleFillTool(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    await session.setFillTool(checked);
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

<svelte:window on:keydown={handleWindowKeydown} on:click={handleWindowClick} />

<div class="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 p-4 sm:p-6">
  {#if !state.room}
    <div class="flex flex-col items-center gap-1 text-center">
      <h1
        class="bg-gradient-to-b from-gold via-[#ECD79A] to-gold bg-clip-text text-4xl
          font-title tracking-wide text-transparent drop-shadow-[0_2px_3px_rgba(20,6,12,0.5)]
          sm:text-6xl"
      >
        Exquisite Telephone
      </h1>
      <p class="max-w-sm text-sm text-champagne/75">
        A salon game of drawings whispered down the line. Gather your guests, then write, draw, and
        reveal.
      </p>
    </div>

    <GiltFrame caption="The Foyer — RSVP Required">
      <div role="tablist" aria-label="Join or create a room" class="flex gap-2">
        <!--
          Both tabs share the same slim chamfered silhouette; only the
          active one gets the gold ring and sapphire fill. Inactive
          tabs are a quiet tinted cut-corner shape with no outline at
          all — a stroke on an unselected tab competed with the frame.
        -->
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          class="flex-1 px-4 py-3 text-sm font-medium sm:py-2 {mode === 'create'
            ? 'chamfer-frame chamfer-slim bg-sapphire text-white [--chamfer-color:theme(colors.gold)]'
            : 'chamfer-frame chamfer-slim bg-gold/15 text-ink/60 [--chamfer-color:transparent] hover:bg-gold/25'}"
          on:click={() => (mode = 'create')}
        >
          Create room
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'join'}
          class="flex-1 px-4 py-3 text-sm font-medium sm:py-2 {mode === 'join'
            ? 'chamfer-frame chamfer-slim bg-sapphire text-white [--chamfer-color:theme(colors.gold)]'
            : 'chamfer-frame chamfer-slim bg-gold/15 text-ink/60 [--chamfer-color:transparent] hover:bg-gold/25'}"
          on:click={() => (mode = 'join')}
        >
          Join room
        </button>
      </div>

      <form class="mt-4 flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
        <label class="flex flex-col gap-1 text-sm font-medium text-ink/90">
          Display name
          <input
            class="rounded-md border border-gold/30 px-3 py-3 text-base sm:py-2"
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
              class="rounded-md border border-gold/30 px-3 py-3 text-base uppercase tracking-widest sm:py-2"
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
          class="chamfer-frame bg-sapphire px-4 py-3 text-base font-medium text-white [--chamfer-color:theme(colors.champagne)] sm:py-2"
        >
          {mode === 'create' ? 'Create room' : 'Join room'}
        </button>
      </form>
    </GiltFrame>
  {:else}
    <div class="flex flex-col gap-4">
      <GiltFrame caption={`Guest List — Salon No. ${state.room.id}`}>
        <!--
          The whole guest-list widget is the context-menu / long-press target
          (ui.md Lobby View, F002): a right-click or touch long-press anywhere
          on it opens the copy menu, not just on the room code. The handlers
          live on this wrapping div so the room code, the join-link chip, and
          the player roster all share one trigger.

          The contextmenu/long-press handlers are a pointer- and touch-only
          convenience: keyboard and AT users already reach every copy action
          through the real room-code button and the join-link chip below, so
          this wrapper is not itself an interactive control and carries no
          ARIA role.
        -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          data-testid="guest-list"
          on:contextmenu={handleContextMenu}
          on:touchstart={handleTouchStart}
          on:touchend={cancelLongPress}
          on:touchmove={cancelLongPress}
          on:touchcancel={cancelLongPress}
        >
          <p class="text-sm text-ink/75">Room code</p>
          <button
            type="button"
            title="Click to copy the room code — right-click or long-press for more"
            class="inline-flex items-baseline gap-2 text-left text-3xl font-bold tracking-widest text-ink"
            on:click={() => handleRoomCodeClick(state.room?.id ?? '')}
          >
            <span data-testid="room-code">{state.room.id}</span><span
              class="text-xs font-medium tracking-normal text-gold transition-opacity {copied
                ? 'opacity-100'
                : 'opacity-0'}"
              aria-live="polite">Copied</span
            >
          </button>

          <!--
            Join-link chip (F001): the shareable link shown in smaller,
            secondary text directly under the room code, click-to-copy, so it
            is discoverable at a glance rather than hidden behind the menu.
            A separate element from the room-code span, so the room code's own
            text node stays the bare code (v0.5.0 garbled-code guard).
          -->
          <button
            type="button"
            data-testid="join-link-chip"
            title="Click to copy the join link"
            class="mt-1 block max-w-full truncate text-left text-xs font-medium text-ink/55 hover:text-ink/80"
            on:click={() => handleCopyJoinLink(state.room?.id ?? '')}
          >
            {joinLinkFor(state.room.id)}
          </button>

          {#if contextMenuOpen}
            <div
              bind:this={contextMenuEl}
              role="menu"
              class="fixed z-50 min-w-[12rem] rounded-md border border-gold/40 bg-champagne p-1 shadow-lg"
              style="left: {contextMenuX}px; top: {contextMenuY}px;"
            >
              <button
                type="button"
                class="w-full rounded px-3 py-2 text-left text-sm text-ink hover:bg-gold/15"
                on:click={() => handleCopyRoomCodeFromMenu(state.room?.id ?? '')}
              >
                Copy room code
              </button>
              <button
                type="button"
                class="w-full rounded px-3 py-2 text-left text-sm text-ink hover:bg-gold/15"
                on:click={() => handleCopyJoinLink(state.room?.id ?? '')}
              >
                Copy join link
              </button>
            </div>
          {/if}

          <ul class="mt-2 flex flex-col gap-2">
            {#each activePlayers(state.room) as player (player.id)}
              <li class="rounded-md border border-gold/30 px-3 py-2 text-base">
                {#if player.id === state.player?.id && editingName}
                  <form
                    class="inline-flex items-center gap-2"
                    on:submit|preventDefault={handleRenameSubmit}
                  >
                    <input
                      class="rounded border border-gold/40 px-2 py-1 text-base"
                      type="text"
                      aria-label="Display name"
                      bind:value={nameDraft}
                      autocomplete="name"
                    />
                    <button
                      type="submit"
                      class="chamfer-frame chamfer-slim bg-sapphire px-3 py-1 text-sm font-medium text-white [--chamfer-color:theme(colors.gold)]"
                    >
                      Save
                    </button>
                  </form>
                {:else}
                  {player.name}
                  {#if player.id === state.player?.id}
                    <span class="text-xs text-ink/60">(you)</span>
                    <button
                      type="button"
                      class="text-xs text-gold underline hover:text-gold/80"
                      aria-label="Edit your display name"
                      on:click={() => startEditingName(player.name)}
                    >
                      edit
                    </button>
                  {/if}
                  {#if player.id === state.room.hostPlayerId}
                    <span class="inline-flex items-center gap-1 text-xs text-ink/60">
                      <Crown size={12} class="text-gold" aria-hidden="true" />
                      (host)
                    </span>
                  {/if}
                {/if}
              </li>
            {/each}
          </ul>
        </div>
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
        <!-- Host settings framed as a champagne placard so the labels read
             on parchment rather than the bordeaux damask wall (redesign). -->
        <div class="plaque flex flex-col gap-4 p-5">
        <div class="flex flex-col gap-1">
          <InfoTooltip
            label="About the palette mode"
            explanation="Sets everyone's drawing palette for the whole game: Monochrome hides the palette entirely and forces the default ink, or pick a color set — a small primary set, the standard palette, or an extended one."
          >
            <label for="palette-mode-select" class="text-sm font-medium text-ink/90">
              Palette Mode
            </label>
          </InfoTooltip>
          <select
            id="palette-mode-select"
            class="rounded-md border border-gold/30 px-3 py-2 text-base"
            value={state.room.paletteMode}
            on:change={handlePaletteModeChange}
          >
            <option value="monochrome">Monochrome — no palette, default ink only</option>
            <option value="primary">Primary — primary colors, black and white</option>
            <option value="standard">Standard — the default palette</option>
            <option value="extended">Extended — a larger palette</option>
          </select>
        </div>

        <InfoTooltip
          label="About the fill tool"
          explanation="Leaves the bucket fill tool available in everyone's drawing toolbar. Turn it off to allow freehand strokes only, for the whole game."
        >
          <label
            for="allow-fill-toggle"
            class="flex items-center gap-2 text-sm font-medium text-ink/90"
          >
            <input
              id="allow-fill-toggle"
              type="checkbox"
              checked={state.room.allowFillTool}
              on:change={handleToggleFillTool}
            />
            Permit the Fill Tool
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
            class="rounded-md border border-gold/30 px-3 py-2 text-base"
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
            class="rounded-md border border-gold/30 px-3 py-2 text-base"
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
            class="rounded-md border border-gold/30 px-3 py-2 text-base"
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
              class="rounded-md border border-gold/30 px-3 py-2 text-base"
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
          class="chamfer-frame bg-sapphire px-4 py-2 text-base font-medium text-white [--chamfer-color:theme(colors.champagne)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={belowMinimumPlayers && !acknowledgeSmallGame}
          on:click={handleStartGame}
        >
          <span class="inline-flex items-center gap-1.5">
            <Sparkles size={18} aria-hidden="true" />
            Commence the Exhibition
          </span>
        </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
