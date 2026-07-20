<script lang="ts">
  import { X } from '@lucide/svelte';
  import GiltFrame from './GiltFrame.svelte';

  /**
   * Rules Overview — a docent-voice explanation of the core game loop
   * (plan-in-game-rules-and-guidance). Rendered as a modal overlay so it
   * can be opened from the Salon Footer's "?" button on any view; never
   * shown automatically. The parent controls when it opens.
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
          Every salon follows the same quiet ritual. A guest settles on an opening phrase —
          composed at the blank page, or chosen from a hand the house deals them, as the host
          has arranged it.
        </p>
        <p>
          The next player draws that phrase exactly as written, sight unseen of anything but the
          page in front of them.
        </p>
        <p>
          Then a third guest writes a new phrase — but only from studying that drawing, never
          having seen the original text. Writing and drawing alternate, and the book passes around
          the circle, each guest working from only what the guest before them left behind.
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
