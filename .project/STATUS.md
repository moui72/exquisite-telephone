# Exquisite Telephone — Project Status

_Updated: 2026-07-21 (**Book cover decoration + templates shipped.**
`tasks-book-cover-decoration-9d9b.md` (20 tasks, TDD) is `completed` and
**merged into `main`**, worktree reaped. Live now: a new `decorating` room
phase with a 2-minute gated window (closed by the existing sweep,
independent of the turn timer), `onSubmitCover`, the cover-decoration canvas
(reusing `DrawingCanvas`), a book-id-keyed shared draft across the waiting
state and the decoration window, the Reveal card face using the drawn cover
with `generateCoverArt` fallback, and nine CSS/SVG background templates.
Full suite green (509 tests). Features `book-cover-decoration` and
`pregenerated-book-cover-templa` → `implemented`.

Nothing is in flight and no tasks file is ready — the queue is empty except
one independent backlog item.

**One flagged deviation** to consider (not a bug): the 30s grace arms for any
early finisher on the decoration screen, not only one who has drawn ink —
tightening it would contradict the shipped T014 test, so it was left as-is.
Capture with `/ardd-feedback` if the stricter reading is wanted.

Local `main` is 24 commits ahead of `origin` (this feature + the plan/STATUS
docs) — unpushed. Prod and beta were both current as of the last promotion,
but this feature has not been deployed to either yet.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding. The plan's two Open Questions were
resolved in implementation: `Book.cover` is a parsed `DrawOp[]` (capped via
`serializeDrawOps` against the drawing byte cap); templates are nine
self-contained CSS/inline-SVG patterns in `client/src/lib/covers/templateArt.ts`.

## Cross-Artifact Issues

None. The shipped `decorating` phase, `onSubmitCover`, and cover fields match
`datamodel`/`infrastructure`/`ui`.

## Constitution Compliance

No violations. The decoration window reuses the existing sweep (Principle I),
the cover canvas reuses `DrawingCanvas` (Principle II), and the two justified
deviations are in the plan's Complexity Tracking. No new production shortcut.

## Diagrams

- datamodel.md — stale ⚠️ (cover fields + `decorating` phase — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (`onSubmitCover` + sweep window-close — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (Cover Decoration view — run /ardd-diagram ui)

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-21. Run
  /ardd-defects to refresh. (The 30s-grace deviation above is a design
  interpretation, not a code-vs-artifact defect.)

## Feature Backlog

- 1 backlogged · 0 planned · 0 tasked · 19 implemented · 1 subsumed — see
  `.project/features/`. Target a backlogged slug with `/ardd-plan <slug>`.
  - Backlogged: `curation-data-aggregation-pipe` (independent; the last
    unplanned item).

## In Flight

Nothing in flight — no worktrees, no ready or in-progress tasks files.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: **push `main`** (24
commits ahead) to ship cover decoration to beta, then optionally promote to
prod. `curation-data-aggregation-pipe` is the last backlog item to plan;
a `/ardd-diagram` pass would refresh the three stale diagrams; and
`/ardd-feedback` can capture the 30s-grace deviation if the stricter reading
is intended.
