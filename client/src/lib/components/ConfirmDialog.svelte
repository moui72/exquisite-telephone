<script lang="ts">
  import { onMount } from 'svelte';
  import GiltFrame from './GiltFrame.svelte';

  /**
   * The shared Confirmation Dialog (ui.md — Confirmation Dialog): the one
   * place the "are you sure?" pattern lives. Every string is caller-supplied
   * so one component serves the Reveal unread-books warning and the
   * Moderation Panel's destructive host controls without special-casing.
   *
   * Rendered as an `role="alertdialog"` with `aria-modal`, initial focus on
   * the safe (cancel) action, a dependency-free focus trap while open, and
   * Escape mapped to cancel (Baseline Accessibility, constitution). Dressed
   * in the salon's gilt-frame/plaque visual language.
   */
  export let heading: string;
  export let body: string;
  export let confirmLabel: string;
  export let cancelLabel: string;
  /** Styles the confirm action for an irreversible act. */
  export let destructive = false;
  /**
   * Accessible name for the alertdialog. Defaults to the heading; callers
   * override it when the visible heading differs from the name assistive
   * tech should announce (e.g. Reveal's "Unread books warning").
   */
  export let ariaLabel: string | undefined = undefined;
  export let onConfirm: () => void;
  export let onCancel: () => void;

  let cancelEl: HTMLButtonElement | undefined;
  let confirmEl: HTMLButtonElement | undefined;

  $: label = ariaLabel ?? heading;

  onMount(() => {
    // Initial focus on the safe action.
    cancelEl?.focus();
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    // Dependency-free focus trap: with only the cancel and confirm
    // controls, Tab / Shift+Tab simply cycle between the two and never
    // escape the dialog.
    if (event.key === 'Tab') {
      if (!cancelEl || !confirmEl) return;
      const active = document.activeElement;
      event.preventDefault();
      if (event.shiftKey) {
        (active === cancelEl ? confirmEl : cancelEl).focus();
      } else {
        (active === confirmEl ? cancelEl : confirmEl).focus();
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-wine/70 p-4"
  role="alertdialog"
  aria-modal="true"
  aria-label={label}
>
  <div class="w-full max-w-md">
    <GiltFrame caption={heading}>
      <div class="flex flex-col gap-4 p-1">
        <p class="text-sm text-ink/80">{body}</p>
        <div class="flex flex-wrap justify-end gap-3">
          <button
            bind:this={cancelEl}
            type="button"
            class="rounded-md border border-gold/60 bg-champagne px-4 py-2 text-sm font-medium text-ink hover:bg-gold/10"
            on:click={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            bind:this={confirmEl}
            type="button"
            class="rounded-md px-4 py-2 text-sm font-medium text-white {destructive
              ? 'confirm-destructive bg-red-700 hover:bg-red-700/90'
              : 'bg-sapphire hover:bg-sapphire/90'}"
            on:click={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </GiltFrame>
  </div>
</div>
