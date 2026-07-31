---
plan: plan-drawingcanvas-cover-and-live-stroke-2026-07-31-50e3.md
generated: 2026-07-31
status: in-progress
complexity: moderate
---

# Tasks

## Phase 1: Reproduce

- [x] T001 [artifacts: ui] Add a test asserting the cover-decoration template background is constrained to the `<canvas>` rectangle, not the toolbar+canvas box. In `client/src/lib/components/CoverDecorationCanvas.svelte` the `relative w-fit overflow-hidden rounded-md` wrapper currently contains BOTH the `absolute inset-0` template layer AND the `DrawingCanvas` (which renders a toolbar div above its `<canvas>`), so the template spans toolbar+canvas. Write a component/DOM test (Vitest + testing-library, matching existing client test style) that renders CoverDecorationCanvas with a non-blank template and asserts the template background element's box does not extend over the toolbar region — i.e. the template is scoped to the canvas element's bounds. Expect RED on current code. (feedback f6d0)
- [ ] T002 [artifacts: ui] Add a test reproducing the invisible-until-release stroke in `client/src/lib/components/DrawingCanvas.svelte`. The live path is `handlePointerMove` → `drawSegment(previous, point)`, with a reactive `$: if (ctx) { void ops; redrawAll(); }` that repaints only committed `ops`. Simulate a pointerdown + several pointermove events (no pointerup) and assert that the in-progress segments are visible on the canvas (e.g. via a spy on `drawSegment`/`CanvasRenderingContext2D` calls proving live segments are painted and not cleared before commit). Drive it toward reproducing "stroke invisible until release". If the current behavior turns out already-correct in jsdom, note that and pin the real trigger (DPR/resize repaint, style capture) in the task. Expect RED (or a documented repro gap). (feedback 5da8)

## Phase 2: Fix both defects

- [ ] T003 [artifacts: ui] Scope the template background + `overflow-hidden` clip to the `<canvas>` element's bounds only in `CoverDecorationCanvas.svelte` (and `DrawingCanvas.svelte` if the canvas element must be exposed/wrapped): either wrap only the `<canvas>` (not the toolbar) in the relative/overflow-hidden container, or render the template as the canvas's own backing. Match the canvas's `rounded-md`/border geometry so corners don't leak. Make T001 green; keep the ink-on-top / transparent-canvas behavior intact. (feedback f6d0)
- [ ] T004 [artifacts: ui] Make in-progress `currentStroke` segments render live in `DrawingCanvas.svelte`: include the in-progress stroke in the live paint (or stop the reactive `redrawAll()` from clobbering mid-stroke segments), preserving the captured-style re-assertion from the earlier mid-stroke-color fix. Make T002 green without breaking committed-stroke rendering or the `ops`-driven redraw. (feedback 5da8)

## Phase 3: Verify

- [ ] T005 [artifacts: ui] Run the app (per /run) and visually confirm both: a non-blank cover template clips to the canvas rectangle (no bleed behind the toolbar), and strokes appear live while drawing (not only after pointer release). Record the verification. Confirm the full suite passes.
