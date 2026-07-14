---
status: approved
branch: drawing-color-and-line-width-t
created: 2026-07-14
features: [drawing-color-and-line-width-t]
surfaced-defects: []
---

# Plan: Drawing tools — color, width, fill, monochrome mode, and cursor-accuracy fix

## Goal

Fix the mouse pointer/drawn-line coordinate mismatch in the drawing
canvas, and add color selection, adjustable line width, and a fill
tool to the drawing interface, with a host-configurable pre-game
toggle to force monochrome for the whole room.

## Scope

**In:**
- Coordinate-scaling fix in `DrawingCanvas.svelte`'s `toPoint()` (feedback F001, `feedback-main-296e.md`)
- `Entry.content` draw-op format: per-stroke color/width, plus a `fill` op (datamodel.md, already updated)
- Drawing toolbar: 8-color preset palette, 3 line-width presets (thin/medium/thick), fill tool
- Scanline flood-fill algorithm, shared between the live canvas and the PNG export pipeline
- `Room.monochromeOnly` field, host-only pre-game toggle in the Lobby View, new socket event to set it
- PNG export pipeline updated to replay the new draw-op format (per-op color/width, fill replay)

**Out:**
- Full arbitrary color picker (`<input type="color">`) or numeric width slider — deferred per confirmed defaults
- Reveal-page redesign (`animated-interactive-reveal-bo`) — separate backlog item/phase
- Turn-order/round-gating, minimum player count, turn timer, play-again control — separate phases (see STATUS.md phase grouping)

## Technical Approach

**Coordinate fix**: `toPoint()` currently computes `event.clientX - rect.left` directly, which only works if the canvas's CSS-rendered size equals its bitmap resolution (`width="320" height="240"`). It doesn't — the canvas sits in a `flex flex-col` container that stretches it to fill available width by default. Fix by scaling: `scaleX = canvasEl.width / rect.width`, `scaleY = canvasEl.height / rect.height`, then `x = (event.clientX - rect.left) * scaleX` (same for y). This is layout-agnostic and also correct if the canvas is ever explicitly resized later.

**Draw-op format**: `shared/src/strokeData.ts` currently exports `Point`, `Stroke` (`Point[]`), `StrokeData` (`Stroke[]`), and `serializeStrokes`/`parseStrokes`. Replace (not add alongside — constitution Principle IV, no dead architecture) with a discriminated union:
```ts
interface StrokeOp { type: 'stroke'; points: Point[]; color: string; width: number }
interface FillOp { type: 'fill'; point: Point; color: string }
type DrawOp = StrokeOp | FillOp
type DrawOps = DrawOp[]
```
`serializeStrokes`/`parseStrokes` are renamed `serializeDrawOps`/`parseDrawOps` and updated accordingly. No back-compat shim — games are in-memory only (datamodel.md Overview), nothing persists across a restart, so there's no existing serialized content to migrate.

**Flood fill**: a pure scanline flood-fill function operating on `ImageData` (seed point + target color + fill color), extracted to a shared module (`client/src/lib/drawing/floodFill.ts`) so both `DrawingCanvas.svelte` (live drawing) and `pngExport.ts` (export replay) use the same implementation — constitution Principle VII (named types/single source), applied here to logic rather than a type. `pngExport.ts`'s `MinimalCanvasContext` interface gains `getImageData`/`putImageData` so the fill function can run against the fake context used in tests too.

**Monochrome toggle**: `Room` gains `monochromeOnly: boolean` (default `false`, set in `createRoom`). A new host-only socket event (e.g. `set_monochrome`) is accepted only while `Room.status === 'lobby'`, mirroring the existing host-only guard pattern in `onStartGame`/`onEndGame`. Not in the Observability principle's enumerated event list (room creation, join/leave/reconnect, turn advance, completion), so no structured log event is added for it — keeps this consistent with what the constitution actually requires logged, not more.

**Toolbar defaults**: 8 preset colors (including black) and 3 width presets are hardcoded constants in `DrawingCanvas.svelte` (or a small shared constants module) — no configuration surface, keeping this simple per constitution Principle I.

## Phase Breakdown

### Phase 1: Coordinate fix (independent, ships alone)
- [ ] T001 [artifacts: ui] Write a failing test for `DrawingCanvas.svelte`'s `toPoint()` that asserts pointer coordinates are scaled by `canvasEl.width / rect.width` (and height) when the canvas's CSS-rendered size differs from its bitmap resolution (mock `getBoundingClientRect` to return a stretched size); confirm it fails, then fix `toPoint()` to scale. Addresses feedback F001 (`feedback-main-296e.md`).

### Phase 2: Draw-op data format (blocks Phase 3 and 4)
- [ ] T002 [artifacts: datamodel] [parallel] Write failing tests for `shared/src/strokeData.ts`'s new `DrawOp`/`StrokeOp`/`FillOp` types and `serializeDrawOps`/`parseDrawOps`, covering round-trip serialization of both op kinds; confirm they fail, then implement, removing the old `Stroke`/`StrokeData`/`serializeStrokes`/`parseStrokes` exports (Principle IV — no dual formats).
- [ ] T003 [parallel] Update `shared/src/index.ts` exports and every import site (`DrawingCanvas.svelte`, `WritingDrawing.svelte`, `Reveal.svelte`, `pngExport.ts`, and their tests) to the renamed types/functions. Run typecheck to confirm no stale references remain.

### Phase 3: Drawing toolbar (color, width, fill) — depends on Phase 2
- [ ] T004 [artifacts: ui] Write a failing test asserting `floodFill(imageData, seedPoint, fillColor)` (new `client/src/lib/drawing/floodFill.ts`) correctly fills a contiguous same-color region and stops at a different-color boundary; confirm it fails, then implement the scanline algorithm as a pure function.
- [ ] T005 [artifacts: ui] Write failing tests for `DrawingCanvas.svelte`'s new toolbar: selecting a color/width updates the active draw state used for the next stroke; selecting the fill tool and clicking emits a `fill` op via `floodFill`; confirm failures, then implement the 8-color palette, 3 width presets, and fill-tool interaction, redrawing via `parseDrawOps`/replay with per-op `strokeStyle`/`lineWidth`.
- [ ] T006 [parallel] Write a failing test asserting `pngExport.ts`'s `renderBookOntoContext` replays `stroke` ops with their own color/width and `fill` ops via the shared `floodFill` function (extend `MinimalCanvasContext` with `getImageData`/`putImageData`); confirm failure, then implement.

### Phase 4: Monochrome toggle — independent of Phase 3, depends on Phase 2 only for the shared `Room` type
- [ ] T007 [artifacts: datamodel] Write a failing server test asserting `createRoom` defaults `monochromeOnly` to `false`; confirm failure, then add the field.
- [ ] T008 [artifacts: datamodel] Write a failing server test for a new host-only `set_monochrome` handler: accepted only while `Room.status === 'lobby'` and only from `Room.hostPlayerId`, rejected otherwise (mirroring `onStartGame`'s host-only guard); confirm failure, then implement and wire it into the socket dispatch table (Principle VIII).
- [ ] T009 [artifacts: ui] [parallel] Write a failing client test asserting the Lobby View's host-only "force monochrome" toggle is visible only to the host, reflects `Room.monochromeOnly`, and emits `set_monochrome` on change; confirm failure, then implement.
- [ ] T010 [artifacts: ui] [parallel] Write a failing test asserting `DrawingCanvas.svelte` hides the color palette (falling back to the default ink color for new strokes) when `Room.monochromeOnly` is `true`; confirm failure, then implement, threading the flag down from `WritingDrawing.svelte`.

## Open Questions

_(none — defaults for palette size, width presets, and fill semantics were confirmed during planning)_

## Production Annotation Summary

- **Exact-match flood fill** (recorded in `ui.md` Production Annotations): the scanline fill only matches the exact seed pixel color, so anti-aliased stroke edges can leave a thin unfilled sliver at region boundaries. A tolerance-threshold fill would close this gap; deferred as out of scope for this phase.
