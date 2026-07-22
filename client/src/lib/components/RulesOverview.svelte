<script lang="ts">
  import { X } from '@lucide/svelte';
  import { APP_VERSION } from '../appVersion';
  import GiltFrame from './GiltFrame.svelte';

  /**
   * Rules Overview — a docent-voice explanation of the core game loop
   * (plan-in-game-rules-and-guidance). Rendered as a modal overlay so it
   * can be opened from the Salon Footer's "?" button on any view; never
   * shown automatically. The parent controls when it opens.
   */
  /*
   * T011 decision -- what this panel covers.
   *
   * Rule adopted: the panel explains anything that changes the SHAPE of a
   * game -- what a turn is, how many times a book goes round, where an
   * opening phrase comes from -- and leaves per-setting detail to the
   * Lobby's info tooltips. The plan's lean, evaluated rather than assumed,
   * and it holds up: the tooltips are read by the host at the moment of
   * choosing, while this panel is read by any guest trying to understand
   * the game in front of them. Those are different questions, so
   * duplicating the tooltips here would add length without adding answers,
   * and length is the panel's real cost -- an overview nobody finishes is
   * worse than a short one.
   *
   * Applied to the four omissions: laps per book and curated mode are IN
   * (both change the shape of a game -- how long a book runs, and whether
   * you author or choose). The turn timer is IN but only as the one-line
   * fact that a turn may be timed, since a guest who sees a countdown
   * needs to know what it is; its durations and the timeout vote stay with
   * the tooltip. Prompt rating is OUT of this panel -- T004 already placed
   * its explanation inline at the control, and repeating it here is the
   * two-copies-of-one-claim drift this plan exists to fix.
   */
  export let onClose: () => void;

  /**
   * The panel is tabbed (ui.md Rules Overview Panel): a Rules tab with the
   * docent-voice game-loop copy (selected by default on open) and an About
   * tab crediting the game's inspirations. Panels are conditionally
   * rendered, not merely hidden, so only the active tab's copy is in the
   * DOM.
   */
  type Tab = 'rules' | 'about';
  let activeTab: Tab = 'rules';
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-velvet/50 p-4"
  role="presentation"
  on:click|self={onClose}
>
  <div
    class="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto"
    role="dialog"
    aria-modal="true"
    aria-label="How this salon works"
  >
    <GiltFrame caption="A Docent's Explanation">
      <!--
        Tabs as engraved brass placards (ui.md Rules Overview Panel). The
        utility face (Space Mono, uppercase, letter-spaced) sets them apart
        from the Fraunces/Rubik body copy and reads as a museum label. The
        selected tab is a lit gilt plaque — solid marigold with dark velvet
        text and a gilt chamfer edge; the unselected tab recedes (muted ink,
        a faint marigold wash and text lift on hover). aria-selected, the
        tablist/tab/tabpanel roles, and native button focus are preserved;
        a marigold focus ring gives keyboard affordance.
      -->
      <div role="tablist" aria-label="Salon information" class="mb-3 flex items-end gap-1.5 border-b border-marigold/40">
        <button
          type="button"
          role="tab"
          id="rules-tab"
          aria-selected={activeTab === 'rules'}
          aria-controls="rules-panel"
          class="chamfer-frame chamfer-slim min-h-9 px-4 font-mono text-xs font-medium uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-1 {activeTab ===
          'rules'
            ? 'bg-marigold text-velvet shadow-sm [--chamfer-color:theme(colors.marigold)]'
            : 'text-ink/50 hover:bg-marigold/10 hover:text-ink'}"
          on:click={() => (activeTab = 'rules')}
        >
          Rules
        </button>
        <button
          type="button"
          role="tab"
          id="about-tab"
          aria-selected={activeTab === 'about'}
          aria-controls="about-panel"
          class="chamfer-frame chamfer-slim min-h-9 px-4 font-mono text-xs font-medium uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-1 {activeTab ===
          'about'
            ? 'bg-marigold text-velvet shadow-sm [--chamfer-color:theme(colors.marigold)]'
            : 'text-ink/50 hover:bg-marigold/10 hover:text-ink'}"
          on:click={() => (activeTab = 'about')}
        >
          About
        </button>
      </div>

      {#if activeTab === 'rules'}
      <div id="rules-panel" role="tabpanel" aria-labelledby="rules-tab" class="flex flex-col gap-3 text-sm text-ink/90">
        <p>
          Every salon follows the same quiet ritual. A guest settles on an opening phrase — composed
          at the blank page, or chosen from a hand the house deals them, as the host has arranged
          it.
        </p>
        <p>
          The next player draws that phrase exactly as written, sight unseen of anything but the
          page in front of them.
        </p>
        <p>
          Then a third guest writes a new phrase — but only from studying that drawing, never having
          seen the original text. Writing and drawing alternate, and the book keeps travelling the
          circle, each guest working from only what the guest before them left behind.
        </p>
        <p>
          How long a book runs is the host's arrangement too — one lap of the circle, or as many as
          three, which sends every book past every guest again.
        </p>
        <p>
          The host may also allot a contemplation period, in which case a turn carries a clock. It
          is a courtesy to the room, not a guillotine — the house has ways of proceeding when a
          guest is detained.
        </p>
        <p>
          When the round concludes, Reveal shows the whole chain, start to finish — every phrase and
          every drawing, laid out together so the house can see exactly how far each idea drifted.
        </p>
      </div>
      {/if}

      {#if activeTab === 'about'}
      <div id="about-panel" role="tabpanel" aria-labelledby="about-tab" class="flex flex-col gap-3 text-sm text-ink/90">
        <p>
          This salon owes its pastimes to three older ones. From the Surrealists' <em
            >Exquisite Corpse</em
          > it takes the joy of a work assembled blind, each hand adding to what it cannot fully see.
          From the parlour game of <em>Telephone</em> it takes the delicious drift of a message
          whispered ear to ear until it arrives as something else entirely.
        </p>
        <p>
          And it shares the alternating write-then-draw ritual with <em>Telestrations</em>. That
          name is a trademark of its respective owner; Exquisite Telephone is an independent work,
          not affiliated with, endorsed by, or sponsored by it — the nod is one of gratitude, not
          association.
        </p>
        <!-- The build's version, stated plainly and prominently beside the
             source link ([[ui]] Rules Overview Panel): the same APP_VERSION
             build constant the footer stamps, but presented as readable
             labeled copy so a player who opens About to report an issue
             finds the release they're on. -->
        <p class="font-mono text-base font-semibold text-ink">Version {APP_VERSION}</p>
        <p class="flex flex-wrap gap-x-4 gap-y-1">
          <a
            href="https://github.com/moui72/exquisite-telephone"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View the Exquisite Telephone source code on GitHub (opens in a new tab)"
            class="text-bubblegum underline hover:text-bubblegum/80"
          >
            Source code
          </a>
          <a
            href="https://github.com/sponsors/moui72"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support Exquisite Telephone on GitHub Sponsors (opens in a new tab)"
            class="text-bubblegum underline hover:text-bubblegum/80"
          >
            Sponsor this project
          </a>
        </p>
      </div>
      {/if}

      <button
        slot="plaque-action"
        type="button"
        class="chamfer-frame chamfer-slim inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 bg-bubblegum px-4 text-sm font-medium text-white hover:bg-bubblegum/90 [--chamfer-color:theme(colors.marigold)]"
        on:click={onClose}
      >
        <X size={16} aria-hidden="true" />
        Close
      </button>
    </GiltFrame>
  </div>
</div>
