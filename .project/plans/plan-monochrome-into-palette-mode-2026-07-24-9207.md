---
status: approved
branch: monochrome-into-palette-mode
created: 2026-07-24
features: []
surfaced-defects: []
---

# Plan — Fold monochrome into a single palette-mode control

## Goal

Reverse the two-control palette design shipped in v0.4.0: retire
`Room.monochromeOnly` and `onSetMonochrome` and fold monochrome into a single
host palette-mode control that also offers the color presets, updating the
datamodel, ui, and infrastructure artifacts and the code to match.

## Scope

This plan implements confirmed reconsidered-feedback F001
(`feedback-monochrome-as-palette-option-e4ce.md`) — a user-confirmed reversal
of a decision shipped to production.

**In scope**

- **Artifact realignment** (F001 is a decision reversal, so the artifacts are
  brought back in line, per the reviewer negotiation): rewrite the relevant
  sections of `datamodel.md`, `ui.md`, and `infrastructure.md` to the
  single-control design.
- **Shared + server**: retire `Room.monochromeOnly`; extend the palette-mode
  field to include a `monochrome` value alongside the color presets; retire
  the `onSetMonochrome` handler and `setMonochrome` emitter, folding their
  behavior into the palette-mode setter; update room-creation defaults and
  every `Room` literal/test.
- **Client**: drive monochrome rendering from the palette-mode value (palette
  hidden, strokes in default ink when the mode is `monochrome`); replace the
  two Lobby host controls (force-monochrome toggle + palette-preset picker)
  with one palette-mode selector; update every consumer that currently
  threads `monochromeOnly` (`WritingDrawing.svelte`,
  `CoverDecorationCanvas.svelte`, `DecorationWindow.svelte`, the session
  store, and tests).

**Out of scope** — no persistence migration is needed (rooms are in-memory,
[[datamodel]]). No behavior change to the color presets themselves or the
fill-tool control. No other open feedback (there is none).

## Technical Approach

The two shipped fields — `Room.monochromeOnly` (boolean) and
`Room.palettePreset` (`primary`/`standard`/`extended`) — collapse into one
palette-mode field whose value set gains `monochrome`. Per constitution
Principle IV (No Dead Architecture), `monochromeOnly` and `onSetMonochrome`
are deleted, not left alongside — the palette-mode setter is the single host
lever. `DrawingCanvas`'s existing monochrome path (hide palette, use default
ink) is re-driven by "mode is `monochrome`" instead of the boolean, so the
rendering logic is reused, not rewritten. The Lobby's two controls become one
selector; the enforced info-affordance test (one affordance per host setting)
sees one fewer setting and must stay green. All state remains host-set,
lobby-only, and server-authoritative exactly as today — only the shape of the
one field and its setter changes.

## Phase Breakdown

_Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file._

**Phase 1 — Artifact realignment** (no dependency; do first so 2–3 build to it)
- Rewrite `datamodel.md` `Room`: remove `monochromeOnly`; redefine the
  palette-mode field to include `monochrome` (palette hidden / default ink)
  alongside the color presets. [F001] [artifacts: datamodel]
- Rewrite `ui.md`: Lobby View gets one palette-mode selector in place of the
  force-monochrome toggle + preset picker (removing the "inert while
  force-monochrome is on" interaction); the drawing-toolbar/cover sections
  describe monochrome as a mode value. [F001] [artifacts: ui]
- Rewrite `infrastructure.md`: remove `onSetMonochrome` from the handler
  list; the palette-mode setter is the single host lever. [F001]
  [artifacts: infrastructure]

**Phase 2 — Shared type + server** (depends: Phase 1)
- In `shared/src/types.ts` retire `Room.monochromeOnly` and extend the
  palette-mode field with `monochrome`; update room-creation defaults and
  all `Room` test literals. Retire the `onSetMonochrome` server handler and
  its wiring (`server/src/socket/`), folding behavior into the palette-mode
  handler. TDD per constitution Principle III. [F001]
  [artifacts: datamodel, infrastructure]

**Phase 3 — Client** (depends: Phase 2)
- Drive `DrawingCanvas` monochrome rendering from the palette-mode value;
  retire the `setMonochrome` session emitter (fold into the palette-mode
  emitter); replace the two Lobby controls with one palette-mode selector;
  update every `monochromeOnly` consumer (`WritingDrawing.svelte`,
  `CoverDecorationCanvas.svelte`, `DecorationWindow.svelte`) and their tests.
  TDD. [F001] [artifacts: ui]

## Complexity Tracking

| Deviation | Justification |
|---|---|
| (none) | A field/setter consolidation that reuses the existing monochrome rendering path and removes code (Principle IV) — no new abstraction or dependency, so no Principle-I deviation to justify. |

## Open Questions

- **Field naming.** Whether to rename `Room.palettePreset` → `Room.paletteMode`
  (clearer once `monochrome` — a mode, not a color preset — is a value) or
  keep the `palettePreset` name with the extra value. Default: rename to
  `paletteMode`, applied consistently across the three artifacts and the code
  (in-memory state, so the rename is cheap and Principle IV favors accurate
  naming). Pin in Phase 1.
- **Selector shape and ordering.** Where `monochrome` sits among the options
  and the selector's label/affordance copy — pinned in Phase 1/Phase 3.

## Production Annotation Summary

- No production shortcut is introduced by this plan.
