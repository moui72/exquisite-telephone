<script lang="ts">
  import Lobby from './lib/views/Lobby.svelte';
  import WritingDrawing from './lib/views/WritingDrawing.svelte';
  import { session } from './lib/stores/index.js';
  // Reveal (T017) is added later and swapped in based on Room.status.

  $: state = $session;
</script>

{#if !state.room || state.room.status === 'lobby'}
  <Lobby />
{:else if state.room.status === 'writing' || state.room.status === 'drawing'}
  <WritingDrawing />
{/if}
