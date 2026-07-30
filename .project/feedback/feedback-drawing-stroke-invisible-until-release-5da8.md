---
status: open
created: 2026-07-30
plan: null
---

# Feedback

## Bugs
- [ ] F001 While drawing, the stroke you're making is not visible until you lift the pointer (let go) — the line only appears once the stroke is committed, so there's no live feedback as you draw. `handlePointerMove` does draw each segment live (`drawSegment(previous, point)` in `client/src/lib/components/DrawingCanvas.svelte`), so the likely cause (Claude's hypothesis, unverified) is that a reactive `redrawAll()` fires on every `currentStroke` reassignment and repaints only the *committed* `strokes`, erasing the just-drawn in-progress segments until `handlePointerUp` commits the stroke. Fix direction: have the live render include the in-progress `currentStroke`, or stop the reactive `redrawAll()` from clobbering mid-stroke segments (keep the existing captured-style re-assertion from the mid-stroke-color fix). Verify with a real pointer drag, not just the stroke-capture unit path (`DrawingCanvas.svelte` `handlePointerMove` / `redrawAll` / `drawSegment`). [artifacts: ui]
</content>
