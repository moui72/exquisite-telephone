---
status: approved
branch: lobby-join-link-chip-and-menu
created: 2026-07-27
features: []
surfaced-defects: []
---

# Plan — Lobby join-link chip + guest-list context menu

## Goal

Surface the join link as its own click-to-copy chip under the room code and
move the copy context menu onto the whole Guest List widget with separate
"copy room code" and "copy join link" items.

## Scope

**In:**
- `ui.md` Lobby View — revise the click-to-copy / context-menu paragraph to
  describe (a) a visible join-link chip and (b) a widget-wide context menu
  with two items. Both reverse currently-recorded decisions (feedback
  `feedback-lobby-join-link-chip-and-menu-601c.md`, F001/F002, user-confirmed
  overrides).
- `client/src/lib/views/Lobby.svelte` — add the join-link chip; re-anchor and
  extend the context menu.
- `client/src/lib/views/Lobby.test.ts` — cover the new chip and the two-item
  menu.

**Out:**
- No datamodel/infrastructure/server change. The join link is still the
  entirely-client-side `<origin>/?room=<code>` URL consumed by the existing
  Foyer `?room=` pre-fill; no new route or `Room` state.
- No change to the room-code tap-to-copy behavior itself (F001, T001 era) or
  to the Foyer pre-fill.
- No new clipboard capability — reuses `client/src/lib/clipboard.ts`.

## Technical Approach

Build on the existing Lobby copy machinery (ui.md Lobby View;
`Lobby.svelte` `handleCopyCode` / `handleCopyJoinLink` / context-menu
overlay). Two user-facing changes:

- **Join-link chip (F001).** A small, visually secondary click-to-copy
  affordance rendered directly under the room-code line, copying
  `<origin>/?room=<code>` via the existing `handleCopyJoinLink` path. It sits
  alongside — not replacing — the room-code tap-to-copy, and reuses the same
  clipboard helper and transient "copied" confirmation convention. It must
  keep the v0.5.0 invariant that the `data-testid="room-code"` element's own
  text node stays equal to the bare code (the chip is a separate element, so
  this is preserved by construction — the plan calls it out so implementation
  doesn't regress it).

- **Widget-wide two-item menu (F002).** Move the `on:contextmenu` /
  long-press handlers from the room-code button up to the Guest List widget
  container so a right-click (or touch long-press) anywhere on the widget
  opens the menu. The menu gains a second item: "copy room code" (bare code,
  the existing `handleCopyCode` path) above the existing "copy join link".
  The outside-click / Escape dismissal and the touch long-press /
  `suppressNextClick` handling carry over unchanged, re-scoped to the widget.

Docs precede code: revise `ui.md` first so the implementation aligns to the
settled description.

## Phase Breakdown

_Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file._

**Phase 1 — Artifact revision (docs).**
- Revise the `ui.md` Lobby View copy/context-menu paragraph: the join link is
  shown as its own click-to-copy chip in smaller text under the room code
  (F001), and the context menu is available on the whole Guest List widget
  (right-click / long-press) offering "copy room code" and "copy join link"
  as separate items (F002). Reverses the prior "context-menu-only" and
  "single-item menu on the room code" wording. `[artifacts: ui]`

**Phase 2 — Implementation (code + tests).** Depends on Phase 1.
- Add the join-link chip to `Lobby.svelte` under the room code, copying
  `<origin>/?room=<code>` and reusing the transient "copied" cue; keep the
  room-code `data-testid` text node equal to the bare code (F001).
- Re-anchor the context-menu trigger from the room-code button to the Guest
  List widget container and add a "copy room code" item above "copy join
  link" (F002); preserve outside-click/Escape dismissal and touch
  long-press/`suppressNextClick` handling.
- Extend `Lobby.test.ts` to cover the chip copying the join URL and the menu
  exposing both items from a right-click on the widget.

## Complexity Tracking

No complexity deviations to justify — this reuses the existing clipboard
helper, copy-cue convention, and context-menu overlay; it adds no new
dependency or abstraction (constitution Principle I).

## Open Questions

- **"Copied" confirmation with multiple targets.** There are now up to four
  copy affordances (room-code tap, join-link chip, and the two menu items).
  Whether a single shared transient cue is adequate or the confirmation
  should be target-aware is an implementation call — resolve during Phase 2;
  a single cue is the presumed default unless it reads ambiguously.
- **Long-press over the player list.** Re-scoping long-press to the whole
  widget means it now covers the player `<ul>`. Confirm it doesn't interfere
  with normal touch scrolling/taps (the existing `touchmove`/`touchcancel`
  cancellation should still cover this) — verify during Phase 2.
- **Redundancy is intentional.** The room-code tap-to-copy and the new "copy
  room code" menu item both copy the bare code; this duplication is by
  design (the menu makes the action discoverable), not something to collapse.

## Production Annotation Summary

No new production shortcuts. The only Lobby copy shortcut — the
secure-context-only clipboard helper (no `execCommand` fallback) — is already
annotated in `ui.md` and is unchanged by this work.
</content>
