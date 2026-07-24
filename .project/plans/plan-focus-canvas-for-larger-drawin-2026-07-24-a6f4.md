---
status: approved
branch: focus-canvas-for-larger-drawin
created: 2026-07-24
features: [focus-canvas-for-larger-drawin]
surfaced-defects: []
---

# Plan — Focus mode for a larger drawing surface on big viewports

## Goal

Let players on tablet/desktop viewports toggle the drawing canvas into a
focused, expanded surface larger than the default column-width layout, purely
as client-local view state, with no effect on small/mobile viewports.

## Scope

**In scope**

- A **focus/expand** affordance on the turn **drawing canvas**
  (`WritingDrawing.svelte` + `DrawingCanvas.svelte`) that, at or above a
  tablet/desktop breakpoint, expands the canvas beyond the current
  `max-w-md` column into a larger drawing surface, and toggles back to the
  standard layout. Client-local component state only — nothing persisted,
  no `Room`/[[datamodel]] field, no server round-trip. Feature:
  focus-canvas-for-larger-drawin.
- Responsive gating: the affordance is absent on small/mobile viewports,
  where the canvas already fills the available width.

**Out of scope** — the open monochrome-as-palette feedback
(`feedback-monochrome-as-palette-option-e4ce.md`) is unrelated and left
`open` for its own plan. No datamodel, infrastructure, or server change.
Whether the cover-decoration canvas also gains focus mode is an open
question below, not committed here.

## Technical Approach

The canvas already scales pointer coordinates from CSS-rendered size to
bitmap resolution ([[ui]] Writing/Drawing View), so expanding the rendered
canvas is a layout change that needs no drawing-accuracy work. Focus is a
local boolean (component state on the canvas or its `WritingDrawing`
container) that swaps the constraining `max-w-md` wrapper for an expanded
layout at the chosen Tailwind breakpoint; on smaller screens the toggle is
not rendered. The expanded state reuses the existing `DrawingCanvas`
component unchanged — only its container sizing differs.

## Phase Breakdown

_Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file._

**Phase 1 — Canvas focus toggle** (no dependency)
- Add a focus/expand toggle and expanded-layout state for the turn drawing
  canvas, breaking out of the `max-w-md` container at/above a
  tablet/desktop breakpoint; toggling off restores the standard layout.
  [feature: focus-canvas-for-larger-drawin] [artifacts: ui]
- Gate the affordance to larger viewports so it is absent on small/mobile,
  and confirm strokes stay accurate at the expanded size (pointer-scaling
  already handles this). [feature: focus-canvas-for-larger-drawin] [artifacts: ui]

## Complexity Tracking

| Deviation | Justification |
|---|---|
| (none) | A local view-state toggle over the existing `DrawingCanvas` and responsive layout classes — no new abstraction, dependency, or persisted state, so no Principle-I deviation to justify. |

## Open Questions

- **Cover-decoration canvas.** Whether focus mode also applies to the
  cover-decoration canvas (the same `DrawingCanvas` component in a different
  view) or only the turn canvas — decided during Phase 1. Default assumption:
  turn canvas only, with the toggle implemented so extending it to the cover
  canvas later is cheap.
- **Breakpoint and expanded size.** The exact Tailwind breakpoint at which
  the affordance appears and how large the focused surface grows (a wider
  max-width vs. a near-fullscreen overlay) are pinned during implementation.

## Production Annotation Summary

- No production shortcut is introduced by this plan.
