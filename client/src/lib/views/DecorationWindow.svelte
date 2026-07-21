<script lang="ts">
  import { session as defaultSession } from '../stores/index.js';
  import type { SessionStore } from '../stores/session.js';

  /**
   * STUB (T011 red). Real implementation lands in T012: the full-view
   * decoration screen for `Room.status === 'decorating'` — the cover
   * canvas, the shared 2-minute countdown from decorationWindowStartedAt,
   * a "Present your cover" submit-early control, and a submitted-count
   * readout. This placeholder exists only so the T011 red test compiles
   * and fails at runtime.
   */
  export let session: SessionStore = defaultSession;
  $: void session;
</script>

<div data-decoration-window></div>
