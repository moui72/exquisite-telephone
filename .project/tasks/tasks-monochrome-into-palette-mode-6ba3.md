---
plan: plan-monochrome-into-palette-mode-2026-07-24-9207.md
generated: 2026-07-24
status: in-progress
---

# Tasks

## Phase 1: Artifact realignment

- [x] T001 [artifacts: datamodel] Rewrite the `Room` entity in `.project/artifacts/datamodel.md` for the single-control design (implements F001, feedback-monochrome-as-palette-option-e4ce): remove the `monochromeOnly` field row entirely; rename the `palettePreset` field to `paletteMode` (the pinned naming decision — a mode, not a color preset) and redefine its value set as `monochrome | primary | standard | extended`, default `standard`, where `monochrome` means the color palette is hidden and all strokes render in the default ink color (the old `monochromeOnly === true` behavior). Update any cross-references to `monochromeOnly`/`palettePreset` elsewhere in datamodel.md. Docs-only; no code in this task.

- [ ] T002 [artifacts: ui] Rewrite the affected `ui.md` sections for the single-control design (F001): Lobby View — replace the "force monochrome" toggle and the separate palette-preset picker with ONE **palette-mode** selector setting `Room.paletteMode` (`monochrome | primary | standard | extended`), removing the "palette-preset picker is shown but inert while force-monochrome is on" interaction; keep a single info affordance for it. Writing/Drawing View drawing-toolbar and Cover Decoration sections — describe monochrome as the `monochrome` value of `paletteMode` (palette hidden / default ink) rather than a separate `monochromeOnly` boolean. Remove remaining `monochromeOnly` references. Docs-only.

- [ ] T003 [artifacts: infrastructure] Rewrite `infrastructure.md` (F001): remove `onSetMonochrome` from the Socket.IO handler list; the palette-mode setter (`onSetPaletteMode`, renamed from `onSetPalettePreset`) is the single host lever for palette/monochrome. Remove other `onSetMonochrome`/`monochromeOnly` references. Docs-only.

## Phase 2: Code consolidation (single atomic change)

- [ ] T004 [artifacts: datamodel, ui, infrastructure] Implement the full monochrome→paletteMode consolidation (F001) as ONE atomic change — the field/type rename ripples across shared, server, and client, and the pre-commit hook gates the full workspace suite, so an incremental rename would break typecheck at a commit boundary; land it all together. TDD (constitution Principle III): first write/adjust tests for the new behavior (a `monochrome` paletteMode hides the palette and forces default ink; the host palette-mode setter accepts `monochrome`; no `monochromeOnly`/`setMonochrome`/`onSetMonochrome` symbols remain), then implement:
  - `shared/src/types.ts`: delete `Room.monochromeOnly`; rename `palettePreset` → `paletteMode` and add `monochrome` to its union (`monochrome | primary | standard | extended`, default `standard`). Update room-creation defaults and every `Room` literal across shared/server/client tests.
  - `server/src/socket/`: delete the `onSetMonochrome` handler and its wiring; rename `onSetPalettePreset` → `onSetPaletteMode` accepting the extended union. Update `server/src/domain/roomStore.ts` defaults.
  - Client: `DrawingCanvas.svelte` — drive the hide-palette/default-ink monochrome path from `paletteMode === 'monochrome'` instead of the `monochromeOnly` prop (reuse the existing rendering path, don't rewrite it). Session store — delete `setMonochrome`; rename `setPalettePreset` → `setPaletteMode`. `Lobby.svelte` — replace the force-monochrome toggle + preset picker with one palette-mode selector (place `monochrome` sensibly in the option order; keep its single info affordance so the affordance-enforcement test stays green). Update every `monochromeOnly` consumer: `WritingDrawing.svelte`, `CoverDecorationCanvas.svelte` (+ its `export let`), `DecorationWindow.svelte`, and all associated `.test.ts` files.
  - Per constitution Principle IV (No Dead Architecture): no `monochromeOnly`, `setMonochrome`, `onSetMonochrome`, or `palettePreset` symbol may remain anywhere after this task — grep to confirm. Verify the full suite (lint + typecheck + all packages) and svelte-check are green before marking complete.
