---
plan: plan-main-2026-07-19-05fb.md
generated: 2026-07-19
status: in-progress
---

# Tasks

## Phase 1: Reproduce and fix the submit button (F001)
- [x] T001 [artifacts: ui] Reproduce the drawing-submit-button click
  failure live (via `/run`, in a real browser) — get to the drawing step,
  attempt to click "Present your contribution" under the canvas
  (`client/src/lib/views/WritingDrawing.svelte`), and record the actual
  failure mode observed (no click event firing at all, click firing but
  the handler being a no-op, a thrown exception, an element overlapping
  and intercepting the click, etc.). Report the finding — it determines
  what T002 tests and fixes.
- [x] T002 [artifacts: ui] Based on T001's finding, write a failing
  regression test in `client/src/lib/views/WritingDrawing.test.ts` or
  `client/src/lib/components/DrawingCanvas.test.ts` that reproduces the
  bug, then fix it in `client/src/lib/views/WritingDrawing.svelte`
  and/or `client/src/lib/components/DrawingCanvas.svelte`. Confirm the
  test fails before the fix and passes after. Depends on T001.

## Phase 2: Add white as a palette color (F002)
- [x] T003 [artifacts: ui] [parallel] In
  `client/src/lib/components/DrawingCanvas.svelte`, add `'#ffffff'` to
  the `PALETTE_COLORS` array. Give the white swatch a visible default
  border (e.g. `border-marigold/30` when not active, alongside the
  existing `border-velvet`-when-active state) so it doesn't disappear
  against the toolbar's `bg-butter/60` background before selection.
  Write a failing test first in `DrawingCanvas.test.ts` asserting a
  white (`#ffffff`) swatch button renders in the palette and, once
  selected, a new stroke/fill op uses `#ffffff` as its color; confirm it
  fails before the change and passes after.

## Phase 3: Full-suite verification
- [ ] T004 Run the full test suite, typecheck, and lint across the
  monorepo (shared/server/client workspaces). Confirm everything is
  green, including all existing `DrawingCanvas.test.ts` and
  `WritingDrawing.test.ts` coverage — no regressions from T002/T003.
