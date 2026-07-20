<script lang="ts">
  import { X } from '@lucide/svelte';
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
      <div class="flex flex-col gap-3 text-sm text-ink/90">
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
          The host arranges two things beforehand that change the evening's shape. Where opening
          phrases come from: guests may compose their own, or the house may deal each of them a
          curated hand to choose from. And how long each book runs — one lap of the circle, or as
          many as three, which sends every book past every guest again.
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
