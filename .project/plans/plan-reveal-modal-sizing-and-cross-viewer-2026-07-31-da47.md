---
status: approved
branch: reveal-modal-sizing-and-cross-viewer
created: 2026-07-31
features: []
surfaced-defects: []
---

# Plan — Reveal: modal sizing on reveal-all + cross-viewer page state

## Goal

Fix two Reveal-view defects together — the per-book modal growing too tall to
reach its controls when "reveal all" is chosen, and a suspected cross-viewer
page-state leak — since both live in `Reveal.svelte`.

## Scope

**In scope**
- `feedback-reveal-all-modal-too-tall-23ab` (F001): choosing "reveal all" grows
  the per-book modal so its controls become inaccessible — obscured by the nav
  bar and/or pushed below the lowest scroll point. Modal shell is `max-h-full …
  overflow-y-auto` (`Reveal.svelte` per-book modal / `handleRevealAll`), but
  reveal-all content overflows the usable height so the close/control row can't
  be reached.
- `feedback-reveal-page-turn-cross-viewer-state-d607` (F001): a suspected
  cross-viewer state leak — one viewer's page turn may affect another viewer's
  book state. Intended design keeps page position per-viewer, client-local
  (`pageByBook`/`setPage`/`currentPage` are a plain local `let` in
  `Reveal.svelte`); only book-open (`currentlyReading`) and read-completion
  (`bookReads`) are server-shared (datamodel.md — Reveal read-state).

**Out of scope**
- The DrawingCanvas and flaky-test feedback (separate plans).
- Redesigning the reveal flow or the shared read-state model.

## Technical Approach

**23ab** is a layout fix in the per-book modal: make the controls reachable
regardless of content height — e.g. a bounded scroll region for the revealed
pages with the control/close row pinned (sticky/flex footer) inside the modal's
`max-h`, so reveal-all's tall content scrolls within the modal rather than
pushing controls past the viewport/nav bar.

**d607** is reported as a "might be" and needs confirmation: verify with two
concurrent viewers whether a page turn (or the reveal-all toggle) in one client
mutates or derives from shared `Room` state (`currentlyReading`/`bookReads`)
rather than staying local, and whether `pageByBook` is keyed/reset in a way that
couples viewers. Fix direction (if confirmed): keep per-page navigation strictly
client-local; shared state carries only which book is open and whether a read
completed. If not reproducible, record that and correct the feedback citation.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in
the linked tasks file.

### Phase 1 — Reproduce / confirm
- Add a test (or two-viewer harness assertion) confirming whether a page turn in
  one viewer changes another viewer's derived page state; land it RED if the
  leak is real, or record "not reproducible" with evidence. [artifacts: ui, datamodel]
  (feedback d607)
- Add a test/assertion for the reveal-all modal: its control/close row stays
  reachable when revealed content exceeds the viewport. [artifacts: ui]
  (feedback 23ab) Depends on: nothing.

### Phase 2 — Fix
- Constrain reveal-all content to a bounded scroll region and pin the modal
  controls so they're always reachable within the modal's `max-h`, clear of the
  nav bar. [artifacts: ui] (feedback 23ab) Depends on: Phase 1.
- If Phase 1 confirmed the leak: keep page navigation strictly client-local so
  no page turn touches or derives from shared `Room` state. [artifacts: ui, datamodel]
  (feedback d607) Depends on: Phase 1.

### Phase 3 — Verify / reconcile
- Verify reveal-all controls are reachable, and (two concurrent viewers) that
  one viewer's paging doesn't move another's. If d607 was not reproducible,
  correct its feedback citation in place (factual-correction exemption).
  [artifacts: ui, datamodel] Depends on: Phase 2.

## Open Questions
- d607: is the leak real, and if so does it come through `currentlyReading`,
  `bookReads`, or a shared-keyed `pageByBook`? Phase 1 decides before any change.
- 23ab: pin controls as a sticky footer vs. cap the reveal-all region height —
  decide in Phase 2 by whichever keeps controls clear of the nav bar on small
  viewports.
