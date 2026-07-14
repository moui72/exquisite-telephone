---
plan: plan-drawing-color-and-line-width-t-2026-07-14-6006.md
generated: 2026-07-14
status: in-progress
---

# Tasks

## Phase 1: Coordinate fix

- [x] T001 [artifacts: ui] Write a failing test for `client/src/lib/components/DrawingCanvas.svelte`'s `toPoint()` asserting pointer coordinates are scaled by `canvasEl.width / rect.width` and `canvasEl.height / rect.height` when the canvas's CSS-rendered size (mocked via `getBoundingClientRect`) differs from its bitmap resolution (`width="320" height="240"`). Confirm the test fails against current `toPoint()`, then fix `toPoint()` to apply the scale factors. Addresses feedback F001 in `.project/feedback/feedback-main-296e.md`.

## Phase 2: Draw-op data format

- [x] T002 [artifacts: datamodel] [parallel] In `shared/src/strokeData.ts`, write failing tests covering: (a) a `StrokeOp` (`{ type: 'stroke', points: Point[], color: string, width: number }`) round-trips through `serializeDrawOps`/`parseDrawOps`, (b) a `FillOp` (`{ type: 'fill', point: Point, color: string }`) round-trips the same way, (c) a mixed array of both op kinds preserves order. Confirm failures, then implement `StrokeOp`, `FillOp`, `DrawOp` (union), `DrawOps` (array alias), `serializeDrawOps`, `parseDrawOps`, deleting the old `Stroke`, `StrokeData`, `serializeStrokes`, `parseStrokes` exports in the same change (constitution Principle IV — no dead architecture, no dual formats).
- [x] T003 Update `shared/src/index.ts`'s re-exports and every import site of the old names — `client/src/lib/components/DrawingCanvas.svelte`, `client/src/lib/components/DrawingCanvas.test.ts`, `client/src/lib/views/WritingDrawing.svelte`, `client/src/lib/views/WritingDrawing.test.ts`, `client/src/lib/views/Reveal.svelte`, `client/src/lib/export/pngExport.ts`, `client/src/lib/export/pngExport.test.ts` — to the renamed `DrawOp`/`serializeDrawOps`/`parseDrawOps` types and functions. Run `pnpm run typecheck` and `pnpm run test` to confirm no stale references remain before moving to Phase 3/4.

## Phase 3: Drawing toolbar (color, width, fill)

- [x] T004 [artifacts: ui] Write a failing test in a new `client/src/lib/drawing/floodFill.test.ts` asserting `floodFill(imageData: ImageData, seed: Point, fillColor: string)` (new `client/src/lib/drawing/floodFill.ts`) fills every pixel in a contiguous region matching the seed pixel's exact color and stops at pixels of a different color, leaving them unchanged. Confirm the test fails (module doesn't exist yet), then implement the scanline flood-fill algorithm as a pure function with no DOM/canvas dependency beyond the `ImageData`-shaped input.
- [ ] T005 [artifacts: ui] In `DrawingCanvas.svelte`, write failing tests asserting: (a) clicking a palette color updates the color used for the next drawn stroke, (b) selecting a width preset (thin/medium/thick) updates the width used for the next drawn stroke, (c) selecting the fill tool and clicking the canvas appends a `FillOp` (via `floodFill` from T004) to the entry's draw ops rather than starting a stroke. Confirm failures, then implement: an 8-color preset palette (including black) and 3 width-preset buttons as hardcoded constants, fill-tool mode toggling pointer-event behavior between stroke-drawing and fill-on-click, and `redrawAll()` replaying `DrawOp[]` in order — setting `ctx.strokeStyle`/`ctx.lineWidth` per `StrokeOp` and invoking `floodFill` for each `FillOp`.
- [ ] T006 [parallel] In `client/src/lib/export/pngExport.ts`, write a failing test asserting `renderBookOntoContext` replays a book's `StrokeOp`s with their own `color`/`width` (not the current hardcoded `#1e293b`/`3`) and replays `FillOp`s via the same `floodFill` function from T004. Confirm failure, then: extend `MinimalCanvasContext` with `getImageData(x, y, w, h): ImageData` and `putImageData(imageData, x, y): void`, update the fake context used in `pngExport.test.ts` to implement them, and update `renderBookOntoContext` to iterate `DrawOp[]` instead of raw point arrays.

## Phase 4: Monochrome toggle

- [ ] T007 [artifacts: datamodel] Write a failing server test in `server/src/domain/roomStore.test.ts` asserting `createRoom` returns a `Room` with `monochromeOnly: false` by default. Confirm failure, then add the `monochromeOnly` field to the `Room` type in `shared/src/types.ts` and default it to `false` in `createRoom` (`server/src/domain/roomStore.ts`).
- [ ] T008 [artifacts: datamodel] Write a failing server test in `server/src/socket/handlers.test.ts` for a new `onSetMonochrome` handler: accepted (updates `Room.monochromeOnly` and broadcasts updated room state) only when the caller's `playerId` matches `Room.hostPlayerId` and `Room.status === 'lobby'`; rejected with an error otherwise — mirror the host-only/status guard shape already used in `onStartGame`. Confirm failure, then implement `onSetMonochrome` in `server/src/socket/handlers.ts` and wire a `set_monochrome` event to it in the socket dispatch table (`server/src/socket/server.ts`), per constitution Principle VIII (one named handler per event).
- [ ] T009 [artifacts: ui] [parallel] Write a failing test in `client/src/lib/views/Lobby.test.ts` asserting the "force monochrome" toggle: renders only when the current player is the host, reflects `Room.monochromeOnly`'s current value, and emits the `set_monochrome` event with the new value on change. Confirm failure, then implement in `client/src/lib/views/Lobby.svelte`.
- [ ] T010 [artifacts: ui] [parallel] Write a failing test asserting `DrawingCanvas.svelte` hides the color palette and forces the default ink color for new strokes when a `monochromeOnly` prop is `true`. Confirm failure, then implement, threading `Room.monochromeOnly` down from `WritingDrawing.svelte` as a prop.
