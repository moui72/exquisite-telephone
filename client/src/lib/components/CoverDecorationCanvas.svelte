<script lang="ts">
  import type { DrawOps } from '@exquisite-telephone/shared';

  /**
   * STUB (T009 red). Real implementation lands in T010: reuses
   * DrawingCanvas, is pre-stamped "<username>'s book", honors
   * Room.monochromeOnly, and edits a client-local draft cover without any
   * per-stroke emit. This placeholder exists only so the T009 red test
   * compiles and fails at runtime.
   */
  export let username: string;
  export let ops: DrawOps = [];
  export let onOpsChange: (next: DrawOps) => void = () => {};
  export let monochromeOnly = false;

  // Consume props so the stub compiles without unused-var complaints.
  $: void [ops, onOpsChange, monochromeOnly];
</script>

<div data-cover-decoration-canvas data-username={username}></div>
