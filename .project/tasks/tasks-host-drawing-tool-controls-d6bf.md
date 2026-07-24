---
plan: plan-host-drawing-tool-controls-2026-07-24-590b.md
generated: 2026-07-24
status: in-progress
---

# Tasks

## Phase 1: Host-control data and transport

- [x] T001 [artifacts: datamodel] Add `palettePreset` (`'primary' | 'standard' | 'extended'`, default `'standard'`) and `allowFillTool` (`boolean`, default `true`) to the `Room` interface in `shared/src/types.ts`, and set both defaults wherever a `Room` is created on the server (room-creation handler). Write a failing test first (shared/server) asserting a newly created room has `palettePreset === 'standard'` and `allowFillTool === true`, then implement. Feature: host-drawing-tool-controls.

- [x] T002 [artifacts: infrastructure] Add host-only, lobby-only Socket.IO handlers `onSetPalettePreset` and `onSetFillTool` in the server, mirroring `onSetMonochrome`: validate the enum / boolean payload, reject when caller is not host or when `Room.status` has left `'lobby'`, and broadcast the updated room. Register both in the handler wiring. Write failing `server/src/index.test.ts` cases first (accepts valid value in lobby from host; rejects non-host; rejects after game start), then implement. Feature: host-drawing-tool-controls.

- [x] T003 [artifacts: infrastructure] Add `setPalettePreset(preset)` and `setFillTool(allow)` emitter methods to the client session store (`client/src/lib/stores/session.ts`), mirroring `setMonochrome` (event name following the existing set-setting convention). Write a failing store test first asserting each emits the correct event with `roomId`/`playerId`/value, then implement. Feature: host-drawing-tool-controls.

## Phase 2: Palette presets, skin tones, and lobby controls

- [x] T004 [artifacts: ui, datamodel] In `client/src/lib/components/DrawingCanvas.svelte`, replace the hard-coded `PALETTE_COLORS` constant with a preset map keyed by `'primary' | 'standard' | 'extended'`; render the palette from the room's `palettePreset` (passed as a prop like `monochromeOnly`), and hide the fill control entirely when `allowFillTool` is `false`. Write failing `DrawingCanvas.test.ts` cases first (each preset renders its swatch set; fill control absent when `allowFillTool={false}`; palette still hidden when `monochromeOnly`), then implement. Feature: host-drawing-tool-controls.

- [x] T005 [artifacts: ui] Add a brown and a pink skin-tone swatch to the `standard` and `extended` presets defined in T004 (choose hues that read as skin tones per the plan's open question; leave `primary` unchanged). Extend the `DrawingCanvas.test.ts` preset assertions to require both swatches present in `standard` and `extended` and absent from `primary`. Feature: skin-tone-palette-colors.

- [x] T006 [artifacts: ui] Add the Lobby View palette-preset picker (sets `palettePreset` via `setPalettePreset`) and allow-fill toggle (sets `allowFillTool` via `setFillTool`) beside the force-monochrome toggle, each carrying the enforced info affordance; the preset picker is shown but inert while force-monochrome is on. Write failing tests first: `Lobby.test.ts` for the two new controls' presence and wiring, and confirm the existing affordance-enforcement test now covers both new settings. Then implement. Feature: host-drawing-tool-controls.

## Phase 3: Drawing-canvas fixes

- [x] T007 [artifacts: ui] Fix F001 (feedback-drawing-tools-reveal-and-round-0639): a new stroke must render in the active color from its first point, not switch only on stroke end. In `DrawingCanvas.svelte`, capture the effective color at stroke start and use it for the whole in-progress stroke. Write a failing test first reproducing the mid-stroke stale color, then implement.

- [x] T008 [artifacts: ui] Fix F006 (feedback-drawing-tools-reveal-and-round-0639): replace the single fill toggle in `DrawingCanvas.svelte`'s toolbar with an explicit pen/bucket radio so the active tool is always visible (respecting T004's fill-hidden-when-forbidden behavior — the radio shows pen-only when `allowFillTool` is `false`). Write failing `DrawingCanvas.test.ts` cases first (radio reflects and switches the active tool; bucket option absent when fill forbidden), then implement. Depends on T004 (toolbar).

- [x] T009 [artifacts: ui] [parallel] Fix F002 (feedback-drawing-tools-reveal-and-round-0639): replace the exact-match flood fill in `client/src/lib/drawing/floodFill.ts` with a color-distance-tolerance fill so anti-aliased stroke edges no longer leave speckle/slivers. Write a failing `floodFill` test first (fill leaves no residual near-color pixels at an anti-aliased boundary), then implement. Update the `## Production Annotations` exact-match-flood-fill entry in `ui.md` to reflect the resolved behavior (remove or restate — Principle IV, no dead architecture).

- [x] T010 [artifacts: ui] [parallel] Fix cover-F001 (feedback-cover-decoration-background-ca-4113): clip the cover-decoration background template to the canvas bounds in `client/src/lib/components/CoverDecorationCanvas.svelte` so a chosen background/template cannot overflow the drawing area. Write a failing `CoverDecorationCanvas.test.ts` case first (background constrained to canvas bounds), then implement.
