<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    activePlayers,
    computeNextEntries,
    defaultLapsPerBook,
    parseDrawOps,
    serializeDrawOps,
  } from '@exquisite-telephone/shared';
  import type { DrawOps, PromptRatingValue } from '@exquisite-telephone/shared';
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';
  import { coverDraft, draftFor } from '../stores/coverDraft.js';
  import { graceMsFor } from './grace.js';
  import { Send, ThumbsDown, ThumbsUp, Timer } from '@lucide/svelte';
  import DrawingCanvas from '../components/DrawingCanvas.svelte';
  import CoverDecorationCanvas from '../components/CoverDecorationCanvas.svelte';
  import TurnStatus from '../components/TurnStatus.svelte';
  import GiltFrame from '../components/GiltFrame.svelte';
  import InfoTooltip from '../components/InfoTooltip.svelte';

  export let session: SessionStore = defaultSession;

  let textValue = '';
  let drawnOps: DrawOps = [];

  // Ticks the countdown (ui.md Writing/Drawing View) once a second.
  // Registered/cleaned up across the component lifecycle (constitution
  // Quality Standards — touch/timer cleanup).
  let now = Date.now();
  let tickInterval: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    tickInterval = setInterval(() => {
      now = Date.now();
    }, 1000);
  });
  onDestroy(() => {
    if (tickInterval) clearInterval(tickInterval);
  });

  $: state = $session;
  $: myTurn =
    state.room && state.player
      ? computeNextEntries(state.room).find((e) => e.authorId === state.player!.id)
      : undefined;
  $: myBook = state.room && myTurn ? state.room.books.find((b) => b.id === myTurn!.bookId) : null;
  $: previousEntry =
    myBook && myTurn && myTurn.position > 0 ? myBook.entries[myTurn.position - 1] : null;
  // Distinguishes "finished my part of this round, waiting on others" from
  // a generic wait state (ui.md Writing/Drawing View): true when the
  // player has no entry offered this round, but still has an incomplete
  // book of their own elsewhere in the room.
  // A book's true completion length is activeCount * laps (its full run
  // through the active roster, all laps), not one lap (players.length) —
  // so the waiting state must hold for the whole game, not just the first
  // lap (datamodel.md Normalization Rules — Laps per book).
  $: activeCount = state.room ? activePlayers(state.room).length : 0;
  $: laps = state.room ? (state.room.lapsPerBook ?? defaultLapsPerBook(activeCount)) : 0;
  $: waitingForRoundToFinish =
    !myTurn &&
    state.room &&
    state.player &&
    state.room.books.some(
      (b) => b.originAuthorId === state.player!.id && b.entries.length < activeCount * laps,
    );

  // The player's own book, for the waiting-state cover-decoration canvas.
  $: myOwnBook =
    state.room && state.player
      ? (state.room.books.find((b) => b.originAuthorId === state.player!.id) ?? null)
      : null;

  // 30-second client-side grace (ui.md Cover Decoration; datamodel.md —
  // Cover decoration): when a new turn becomes ready while the player is
  // mid-decoration, a countdown precedes the turn view taking over. It is a
  // view-transition courtesy ONLY — it never touches the server-side
  // turn-timer deadline or the force-empty flow. Its duration is the full
  // GRACE_MS in normal runtime and a short window only for server-confirmed
  // e2e test traffic (T006 — grace.ts / infrastructure.md End-to-End Test
  // Gate); state.testTraffic is always false outside that gated seam.
  $: graceMs = graceMsFor(state.testTraffic);
  let wasDecorating = false;
  let graceDeadline: number | null = null;
  $: isWaitingDecoration = !myTurn && waitingForRoundToFinish;
  $: {
    if (isWaitingDecoration) {
      // On the decoration screen — arm the grace for the next turn.
      wasDecorating = true;
    } else if (myTurn && wasDecorating && graceDeadline === null) {
      // A turn became ready while decorating: hold the turn view back.
      graceDeadline = Date.now() + graceMs;
      wasDecorating = false;
    } else if (myTurn && graceDeadline === null) {
      wasDecorating = false;
    }
  }
  // Elapsed grace clears itself so the turn view takes over (`now` ticks).
  $: if (graceDeadline !== null && now >= graceDeadline) {
    graceDeadline = null;
  }
  $: graceActive = graceDeadline !== null && now < graceDeadline;
  $: graceSecondsLeft =
    graceDeadline !== null
      ? Math.min(graceMs / 1000, Math.max(0, Math.ceil((graceDeadline - now) / 1000)))
      : null;

  // The shared client-local draft for this player's own book (ui.md Cover
  // Decoration): the SAME draft the decorating window edits, keyed by book
  // id so ink drawn while waiting survives the writing → decorating swap.
  $: coverDraft_ = draftFor($coverDraft, myOwnBook?.id ?? null);
  function handleCoverOpsChange(ops: DrawOps) {
    if (myOwnBook) coverDraft.setOps(myOwnBook.id, ops);
  }
  function handleCoverTemplateChange(id: string | null) {
    if (myOwnBook) coverDraft.setTemplate(myOwnBook.id, id);
  }

  // Reset local draft state only when the *identity* of the assigned turn
  // changes (a genuinely new turn), not merely when `myTurn`'s object
  // reference changes due to an unrelated room broadcast (F1 regression —
  // feedback-main-3ea6.md). `computeNextEntries` returns a fresh object on
  // every call, so comparing by reference would clear drafts on any
  // broadcast, not just a real turn change.
  let previousTurnKey: string | null = null;
  $: turnKey = myTurn ? `${myTurn.bookId}:${myTurn.position}` : null;
  $: if (turnKey !== previousTurnKey) {
    previousTurnKey = turnKey;
    if (turnKey !== null) {
      textValue = '';
      drawnOps = [];
      selectedPrompt = null;
      promptRating = null;
    }
  }

  // Countdown to this player's individual deadline (datamodel.md
  // Normalization Rules — Turn timer): only shown when the host has set
  // Room.turnTimerMinutes. `now` re-evaluates this every tick.
  $: deadline =
    state.room && state.player && state.room.turnTimerMinutes && state.room.roundStartedAt != null
      ? state.room.roundStartedAt +
        state.room.turnTimerMinutes * 60_000 +
        (state.room.timerExtensions[state.player.id] ?? 0)
      : null;
  $: countdownLabel = deadline !== null ? formatCountdown(Math.max(0, deadline - now)) : null;

  function formatCountdown(msRemaining: number): string {
    const totalSeconds = Math.floor(msRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Curated opening turn (ui.md Writing/Drawing View, datamodel.md
  // Normalization Rules -- Curated prompts). Applies to position 0 only:
  // every later text turn is a blind guess and stays free-form in both
  // modes. Only ever this player's own hand -- never anyone else's.
  $: isCuratedOpeningTurn = myTurn?.position === 0 && state.room?.promptMode === 'curated';
  $: myDealtPrompts =
    isCuratedOpeningTurn && state.player ? (state.room?.dealtPrompts[state.player.id] ?? []) : [];
  $: allowWriteIn = state.room?.allowPromptWriteIn ?? false;

  /** The chosen dealt phrase, or the WRITE_IN sentinel. Reset per turn. */
  const WRITE_IN = '\u0000write-in';
  let selectedPrompt: string | null = null;

  $: curatedContent = selectedPrompt === WRITE_IN ? textValue.trim() : (selectedPrompt ?? '');

  async function handleSubmitCuratedPrompt() {
    if (!myTurn || !curatedContent) return;
    await session.submitEntry(myTurn.bookId, curatedContent);
  }

  async function handleSubmitText() {
    if (!myTurn || !textValue.trim()) return;
    await session.submitEntry(myTurn.bookId, textValue.trim());
  }

  // Prompt rating (ui.md Writing/Drawing View, datamodel.md
  // Normalization Rules -- Prompt rating). Position 1 ONLY: that is the
  // single drawing turn whose source is a book's opening phrase. Later
  // drawing turns depict a mid-chain guess, which is not a prompt and has
  // nothing to curate -- so "is a drawing turn" is deliberately NOT the
  // condition here.
  $: isOpeningPhraseDrawTurn = myTurn?.position === 1;

  /** null until the player touches the control -- untouched is the normal path. */
  let promptRating: PromptRatingValue | null = null;

  async function handleSubmitDrawing() {
    if (!myTurn || drawnOps.length === 0) return;
    // `?? undefined` so an uncast rating is omitted from the payload
    // rather than sent as null (T018).
    await session.submitEntry(myTurn.bookId, serializeDrawOps(drawnOps), promptRating ?? undefined);
  }

  function handleOpsChange(ops: DrawOps) {
    drawnOps = ops;
  }

  // Timeout-vote prompt (ui.md Writing/Drawing View): shown to every
  // eligible voter while a vote is open. Names the stalled player(s) by
  // name (never their in-progress content).
  $: pendingTimeoutVote = state.room?.pendingTimeoutVote ?? null;
  $: canVoteOnTimeout =
    pendingTimeoutVote !== null &&
    state.player !== null &&
    pendingTimeoutVote.eligibleVoterIds.includes(state.player.id);
  $: stalledPlayerNames =
    pendingTimeoutVote && state.room
      ? pendingTimeoutVote.stalledPlayerIds
          .map((id) => state.room!.players.find((p) => p.id === id)?.name ?? id)
          .join(', ')
      : '';

  async function handleCastTimeoutVote(choice: 'full' | 'half' | '15m' | 'force-empty') {
    await session.castTimeoutVote(choice);
  }
</script>

<div class="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
  {#if state.room}
    {#if state.room.nonContinuable && state.player?.id !== state.room.hostPlayerId}
      <p role="alert" class="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        This salon cannot continue — a guest was removed mid-round. The house awaits the host's
        restaging.
      </p>
    {/if}

    <TurnStatus room={state.room} />
  {/if}

  {#if countdownLabel !== null}
    <p
      data-testid="turn-timer-countdown"
      class="plaque inline-flex items-center gap-1.5 self-start px-3 py-1.5 text-sm font-medium text-amber-700"
    >
      <Timer size={16} aria-hidden="true" />
      Time remaining: {countdownLabel}
    </p>
  {/if}

  {#if canVoteOnTimeout}
    <div class="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-4">
      <p class="text-sm text-ink/90">
        {stalledPlayerNames} has yet to present their contribution to the salon. How shall the house proceed?
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-md border border-gold/60 bg-champagne px-3 py-1 text-sm text-ink"
          on:click={() => handleCastTimeoutVote('full')}
        >
          Grant a Full Turn
        </button>
        <button
          type="button"
          class="rounded-md border border-gold/60 bg-champagne px-3 py-1 text-sm text-ink"
          on:click={() => handleCastTimeoutVote('half')}
        >
          Grant a Half Turn
        </button>
        <button
          type="button"
          class="rounded-md border border-gold/60 bg-champagne px-3 py-1 text-sm text-ink"
          on:click={() => handleCastTimeoutVote('15m')}
        >
          Grant Fifteen Minutes
        </button>
        <button
          type="button"
          class="rounded-md border border-gold/60 bg-champagne px-3 py-1 text-sm text-ink"
          on:click={() => handleCastTimeoutVote('force-empty')}
        >
          Declare the Turn Forfeit
        </button>
      </div>
    </div>
  {/if}

  {#if graceActive}
    <!-- A turn is ready, but the player was mid-decoration: a 30-second
         client-side grace precedes the turn view taking over (ui.md Cover
         Decoration). The turn-timer deadline above is untouched. -->
    <p data-testid="grace-countdown" class="plaque px-5 py-4 text-center text-lg text-ink/80">
      Your next commission is ready — presenting your easel in {graceSecondsLeft}s…
    </p>
    {#if myOwnBook && state.player}
      <CoverDecorationCanvas
        username={state.player.name}
        ops={coverDraft_.ops}
        onOpsChange={handleCoverOpsChange}
        monochromeOnly={state.room?.monochromeOnly ?? false}
          coverTemplate={coverDraft_.template}
          onTemplateChange={handleCoverTemplateChange}
      />
    {/if}
  {:else if !myTurn}
    {#if waitingForRoundToFinish}
      <p class="plaque px-5 py-4 text-center text-lg text-ink/75">
        Awaiting the round's conclusion — adorn your book's cover while you wait.
      </p>
      {#if myOwnBook && state.player}
        <CoverDecorationCanvas
          username={state.player.name}
          ops={coverDraft_.ops}
          onOpsChange={handleCoverOpsChange}
          monochromeOnly={state.room?.monochromeOnly ?? false}
          coverTemplate={coverDraft_.template}
          onTemplateChange={handleCoverTemplateChange}
        />
      {/if}
    {:else}
      <p class="plaque px-5 py-4 text-center text-lg text-ink/75">Awaiting your next commission…</p>
    {/if}
  {:else}
    <GiltFrame caption="The Easel — Work in Progress">
      {#if previousEntry}
        <div class="flex flex-col gap-2">
          <p class="text-sm text-ink/60">What the last player made:</p>
          {#if previousEntry.type === 'text'}
            <p class="text-xl font-medium text-ink">{previousEntry.content}</p>
          {:else}
            <DrawingCanvas ops={parseDrawOps(previousEntry.content)} readOnly />
          {/if}
        </div>
      {/if}

      {#if isCuratedOpeningTurn}
        <p class="text-sm italic text-ink/60">
          Choose the phrase your book will chase. Yours alone — no other guest was offered these.
        </p>
        <form class="flex flex-col gap-4" on:submit|preventDefault={handleSubmitCuratedPrompt}>
          <fieldset class="flex flex-col gap-2">
            <legend class="text-sm font-medium text-ink/90">Your hand</legend>
            {#each myDealtPrompts as phrase (phrase)}
              <label class="flex items-center gap-2 text-base text-ink/90">
                <input
                  type="radio"
                  name="curated-prompt"
                  value={phrase}
                  bind:group={selectedPrompt}
                />
                {phrase}
              </label>
            {/each}
            {#if allowWriteIn}
              <label class="flex items-center gap-2 text-base text-ink/90">
                <input
                  type="radio"
                  name="curated-prompt"
                  value={WRITE_IN}
                  bind:group={selectedPrompt}
                />
                Write my own instead
              </label>
            {/if}
          </fieldset>

          {#if selectedPrompt === WRITE_IN}
            <label class="flex flex-col gap-1 text-sm font-medium text-ink/90">
              Your own phrase
              <input
                class="rounded-md border px-3 py-2 text-base"
                type="text"
                required
                bind:value={textValue}
                autocomplete="off"
              />
            </label>
          {/if}

          <button
            type="submit"
            data-testid="submit-curated"
            class="chamfer-frame bg-sapphire px-4 py-2 text-base text-white [--chamfer-color:theme(colors.champagne)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!curatedContent}
          >
            <span class="inline-flex items-center gap-1.5">
              <Send size={16} aria-hidden="true" />
              Present your contribution
            </span>
          </button>
        </form>
      {:else if myTurn.type === 'text'}
        <!-- The hint splits three ways (ui.md Writing/Drawing View). The
             blind-guess copy below is only true from position 1 onward; on
             the opening turn there is no preceding entry to guess from, so
             it gets its own framing. -->
        {#if myTurn.position === 0}
          <p class="text-sm italic text-ink/60">
            Set the phrase the rest of the circle will chase. Write something worth drawing —
            everything that follows begins here.
          </p>
        {:else}
          <p class="text-sm italic text-ink/60">
            Write blind: you have never been told the original phrase, only what you see drawn
            above. Guess the phrase that inspired it.
          </p>
        {/if}
        <form class="flex flex-col gap-4" on:submit|preventDefault={handleSubmitText}>
          <label class="flex flex-col gap-1 text-sm font-medium text-ink/90">
            Your phrase
            <input
              class="rounded-md border px-3 py-2 text-base"
              type="text"
              required
              bind:value={textValue}
              autocomplete="off"
            />
          </label>
          <button
            type="submit"
            data-testid="submit-text"
            class="chamfer-frame bg-sapphire px-4 py-2 text-base text-white [--chamfer-color:theme(colors.champagne)]"
          >
            <span class="inline-flex items-center gap-1.5">
              <Send size={16} aria-hidden="true" />
              Present your contribution
            </span>
          </button>
        </form>
      {:else}
        <p class="text-sm italic text-ink/60">
          Draw exactly what the phrase says — no more, no less. Resist the urge to add anything the
          words didn't ask for.
        </p>
        <div class="flex flex-col gap-4">
          <DrawingCanvas
            ops={drawnOps}
            onOpsChange={handleOpsChange}
            monochromeOnly={state.room?.monochromeOnly ?? false}
          />
          {#if isOpeningPhraseDrawTurn}
            <!--
              Optional and unobtrusive: submitting without touching it is
              the normal path, and it never gates the submit button. Both
              thumbs render regardless of where the phrase came from --
              branching by origin would leak which mode produced a phrase
              the player is not otherwise told about (ui.md).

              T004 decision -- the explanation of what this rating IS lives
              INLINE here, not in the Rules Overview panel, and not in both.
              The misreading being prevented ("am I judging the person who
              wrote this?") occurs at the instant the thumbs are seen, on a
              screen where the rules panel is closed; an explanation only
              reachable by opening a modal arrives after the player has
              already formed the wrong reading. Choosing "both" was rejected
              as well: two copies of the same claim drift apart, which is the
              precise failure this whole plan exists to fix. The clutter cost
              is paid down by reusing InfoTooltip -- collapsed to a single
              "(?)" until asked, matching the Lobby's established pattern.
            -->
            <fieldset class="border-0 p-0">
              <legend class="text-sm italic text-ink/60">Was this fun to draw?</legend>
              <InfoTooltip
                label="What is this rating for?"
                explanation="It tells the house which phrases are worth dealing again — nothing more. Your answer is anonymous, and it is never shown to anyone: not to the room, not to whoever wrote the phrase, not back to you. You are appraising the phrase, never the guest."
              >
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Thumbs up — fun to draw"
                    aria-pressed={promptRating === 'up'}
                    class="chamfer-frame px-3 py-1.5 text-ink [--chamfer-color:theme(colors.champagne)]"
                    class:bg-champagne={promptRating === 'up'}
                    on:click={() => (promptRating = promptRating === 'up' ? null : 'up')}
                  >
                    <ThumbsUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Thumbs down — not fun to draw"
                    aria-pressed={promptRating === 'down'}
                    class="chamfer-frame px-3 py-1.5 text-ink [--chamfer-color:theme(colors.champagne)]"
                    class:bg-champagne={promptRating === 'down'}
                    on:click={() => (promptRating = promptRating === 'down' ? null : 'down')}
                  >
                    <ThumbsDown size={16} aria-hidden="true" />
                  </button>
                </div>
              </InfoTooltip>
            </fieldset>
          {/if}
          <button
            type="button"
            data-testid="submit-drawing"
            class="chamfer-frame bg-sapphire px-4 py-2 text-base text-white [--chamfer-color:theme(colors.champagne)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={drawnOps.length === 0}
            on:click={handleSubmitDrawing}
          >
            <span class="inline-flex items-center gap-1.5">
              <Send size={16} aria-hidden="true" />
              Present your contribution
            </span>
          </button>
        </div>
      {/if}
    </GiltFrame>
  {/if}
</div>
