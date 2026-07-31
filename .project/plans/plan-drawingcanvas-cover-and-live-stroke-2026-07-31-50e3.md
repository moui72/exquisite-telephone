---
status: approved
branch: drawingcanvas-cover-and-live-stroke
created: 2026-07-31
features: []
surfaced-defects: []
---

# Plan — DrawingCanvas: cover-template clip + live-stroke visibility

## Goal

Fix two DrawingCanvas defects together — the cover-decoration template
background bleeding outside the canvas rectangle, and drawn strokes not
appearing until the pointer is released — since both live in the same
`DrawingCanvas.svelte` / `CoverDecorationCanvas.svelte` render path.

## Scope

**In scope**
- `feedback-cover-template-not-clipped-to-canvas-regression-f6d0` (F001): the
  low-opacity template background (`CoverDecorationCanvas.svelte`, the
  `relative w-fit overflow-hidden rounded-md` wrapper around the `absolute
  inset-0` template layer + `DrawingCanvas`) fills the whole toolbar+canvas box
  and bleeds behind the toolbar instead of clipping to just the `<canvas>`
  rectangle. Regression of the earlier `feedback-cover-decoration-background-ca-4113`
  F001 fix.
- `feedback-drawing-stroke-invisible-until-release-5da8` (F001): the in-progress
  stroke isn't visible until `handlePointerUp` commits it — no live feedback
  mid-drag.

**Out of scope**
- The Reveal and flaky-test feedback (separate plans, fanned out in parallel).
- Redesigning the drawing toolbar or template set.

## Technical Approach

Both defects are in the canvas render path. For **f6d0**, the clip wrapper in
`CoverDecorationCanvas.svelte` wraps the entire `DrawingCanvas` component, which
renders its own toolbar `<div>` above the `<canvas>`; the `absolute inset-0`
template layer therefore spans toolbar+canvas. The fix scopes the template
background (and its `overflow-hidden` clip + `rounded-md`/border geometry) to
the `<canvas>` element's bounds only — e.g. wrap just the canvas, or render the
template as the canvas's own backing rather than a sibling `inset-0` layer.
Verify visually in the decorating window with a non-blank template.

For **5da8**, the live-render path is `handlePointerMove` →
`drawSegment(previous, point)` (`DrawingCanvas.svelte`), with a reactive
`$: if (ctx) { void ops; redrawAll(); }` that repaints only committed `ops`.
The exact interaction that erases in-progress segments is not yet proven
(the reactive block depends on `ops`, which doesn't change mid-stroke), so
Phase 1 reproduces the invisible-stroke behavior in a test before Phase 2
fixes it — the fix keeps the mid-stroke color/style re-assertion from the
earlier mid-stroke-color fix intact.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in
the linked tasks file.

### Phase 1 — Reproduce (produces failing/asserting tests)
- Add a test capturing the cover-template clip boundary: the template layer must
  be constrained to the `<canvas>` rectangle, not the toolbar+canvas box.
  [artifacts: ui] (feedback f6d0)
- Add a test reproducing the invisible-mid-stroke behavior — a pointer drag
  should render segments before pointerup, not only after commit. [artifacts: ui]
  (feedback 5da8) Depends on: nothing.

### Phase 2 — Fix both defects
- Scope the template background + clip to the canvas element's bounds so no
  bleed behind the toolbar; match canvas corner/border geometry. [artifacts: ui]
  (feedback f6d0) Depends on: Phase 1.
- Make in-progress `currentStroke` segments render live (include the in-progress
  stroke in the live paint, or stop the repaint from clobbering mid-stroke
  segments). [artifacts: ui] (feedback 5da8) Depends on: Phase 1.

### Phase 3 — Verify
- Run the app and confirm both visually: a non-blank cover template clips to the
  canvas, and strokes appear while drawing. Depends on: Phase 2.

## Open Questions
- 5da8: what actually erases the in-progress segments — a reactive `redrawAll`,
  a canvas resize/DPR repaint, or a style-capture issue? Phase 1's failing test
  pins it before Phase 2.
- f6d0: wrap-only-the-canvas vs. render-template-as-canvas-backing — decide in
  Phase 2 by whichever cleanly matches the canvas border/rounding.
