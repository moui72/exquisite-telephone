---
status: planned
created: 2026-07-30
plan: plan-drawingcanvas-cover-and-live-stroke-2026-07-31-50e3.md
---

# Feedback

## Bugs
- [x] F001 The cover-decoration background templates are still not properly constrained to the canvas — the chosen template background isn't contained to the drawing rectangle. This was addressed once already (`feedback-cover-decoration-background-ca-4113.md` F001, shipped under `plan-host-drawing-tool-controls-2026-07-24-590b.md`), which added an `overflow-hidden` clip wrapper in `client/src/lib/components/CoverDecorationCanvas.svelte` (the `<div class="relative w-fit overflow-hidden rounded-md">` wrapping the `absolute inset-0` template background + `DrawingCanvas`). Likely reason it's still wrong (Claude's read, to verify): that wrapper wraps the **whole `DrawingCanvas`, which renders its own toolbar div above the `<canvas>` element** (`DrawingCanvas.svelte`), so the `absolute inset-0` low-opacity background fills the toolbar+canvas box and bleeds up behind the toolbar instead of being clipped to just the canvas rectangle. Fix direction: scope the template background (and its clip) to the canvas element's bounds specifically — e.g. wrap only the `<canvas>` (not the toolbar) in the relative/overflow-hidden container, or render the template as the canvas's own backing rather than a sibling `inset-0` layer — and match the canvas's `rounded-md`/`border` geometry so corners don't leak. Verify visually in the decorating window with a non-blank template. [artifacts: ui]
</content>
