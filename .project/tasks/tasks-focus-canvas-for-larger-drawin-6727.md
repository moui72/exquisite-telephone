---
plan: plan-focus-canvas-for-larger-drawin-2026-07-24-a6f4.md
generated: 2026-07-24
status: completed
---

# Tasks

## Phase 1: Canvas focus toggle

- [x] T001 [artifacts: ui] Add a focus/expand toggle for the turn drawing canvas so that, at or above a tablet/desktop Tailwind breakpoint, the player can expand the canvas beyond the `max-w-md` container in `client/src/lib/views/WritingDrawing.svelte` into a larger drawing surface, and toggle it back to the standard layout. Focus is client-local component state only (no `Room`/datamodel field, no server round-trip); reuse the existing `DrawingCanvas` component unchanged. The affordance must be absent on small/mobile viewports (below the breakpoint), where the canvas already fills the width. Pin the exact breakpoint and expanded size (wider max-width vs. near-fullscreen overlay) here; default the cover-decoration canvas to unchanged (turn canvas only) but keep the toggle factored so extending it later is cheap. Write a failing test first (TDD, constitution Principle III) in `WritingDrawing.test.ts` asserting the focus toggle expands/restores the canvas container and is hidden below the breakpoint, then implement. Feature: focus-canvas-for-larger-drawin.

- [x] T002 [artifacts: ui] Confirm strokes remain accurate at the expanded canvas size — the existing pointer-coordinate scaling (CSS-rendered size → bitmap resolution, per ui.md Writing/Drawing View) should already handle this, so this task adds a regression test rather than new scaling code. Extend `DrawingCanvas.test.ts` (or `WritingDrawing.test.ts`) with a failing-first assertion that a pointer event maps to the correct bitmap coordinate when the canvas is rendered at the larger focused size, then verify it passes with the T001 implementation (adjust only if a gap is found). Feature: focus-canvas-for-larger-drawin.
