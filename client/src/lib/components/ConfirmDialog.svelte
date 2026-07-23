<script lang="ts">
  // T001 stub — declares the component's public prop signature so
  // ConfirmDialog.test.ts type-checks and its import resolves, but renders
  // nothing so every assertion fails (each test is marked `it.fails`). T002
  // replaces the markup below with the real salon-styled dialog.
  export let heading: string;
  export let body: string;
  export let confirmLabel: string;
  export let cancelLabel: string;
  export let destructive = false;
  export let onConfirm: () => void;
  export let onCancel: () => void;

  // Referenced to satisfy no-unused checks on the stub; T002 uses them.
  void heading;
  void body;
  void confirmLabel;
  void cancelLabel;
  void destructive;
  void onConfirm;
  void onCancel;
</script>
