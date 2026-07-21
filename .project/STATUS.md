# Exquisite Telephone — Project Status

_Updated: 2026-07-21 (**Self-guided Reveal rework merged; export/About plan
ready to implement.** The `reveal-self-guided-rework` run (F001–F003, 10/10)
is **merged into `main`** and its worktree reaped — the self-guided card
grid + per-book modal, participant-visible read/being-read badges, the host
unread-books warning, and full removal of `Room.revealStartedAt` and the
synchronized-clock pacing are all live. The merge hit one real content
conflict in `ui.md`'s Reveal View (both sides edited it); resolved by taking
the rework's rewrite and re-grafting the export-styling clause onto its new
save-to-PNG sentence.

The **export-polish + About-tab** plan
(`plan-export-polish-and-about-tab-2026-07-21-4c22.md`, 8-task `ready` file)
is now **un-gated** — its Phase 1 dependency (the rework relocating the
save-to-PNG call site) has landed. `/ardd-implement` can pick it up.

New backlog idea logged this session: `pregenerated-book-cover-templa`
(nine geometric/abstract cover-background templates; depends on
`book-cover-decoration`; design mockup linked from the register entry).
Both it and `book-cover-decoration` stay **deferred** until their cover
design is planned against the now-settled Reveal card face.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding in any artifact.

## Cross-Artifact Issues

None. The merged Reveal rework (`datamodel.md` read-state fields +
`ui.md` self-guided Reveal View) and the export/About edits
(`infrastructure.md` Export Pipeline + `ui.md` Rules Overview Panel and
grafted save-control note) are mutually consistent.

## Constitution Compliance

No violations. The one shortcut on the horizon — the hard-coded
`ex-tel.ty-pe.com` export footer URL — is recorded in the export plan's
Production Annotation Summary, to be annotated at its constant during
implementation (T004).

## Diagrams

- datamodel.md — stale ⚠️ (Reveal read-state fields added, `revealStartedAt` removed — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (Export Pipeline edits — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (self-guided Reveal View + Rules Overview Panel tabs — run /ardd-diagram ui)

(A `/ardd-diagram` pass across all three is a deliberate follow-up, not a
plan task.)

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-21. Run
  /ardd-defects to refresh.

## Feature Backlog

- 3 backlogged · 0 planned · 3 tasked · 14 implemented · 1 subsumed — see
  `.project/features/`. Target a backlogged slug with `/ardd-plan <slug>`.
  - Backlogged: `book-cover-decoration` (deferred), `pregenerated-book-cover-templa`
    (new; depends on `book-cover-decoration`), `curation-data-aggregation-pipe`.
  - Tasked: `branded-png-export-styling`, `export-panel-dividers`,
    `about-tab-help-panel` (the export/About plan, ready to implement).

## Work Queue

- `tasks-export-polish-and-about-tab-08cc.md` — plan
  `plan-export-polish-and-about-tab-2026-07-21-4c22.md`, features
  `branded-png-export-styling, export-panel-dividers, about-tab-help-panel`:
  the only `ready` file; nothing else in flight to overlap with. Its Phase 1
  gate (the Reveal rework merge) is satisfied — ready to run.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: run
`/ardd-implement` and pick `tasks-export-polish-and-about-tab-08cc.md` — now
un-gated and the only ready work. `book-cover-decoration` and its sibling
`pregenerated-book-cover-templa` each get their own `/ardd-plan` run against
the now-settled Reveal card design. A `/ardd-diagram` pass would refresh the
three stale diagrams. ArDD install is current (`v1.0.5-beta.1`, `c0386d3`).
