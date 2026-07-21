---
plan: plan-export-polish-and-about-tab-2026-07-21-4c22.md
generated: 2026-07-21
status: in-progress
---

# Tasks

## Phase 1: Export strip styling (branded-png-export-styling + export-panel-dividers)

Gated on the `reveal-self-guided-rework` branch merging first — it relocates
the save-to-PNG call site (into the per-book modal's last page) while leaving
`exportBookToPng` itself unchanged. These tasks edit inside that function, so
land them after the rework merges. The constitution declares Test-First
Development (Principle III): each implementation task is preceded by a test
written and confirmed failing first.

- [x] T001 [artifacts: infrastructure] Write a failing test for the PNG
  exporter (`exportBookToPng`, client) asserting the composited strip renders
  a visible divider/border between each turn's panel — e.g. locate the export
  helper's per-panel layout and assert divider pixels/segments exist at each
  panel boundary for a multi-entry `Book`. Confirm it fails (red) before any
  implementation. Per [[infrastructure]] Export Pipeline (PNG) "Strip styling
  — dividers and branding".
- [x] T002 [artifacts: infrastructure] Implement per-panel dividers in
  `exportBookToPng`: draw a divider/border between each turn's panel in the
  existing off-screen compositing pass, using the Marigold theme accent
  ([[ui]] Visual Identity), as pure layout math over the existing per-panel
  geometry — no `Book`/`Entry` shape change. Make T001 pass.
- [x] T003 [artifacts: infrastructure] Write a failing test asserting the
  exported strip carries (a) a branded frame border around the whole strip and
  (b) a footer band with the "Exquisite Telephone" wordmark and the string
  `ex-tel.ty-pe.com`. Assert the footer URL is a fixed constant (present
  regardless of the running host/channel). Confirm red before implementation.
- [x] T004 [artifacts: infrastructure] Implement the branded frame border and
  the wordmark + `ex-tel.ty-pe.com` footer in the same compositing pass as the
  dividers. The URL is a hard-coded production constant (never derived from the
  running host), with a `PRODUCTION ANNOTATION` comment at the constant per the
  plan's Production Annotation Summary and the [[constitution]] Development
  Workflow convention. Make T003 pass.

## Phase 2: About tab in the help panel (about-tab-help-panel)

Independent of Phase 1; touches the Rules Overview Panel, which the Reveal
rework does not. Sequenced after Phase 1 only for a clean serial branch.

- [ ] T005 [artifacts: ui] Write a failing test for the Rules Overview Panel
  (client) asserting it renders two tabs — Rules and About — with Rules
  selected by default on open, and that switching to About shows its content
  while Rules is the initial view. Confirm red before implementation. Per
  [[ui]] Rules Overview Panel.
- [ ] T006 [artifacts: ui] Refactor the Rules Overview Panel into a tabbed
  structure: move the existing docent-voice rules copy under a Rules tab
  (default selected), add an empty About tab shell. Preserve all existing rules
  content and the Salon Footer "?" entry point unchanged. Make T005 pass.
- [ ] T007 [artifacts: ui] Write a failing test asserting the About tab renders
  the inspiration credits (Exquisite Corpse, Telephone, and Telestrations with
  explicit trademark-acknowledgment / non-affiliation wording) and two external
  links — repo `https://github.com/moui72/exquisite-telephone` and sponsor
  `https://github.com/sponsors/moui72` — each opening in a new tab with an
  accessible label naming its destination. Confirm red before implementation.
- [ ] T008 [artifacts: ui] Implement the About tab content: the inspiration
  credits in docent voice with the Telestrations trademark/non-affiliation
  statement, and the repo + sponsor links (new tab, accessible labels). Make
  T007 pass. Per [[ui]] Rules Overview Panel — About tab.
