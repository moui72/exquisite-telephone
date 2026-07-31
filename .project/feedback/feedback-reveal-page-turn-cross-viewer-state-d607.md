---
status: planned
created: 2026-07-30
plan: plan-reveal-modal-sizing-and-cross-viewer-2026-07-31-da47.md
---

# Feedback

## Bugs
- [x] F001 In the Reveal view, when paging through a book's chain, one viewer's page turn may affect another viewer's book state — a suspected cross-viewer state leak (reported as a "might be", to be confirmed). The *intended* design keeps page position per-book, per-viewer, and **client-local**: `pageByBook` in `client/src/lib/views/Reveal.svelte` (`setPage`/`currentPage`) is a plain local `let`, and only two things are meant to be server-shared for a book — opening/closing the modal (`session.setReadingBook` → `Room.currentlyReading`) and completing a read (`Room.bookReads`), per datamodel.md Normalization Rules — Reveal read-state. So the plan should verify with two concurrent viewers whether a page turn (or reveal-all toggle) in one client mutates or is being derived from shared `Room` state (`currentlyReading`/`bookReads`) rather than staying local, and whether `pageByBook` is being keyed or reset in a way that couples viewers. Fix direction: keep per-page navigation strictly client-local; the shared state should carry only which book is open and whether a read completed. [artifacts: ui, datamodel]
</content>
