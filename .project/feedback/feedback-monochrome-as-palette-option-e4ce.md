---
status: planned      # open -> planned
created: 2026-07-24
plan: plan-monochrome-into-palette-mode-2026-07-24-9207.md
---

# Feedback

## Reconsidered
- [x] F001 Monochrome should be folded into the color-palette preset control
  as one option (e.g. a `monochrome` mode alongside `primary` / `standard` /
  `extended`) instead of remaining its own separate host setting. This
  reconsiders the design just shipped in the `host-drawing-tool-controls`
  feature (released in v0.4.0), where `Room.palettePreset` and
  `Room.monochromeOnly` are two independent host controls. Collapsing them
  into a single palette-mode control is simpler for the host and removes the
  awkward "palette-preset picker is shown but inert while force-monochrome is
  on" interaction currently specified. Implies retiring the `monochromeOnly`
  boolean and the `onSetMonochrome` handler in favor of a `monochrome` value
  on the palette-mode enum (or equivalent), and updating the lobby control
  from a separate force-monochrome toggle to a single palette-mode selector.
  Note this is a reversal of a very recently recorded decision — the artifacts
  describe `monochromeOnly` as the original host lever and `palettePreset` as
  the extension; the plan should treat it as a decision reversal (confirm the
  override, then bring datamodel/ui/infrastructure back in line), and weigh
  migration/back-compat for the field rename against the project's greenfield
  no-persistence model (rooms are in-memory, so there is likely no stored data
  to migrate). [artifacts: datamodel, ui, infrastructure]
