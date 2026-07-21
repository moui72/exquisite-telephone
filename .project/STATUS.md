# Exquisite Telephone — Project Status

_Updated: 2026-07-21 (**Export polish + About tab shipped.** The
`plan-export-polish-and-about-tab-2026-07-21-4c22.md` tasks file (8 tasks,
TDD) is `completed` and **merged into `main`**, worktree reaped. Live now:
PNG export strips carry Marigold per-panel dividers, a gilt frame border, and
a wordmark + `ex-tel.ty-pe.com` footer (`client/src/lib/export/pngExport.ts`);
the Rules Overview Panel is tabbed (Rules default + About), the About tab
crediting Exquisite Corpse / Telephone / Telestrations with an explicit
non-affiliation statement and linking the repo and sponsor pages. Full suite
green (477 tests). Features `branded-png-export-styling`,
`export-panel-dividers`, and `about-tab-help-panel` → `implemented`.

Nothing is in flight and no tasks file is ready — the queue is empty. The
backlog holds three items, two of which (`book-cover-decoration` and its
sibling `pregenerated-book-cover-templa`) are still deferred pending a plan
against the now-settled self-guided Reveal card design.

Local `main` is 9 commits ahead of `origin/main` (this merge + the 8 task
commits) — unpushed.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding in any artifact.

## Cross-Artifact Issues

None. The shipped export styling matches `infrastructure.md` Export Pipeline,
and the tabbed panel matches `ui.md` Rules Overview Panel.

## Constitution Compliance

No violations. The hard-coded `ex-tel.ty-pe.com` export footer URL landed with
its `PRODUCTION ANNOTATION` comment at the constant, as the plan's Production
Annotation Summary required.

## Diagrams

- datamodel.md — stale ⚠️ (Reveal read-state fields added, `revealStartedAt` removed — run /ardd-diagram datamodel)
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (self-guided Reveal View + tabbed Rules/About panel — run /ardd-diagram ui)

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-21. Run
  /ardd-defects to refresh.

## Feature Backlog

- 3 backlogged · 0 planned · 0 tasked · 17 implemented · 1 subsumed — see
  `.project/features/`. Target a backlogged slug with `/ardd-plan <slug>`.
  - Backlogged: `book-cover-decoration` (deferred behind Reveal),
    `pregenerated-book-cover-templa` (depends on `book-cover-decoration`),
    `curation-data-aggregation-pipe`.

## In Flight

Nothing in flight — no worktrees, no ready or in-progress tasks files.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: **push `main`** (9
commits ahead of `origin`) to ship the export/About work to beta, then either
`/ardd-plan curation-data-aggregation-pipe` (the one backlog item with no
dependency) or refresh the two stale diagrams with `/ardd-diagram`.
`book-cover-decoration` and `pregenerated-book-cover-templa` can now be planned
against the merged Reveal design whenever you want them.
