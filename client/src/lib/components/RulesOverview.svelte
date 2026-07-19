<script lang="ts">
  import GiltFrame from './GiltFrame.svelte';

  /**
   * Rules Overview — a docent-voice explanation of the core game loop
   * (plan-in-game-rules-and-guidance). Dismissible, never shown
   * automatically; the parent (Lobby) controls when it opens.
   */
  export let onClose: () => void;
</script>

<div class="flex flex-col gap-3" role="dialog" aria-label="How this salon works">
  <GiltFrame caption="A Docent's Explanation">
    <div class="flex flex-col gap-3 text-sm text-ink/90">
      <p>
        Every salon follows the same quiet ritual. A guest is handed a blank page and asked to
        write a phrase — anything they like.
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
  </GiltFrame>

  <button
    type="button"
    class="min-h-11 self-end rounded-md border border-marigold/60 bg-butter px-4 py-2 text-sm font-medium text-ink"
    on:click={onClose}
  >
    Close
  </button>
</div>
