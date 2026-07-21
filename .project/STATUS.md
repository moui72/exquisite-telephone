# Exquisite Telephone — Project Status

_Updated: 2026-07-21 (**Export-polish + About-tab plan approved and tasked;
Reveal rework in flight.** A new approved plan
`plan-export-polish-and-about-tab-2026-07-21-4c22.md` bundles three
backlogged features — `branded-png-export-styling`, `export-panel-dividers`
(both inside the client `exportBookToPng` path), and `about-tab-help-panel`
— into an 8-task `ready` file. Their artifact edits are applied:
`infrastructure.md` Export Pipeline now specifies strip dividers, a branded
frame, and a wordmark + `ex-tel.ty-pe.com` footer; `ui.md` Rules Overview
Panel becomes tabbed (Rules + About) with inspiration credits and
repo/sponsor links.

`book-cover-decoration` was deliberately **deferred**, not dropped: it
collides with the in-flight `reveal-self-guided-rework` (which rewrites the
Reveal View and keeps `generateCoverArt` as the card face). Plan its cover
design against that settled design in a later run.

The `reveal-self-guided-rework` run (F001–F003, self-guided Reveal) is
**in flight in a worktree at 7/10** — a delegated subagent that stalled
once and was resumed. It has not merged; its state rides its branch. Both
new artifact edits touch `infrastructure.md`/`ui.md` in different sections
than the rework, but the export **implementation** (Phase 1) is gated on
that rework merging, since it relocates the save-to-PNG call site.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding in any artifact.

## Cross-Artifact Issues

None. `infrastructure.md` Export Pipeline and `ui.md` Reveal save control /
Rules Overview Panel edits are mutually consistent, and `lint-project`
reports frontmatter schemas and `[artifacts: ...]` references valid.

## Constitution Compliance

No violations. The one shortcut introduced this session — the hard-coded
`ex-tel.ty-pe.com` export footer URL — is recorded in the new plan's
Production Annotation Summary and slated for a `PRODUCTION ANNOTATION`
comment at its constant during implementation (T004).

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — stale ⚠️ (Export Pipeline edits — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (Rules Overview Panel tabs — run /ardd-diagram ui)

(Both marked stale during planning; a `/ardd-diagram` pass is a deliberate
follow-up, not a plan task.)

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-21. Run
  /ardd-defects to refresh.

## Feature Backlog

- 2 backlogged · 0 planned · 3 tasked · 14 implemented · 1 subsumed — see
  `.project/features/`. Target a backlogged slug with `/ardd-plan <slug>`.
  - Backlogged: `book-cover-decoration` (deferred behind the Reveal rework),
    `curation-data-aggregation-pipe`.
  - Tasked (this plan): `branded-png-export-styling`, `export-panel-dividers`,
    `about-tab-help-panel`.

## Work Queue

- `tasks-export-polish-and-about-tab-08cc.md` — plan
  `plan-export-polish-and-about-tab-2026-07-21-4c22.md`, features
  `branded-png-export-styling, export-panel-dividers, about-tab-help-panel`:
  - vs in-flight `tasks-reveal-self-guided-rework-82a4.md`: **shared-artifact**
    (`infrastructure`, `ui`). Declared artifact overlap only — different
    sections, but `merge_policy: auto` still governs at merge time. Phase 1
    (export) is additionally gated on the rework merging first.

(`independent` would mean no declared overlap only, not conflict-free.)

## In Flight

- Worktree `.claude/worktrees/agent-a581269beb8e41183`
  (branch `worktree-agent-a581269beb8e41183`) —
  `tasks-reveal-self-guided-rework-82a4.md` in-progress, 7/10. Delegated
  subagent resumed after a stall; not yet merged. On completion the
  coordinator merges (`merge_policy: auto`), reaps the worktree, and
  re-runs `/ardd-status`.

## ArDD Maintenance

- ArDD update available: installed `0fc43f60`, source at `v1.0.4` (beta
  channel) — run /ardd-update.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: **wait for the
in-flight `reveal-self-guided-rework` run to finish and merge**, then run
`/ardd-implement` and pick `tasks-export-polish-and-about-tab-08cc.md`
(Phase 1's export work is gated on that merge; the About tab, Phase 2, is
independent). `book-cover-decoration` gets its own `/ardd-plan` run after
the rework lands.
