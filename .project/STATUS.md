# Exquisite Telephone — Project Status

_Updated: 2026-07-21 (**Book cover decoration + templates planned and
tasked.** `plan-book-cover-decoration-2026-07-21-589c.md` (approved) bundles
`book-cover-decoration` and `pregenerated-book-cover-templa` into a 20-task,
5-phase `ready` file (`tasks-book-cover-decoration-9d9b.md`). Artifact design
applied across all three renderable artifacts: `datamodel` gains
`Book.cover`/`coverTemplate`, a new `Room.status` value `decorating`, and
`decorationWindowStartedAt`/`coverSubmissions`; `infrastructure` adds
`onSubmitCover` and the sweep's window-close; `ui` adds the Cover Decoration
section, the decorating-window view, waiting-state decoration + a client-side
30s grace, the Reveal card-face cover-with-fallback, and the template picker.

Confirmed decisions: the drawn cover **replaces** `generateCoverArt` (falling
back to it only when a book is undecorated); the 30s grace is **client-side
only** (never touches the turn-timer deadline). The new `decorating` phase is
hosted by the existing turn-timer sweep — no second timer.

Nothing is in flight. **Both prod and beta are current** — prod was promoted
this session (run 29872934116, success), carrying the self-guided Reveal +
export/About work to `ex-tel.ty-pe.com`.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding in any artifact. (Two design questions are
tracked in the plan's Open Questions — cover serialization shape and template
artwork — to settle during implementation, not artifact gaps.)

## Cross-Artifact Issues

None. The cover-decoration concepts (`Book.cover`/`coverTemplate`,
`decorating` phase, `decorationWindowStartedAt`, `coverSubmissions`,
`onSubmitCover`) are defined in `datamodel`/`infrastructure` and referenced
consistently in `ui`; lint clean.

## Constitution Compliance

No violations. The new `decorating` phase reuses the existing sweep rather
than adding a timer (Principle I), the cover canvas reuses `DrawingCanvas`
(Principle II), and the two justified deviations are recorded in the plan's
Complexity Tracking. No new production shortcut (covers are in-memory game
state, covered by the existing annotation).

## Diagrams

- datamodel.md — stale ⚠️ (cover fields + `decorating` phase — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (`onSubmitCover` + sweep window-close — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (Cover Decoration view — run /ardd-diagram ui)

(A `/ardd-diagram` pass is a deliberate follow-up, not a plan task.)

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-21. Run
  /ardd-defects to refresh.

## Feature Backlog

- 1 backlogged · 0 planned · 2 tasked · 17 implemented · 1 subsumed — see
  `.project/features/`. Target a backlogged slug with `/ardd-plan <slug>`.
  - Backlogged: `curation-data-aggregation-pipe` (independent; the only
    unplanned item).
  - Tasked: `book-cover-decoration`, `pregenerated-book-cover-templa` (this
    plan, ready to implement).

## Work Queue

- `tasks-book-cover-decoration-9d9b.md` — plan
  `plan-book-cover-decoration-2026-07-21-589c.md`, features
  `book-cover-decoration, pregenerated-book-cover-templa`: the only `ready`
  file; nothing else in flight to overlap.

## In Flight

Nothing in flight — no worktrees, no in-progress tasks files.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: run
`/ardd-implement` and pick `tasks-book-cover-decoration-9d9b.md` (20 tasks,
TDD, delegates to a background worktree). `curation-data-aggregation-pipe`
remains to plan whenever you want it; a `/ardd-diagram` pass would refresh the
three diagrams the artifact edits left stale.
