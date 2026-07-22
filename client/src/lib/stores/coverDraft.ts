import { writable } from 'svelte/store';
import type { DrawOps } from '@exquisite-telephone/shared';

/**
 * The client-local draft cover, shared across the two contexts that edit it
 * (ui.md Cover Decoration — "The canvas appears in two contexts, both
 * editing the same draft cover"): the opportunistic waiting-state canvas
 * during `writing` and the dedicated `decorating` window. Keyed by
 * `Book.id` so ink drawn while waiting survives the `writing → decorating`
 * view swap, while a brand-new *Play again* room (fresh book ids) never
 * inherits a stale draft. Never synced — finalized once via onSubmitCover.
 */
export interface CoverDraft {
  ops: DrawOps;
  template: string | null;
}

const EMPTY: CoverDraft = { ops: [], template: null };

function createCoverDraftStore() {
  const { subscribe, update } = writable<Record<string, CoverDraft>>({});
  return {
    subscribe,
    setOps(bookId: string, ops: DrawOps) {
      update((m) => ({ ...m, [bookId]: { ops, template: m[bookId]?.template ?? null } }));
    },
    setTemplate(bookId: string, template: string | null) {
      update((m) => ({ ...m, [bookId]: { ops: m[bookId]?.ops ?? [], template } }));
    },
  };
}

export const coverDraft = createCoverDraftStore();

/** The draft for one book, or an empty draft if none has been started. */
export function draftFor(map: Record<string, CoverDraft>, bookId: string | null): CoverDraft {
  return (bookId !== null && map[bookId]) || EMPTY;
}
