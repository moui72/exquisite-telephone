---
status: approved
branch: host-drawing-tool-controls
created: 2026-07-24
features: [host-drawing-tool-controls, skin-tone-palette-colors]
surfaced-defects: []
---

# Plan — Host drawing-tool controls, skin-tone palette, and drawing-canvas fixes

## Goal

Extend the host's drawing controls from the single monochrome decree to a
palette-preset choice and a fill-tool toggle, add brown/pink skin-tone
swatches to the default palette, and fix four drawing-canvas defects
surfaced in play (mid-stroke color, speckled fill, tool-selection clarity,
and cover-background clipping).

## Scope

**In scope**

- **host-drawing-tool-controls** — `Room.palettePreset`
  (`primary` / `standard` / `extended`) and `Room.allowFillTool`, their
  lobby-only host controls, server handlers, session-store methods, and the
  `DrawingCanvas` rendering that honors them.
- **skin-tone-palette-colors** — a brown and a pink swatch in the `standard`
  (default) and `extended` presets.
- **Drawing-canvas feedback** from
  `feedback-drawing-tools-reveal-and-round-0639.md`: F001 (new-stroke color
  not applied until stroke end), F002 (speckled flood fill — promotes the
  existing exact-match-flood-fill Production Annotation to a tolerance fill),
  F006 (explicit pen/bucket radio replacing the single fill toggle); and
  `feedback-cover-decoration-background-ca-4113.md` F001 (cover-decoration
  background template not clipped to the canvas).

**Out of scope** — deferred, still `open`, to their own follow-up plans:
F003 (round gating not holding — a correctness divergence, flagged for its
own priority plan next), F004 (reveal "read by" attribution legibility),
F005 (encore-vote confirmation affordance).

## Technical Approach

The host-control fields follow the established per-setting pattern exactly
(`monochromeOnly` / `onSetMonochrome` / `session.setMonochrome`): a typed
`Room` field defaulted in room creation, a host-only lobby-only Socket.IO
handler validating and applying it, a session-store emitter, and a Lobby
control with the enforced info affordance (see [[ui]] Lobby View). No new
transport mechanism is introduced. `DrawingCanvas` gains a preset lookup
(replacing the hard-coded `PALETTE_COLORS` constant with a preset map keyed
by `Room.palettePreset`) and conditionally renders the fill control on
`Room.allowFillTool`. The four fixes are localized to `DrawingCanvas.svelte`,
`floodFill.ts`, and `CoverDecorationCanvas.svelte`; F002 implements the
tolerance-threshold flood fill the [[ui]] Production Annotation already
anticipates, and F006 reshapes the fill toggle into a pen/bucket radio.

## Phase Breakdown

_Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file._

**Phase 1 — Host-control data and transport** (no dependency)
- Add `palettePreset` and `allowFillTool` to the `Room` type and to room
  creation defaults (`standard`, `true`). [feature: host-drawing-tool-controls]
- Add host-only, lobby-only `onSetPalettePreset` and `onSetFillTool` server
  handlers, validating enum/boolean and rejecting once `status` has left
  `lobby`, mirroring `onSetMonochrome`. [feature: host-drawing-tool-controls]
- Add `setPalettePreset` and `setFillTool` session-store emitters.
  [feature: host-drawing-tool-controls]

**Phase 2 — Palette presets, skin tones, and lobby controls** (depends: Phase 1)
- Replace the hard-coded `PALETTE_COLORS` with a preset map (`primary` /
  `standard` / `extended`); `DrawingCanvas` selects by `Room.palettePreset`
  and hides the fill control when `Room.allowFillTool` is `false`.
  [feature: host-drawing-tool-controls]
- Include a brown and a pink swatch in the `standard` and `extended`
  presets. [feature: skin-tone-palette-colors]
- Add the Lobby View palette-preset picker and allow-fill toggle, each with
  the enforced info affordance; the preset picker is inert while
  force-monochrome is on. [feature: host-drawing-tool-controls] [artifacts: ui]

**Phase 3 — Drawing-canvas fixes** (F006 depends: Phase 2 toolbar; others independent)
- F001: apply the active color from a new stroke's first point, not on
  stroke end. [artifacts: ui]
- F006: replace the single fill toggle with an explicit pen/bucket radio so
  the active tool is always visible. [artifacts: ui]
- F002: implement a color-distance-tolerance flood fill and update the
  [[ui]] exact-match-flood-fill Production Annotation to reflect the fix.
  [artifacts: ui]
- cover-F001: clip the cover-decoration background template to the canvas
  bounds so it can't overflow the drawing area. [artifacts: ui]

## Complexity Tracking

| Deviation | Justification |
|---|---|
| (none) | Every item reuses an existing pattern (per-setting handler, preset lookup, localized canvas fix); no new abstraction or dependency is introduced, so no Principle-I deviation requires justification. |

## Open Questions

- **Preset contents.** The exact swatch lists for `primary` (primary colors
  + black/white) and `extended` (a "larger" palette) — and which specific
  brown/pink hues read as skin tones — are pinned during Phase 2, not here.
- **Fill-toggle migration for in-flight cover work.** `allowFillTool` is
  lobby-only, so it cannot change mid-game; no runtime migration of an
  already-drawn `fill` op is needed. Confirm no path lets a forbidden-fill
  room still receive a `fill` draw op (server-side guard vs. client-only
  hiding).

## Production Annotation Summary

- F002 **resolves** the existing `## Production Annotations` entry in [[ui]]
  (exact-match flood fill leaving anti-aliased slivers) by implementing the
  tolerance-threshold fill it describes — the annotation is updated/removed,
  not added to. No new production shortcut is introduced by this plan.
