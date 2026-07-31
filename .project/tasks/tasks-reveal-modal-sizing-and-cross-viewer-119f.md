---
plan: plan-reveal-modal-sizing-and-cross-viewer-2026-07-31-da47.md
generated: 2026-07-31
status: in-progress
complexity: moderate
---

# Tasks

## Phase 1: Reproduce / confirm

- [x] T001 [artifacts: ui] Add a test for the reveal-all modal control reachability in `client/src/lib/views/Reveal.svelte`. The per-book modal shell is `max-h-full … overflow-y-auto` and `handleRevealAll` sets `revealAll = true`, expanding content so the close/control row is pushed past the viewport / behind the nav bar. Write a component test (matching existing client test style) that opens a book modal, triggers reveal-all with many pages, and asserts the control/close row remains within the modal's reachable (scrollable) bounds — i.e. not rendered below the modal's max-height with no way to scroll to it. Expect RED on current code. (feedback 23ab)
- [ ] T002 [artifacts: ui, datamodel] Add a test confirming per-viewer page independence in `Reveal.svelte`. `pageByBook`/`setPage`/`currentPage` are a client-local `let`; only `currentlyReading` and `bookReads` are server-shared (datamodel.md — Reveal read-state). Simulate two viewers (two component instances / two room states) reading the same book and assert that one viewer advancing the page (or toggling reveal-all) does NOT change the other viewer's `currentPage`, and that page navigation does not write to or derive from `currentlyReading`/`bookReads`. If the leak is real, land this RED; if page state is already strictly local, record "not reproducible" with the evidence (this decides T005's citation fix). (feedback d607)

## Phase 2: Fix

- [ ] T003 [artifacts: ui] Constrain the reveal-all content to a bounded scroll region and pin the modal's control/close row (sticky footer or flex layout) inside the modal's `max-h`, so the controls stay reachable and clear of the nav bar regardless of how many pages reveal-all shows, including on small viewports. Make T001 green. (feedback 23ab)
- [ ] T004 [artifacts: ui, datamodel] Only if T002 confirmed a leak: keep page navigation strictly client-local so no page turn (or reveal-all toggle) mutates or is derived from shared `Room` state (`currentlyReading`/`bookReads`); shared state carries only which book is open and whether a read completed. Make T002 green. If T002 found no leak, skip this task with a note. (feedback d607)

## Phase 3: Verify / reconcile

- [ ] T005 [artifacts: ui, datamodel] Verify in-app: reveal-all controls are reachable (small viewport included), and with two concurrent viewers one viewer's paging does not move another's. If T002 established the cross-viewer leak was NOT reproducible, correct that citation in `feedback-reveal-page-turn-cross-viewer-state-d607.md` in place — factual-correction exemption only (reviewer guide), never changing the decision/item content. Confirm the full suite passes.
