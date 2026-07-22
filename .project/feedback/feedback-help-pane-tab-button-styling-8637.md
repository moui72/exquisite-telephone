---
status: planned
created: 2026-07-22
plan: plan-curation-and-help-panel-follow-2026-07-22-4cab.md
---

# Feedback

## UX

- [x] F001 The tab buttons in the About/help panel (Rules | About) look quite
  bad. Improve their visual design. Apply the `/frontend-design:frontend-design`
  skill's guidance when reworking them — aim for intentional, non-templated
  styling consistent with the salon/gallery theme (gilt/Marigold accents,
  Fraunces/Rubik/Space Mono type system), a clear selected-vs-unselected
  state, and good affordance. Keep the existing ARIA tablist/tab/tabpanel
  semantics and keyboard behavior intact. (code:
  `client/src/lib/components/RulesOverview.svelte` — the `role="tablist"`
  buttons; currently `chamfer-frame chamfer-slim` styled) [artifacts: ui]
