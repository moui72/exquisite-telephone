---
status: approved
branch: export-polish-and-about-tab
created: 2026-07-21
features: [branded-png-export-styling, export-panel-dividers, about-tab-help-panel]
surfaced-defects: []
---

# Plan — export polish and About tab

## Goal

Give exported PNG strips per-panel dividers plus Exquisite Telephone
branding (frame + wordmark/URL footer), and add an About tab to the help
panel crediting the game's inspirations and linking its source and
sponsor page.

## Scope

Three backlogged features, all presentational and client-side, sharing no
data-model or server changes:

- `branded-png-export-styling` — the exported strip gains a branded frame
  border and a footer bearing the wordmark and `ex-tel.ty-pe.com`.
- `export-panel-dividers` — the exported strip gains clear
  borders/dividers between each turn's panel.
- `about-tab-help-panel` — the Rules Overview Panel becomes tabbed
  (Rules + About); the About tab credits Exquisite Corpse, Telephone, and
  Telestrations (trademark acknowledgment, not affiliation), and links the
  GitHub repo (`https://github.com/moui72/exquisite-telephone`) and GitHub
  Sponsors (`https://github.com/sponsors/moui72`).

**In scope.** The two export features are bundled: both live inside the
client PNG exporter (`exportBookToPng`) and are composited in the same
pass, so they are implemented together against one export test surface.
The About tab is independent (Rules Overview Panel / Salon Footer),
sequenced after the export work only for a clean serial branch, not
because they interact.

**Not in scope.**
- `book-cover-decoration` — deliberately deferred. It collides with the
  in-flight `reveal-self-guided-rework` (which rewrites the Reveal View
  and keeps `generateCoverArt` as the card face); its cover design should
  be planned against that settled design in a later run.
- Any server-side change. No new Socket.IO handler, no `Room`/`Entry`
  field, no curation-store touch. `Book`/`Entry` data the exporter reads
  is unchanged.
- HTML/SVG/PDF export formats (already deferred past v1 by
  [[infrastructure]]).
- Re-rendering the `infrastructure`/`ui` Mermaid diagrams after these
  edits — a follow-up `/ardd-diagram` pass, not a task here (both were
  marked `diagram_status: stale` during planning).

## Technical Approach

All three changes are client-side rendering/markup work, referencing
decisions already recorded in the artifacts rather than introducing new
ones:

- **Export styling** — the strip compositing in `exportBookToPng` (see
  [[infrastructure]] Export Pipeline (PNG)) draws, in the same off-screen
  canvas pass it already uses: a divider between each panel (Marigold
  accent), a gilt-style frame border around the whole strip, and a footer
  band with the wordmark and the static string `ex-tel.ty-pe.com`. The URL
  is a hard-coded constant (the production custom domain), never derived
  from the running host, so a beta-saved strip still points at production.
  Dividers and the frame are pure layout math over the existing per-panel
  geometry; no `Book`/`Entry` shape changes.
- **About tab** — the Rules Overview Panel (see [[ui]] Rules Overview
  Panel) gains a two-tab structure. The existing rules copy moves under a
  Rules tab (default); a new About tab renders the credits and two
  external links (new tab, accessible labels naming the destination). The
  Telestrations mention is worded as a trademark acknowledgment with an
  explicit non-affiliation statement.

**Dependency on the in-flight Reveal rework.** `reveal-self-guided-rework`
relocates the save-to-PNG call site (into the per-book modal's last page)
but leaves `exportBookToPng` itself unchanged. The export-styling work
lives *inside* that function, so its design is stable regardless — but its
implementation tasks should land **after** the rework merges, to avoid
editing the export call site while it is being relocated. Phase 1 is
gated on that merge (see Phase Breakdown). The About tab touches the Rules
Overview Panel, which the rework does not, so it carries no such gate
beyond sharing this plan's serial branch.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is
tracked in the linked tasks file. Phases are ordered; later phases depend
on earlier ones as noted.

### Phase 1 — Export strip styling (bundle: branded-png-export-styling + export-panel-dividers)

Gated on the `reveal-self-guided-rework` branch merging first (it
relocates the export call site). Implemented together since both edit the
same exporter and composite in one pass.

- Test the exporter produces panel dividers between turns and a branded
  frame + wordmark/URL footer (per [[infrastructure]] Export Pipeline),
  following the constitution's Test-First paradigm.
- Implement per-panel dividers in `exportBookToPng`.
- Implement the branded frame border and the wordmark + `ex-tel.ty-pe.com`
  footer in the same compositing pass; the URL is a hard-coded production
  constant.

### Phase 2 — About tab in the help panel (about-tab-help-panel)

Independent of Phase 1; sequenced after it only for a clean serial
branch.

- Test the Rules Overview Panel exposes Rules and About tabs, that Rules
  is the default, and that the About tab renders the inspiration credits
  (including the Telestrations trademark/non-affiliation wording) and the
  repo + sponsor links with accessible labels opening in a new tab.
- Refactor the Rules Overview Panel into a tabbed structure, moving
  existing rules copy under the Rules tab.
- Implement the About tab content and the two external links.

## Open Questions

- None. The two GitHub URLs are supplied and baked into the artifact; the
  export footer URL is the fixed production domain. The only external
  timing dependency (the Reveal rework merge, gating Phase 1) is a
  sequencing note, not an unresolved design question.

## Production Annotation Summary

- **Hard-coded export footer URL** (`ex-tel.ty-pe.com`): the exporter
  writes the production custom domain as a static string rather than
  deriving it from the running host, so a strip saved from the beta
  channel still advertises the production URL. This is intentional (a
  shared strip should point a recipient at the real game, not at beta),
  but it is a channel-agnostic constant that a future multi-domain setup
  would need to revisit — annotate it at the constant.
