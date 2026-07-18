<script lang="ts">
  import GiltFrame from './GiltFrame.svelte';
  export let caption: string;
</script>

<GiltFrame {caption}>
  <p>hello from inside the frame</p>
</GiltFrame>
