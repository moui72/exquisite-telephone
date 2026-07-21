<script lang="ts">
  import type { DrawOps } from '@exquisite-telephone/shared';
  import DrawingCanvas from './DrawingCanvas.svelte';
  import GiltFrame from './GiltFrame.svelte';

  /**
   * The cover-decoration canvas (ui.md Cover Decoration): the origin
   * author decorates their OWN book's cover on the same DrawingCanvas and
   * toolbar as a turn drawing, framed as the easel's GiltFrame and
   * pre-stamped "<username>'s book" in the plaque lettering. Honors
   * Room.monochromeOnly (passed straight through to DrawingCanvas). The ink
   * is a client-local draft — `onOpsChange` surfaces edits to the parent,
   * which holds the draft; there is NO per-stroke socket emit here (covers
   * finalize once, via onSubmitCover — datamodel.md / infrastructure.md).
   */
  export let username: string;
  export let ops: DrawOps = [];
  export let onOpsChange: (next: DrawOps) => void = () => {};
  export let monochromeOnly = false;
</script>

<GiltFrame caption="The Easel — Your Book's Cover">
  <div class="flex flex-col gap-3">
    <p class="text-center font-mono text-sm text-ink/80">{username}'s book</p>
    <DrawingCanvas {ops} {onOpsChange} {monochromeOnly} />
  </div>
</GiltFrame>
