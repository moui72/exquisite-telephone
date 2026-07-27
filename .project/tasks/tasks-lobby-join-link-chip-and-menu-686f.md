---
plan: plan-lobby-join-link-chip-and-menu-2026-07-27-ba69.md
generated: 2026-07-27
status: in-progress
---

# Tasks

## Phase 1: Artifact revision
- [ ] T001 [artifacts: ui] Revise the `ui.md` Lobby View copy/context-menu paragraph (currently: join link exposed *only* via a context menu anchored to the room code, single "copy join link" item). New recorded behavior: (a) the join link is shown as its own click-to-copy chip in smaller text directly under the room code (F001); (b) the copy context menu is available on the whole Guest List widget via right-click / touch long-press and offers "copy room code" and "copy join link" as two separate items (F002). Keep the client-side-only `<origin>/?room=<code>` framing and the Foyer `?room=` pre-fill reference intact; keep the existing secure-context-only clipboard Production Annotation unchanged. Reverses two user-confirmed prior decisions (feedback `feedback-lobby-join-link-chip-and-menu-601c.md` F001/F002). Stamp `last_updated 2026-07-27`; the Lobby View diagram node is structure-only, so leave `diagram_status` as-is unless the component structure actually changes.

## Phase 2: Implementation
- [ ] T002 [artifacts: ui] Test-first (constitution III): add failing cases to `client/src/lib/views/Lobby.test.ts`, in the seated-room (Guest List) state. Assert (a) a join-link chip renders under the room code and, when clicked, copies `<origin>/?room=<CODE>` via the clipboard helper (mock as the existing copy tests do); (b) a `contextmenu` event anywhere on the Guest List widget (not only the room-code element) opens a menu exposing both a "copy room code" item (copies the bare `CODE`) and a "copy join link" item (copies `<origin>/?room=<CODE>`). Also assert the `data-testid="room-code"` element's text content stays exactly the bare code (guards the v0.5.0 garbled-code regression). Run the client suite and confirm these fail red before implementing.
- [ ] T003 [artifacts: ui] Implement in `client/src/lib/views/Lobby.svelte` to turn T002 green: (a) render the join-link chip under the room code as a small, visually-secondary click-to-copy control reusing `handleCopyJoinLink` and the transient "copied" cue convention (keep the chip a separate element so the room-code `data-testid` text node remains the bare code); (b) move the `on:contextmenu` and touch long-press handlers from the room-code button to the Guest List widget container, and add a "copy room code" menu item (bare code via `handleCopyCode`) above the existing "copy join link" item, preserving the outside-click/Escape dismissal and the `suppressNextClick`/`touchmove`/`touchcancel` long-press handling re-scoped to the widget. Verify the full client suite and svelte-check pass.
</content>
