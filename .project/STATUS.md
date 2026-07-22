# Exquisite Telephone — Project Status

_Updated: 2026-07-22 (**Curation aggregation pipe + ingestion skill shipped to
`main`.** `tasks-curation-data-aggregation-pipe-d7bf.md` (11 tasks, TDD) is
`completed` and merged, worktree reaped. Feature
`curation-data-aggregation-pipe` → `implemented`. Full suite green (521 tests).

Delivered: `shared/sanitizeForDisplay` (control/escape + bidi/zero-width,
output-only); the `server` **pipe** (`server/src/curation/` — folds via
`aggregate()`, sanitizes on output, writes a durable snapshot + readable
summary, archives folded events snapshot-then-move; `curation:aggregate`
script); the ledger/count-analysis helper (`ledger.ts` — `REMOVAL_MIN_SAMPLE=20`,
`REMOVAL_DOWN_RATIO=0.6`, `ADDITION_MIN_VOTES=3`); and the **`curation-review`**
Claude Code skill (read-only snapshot fetch, ledger reconcile, offensive
quarantine, `PROMPT_CRITERIA.md`-judged Markdown recommendation report,
`[untrusted]`-labeled, never edits the deck / never mutates via `fly`).
`.gitignore` protects the ledger/quarantine/snapshot/archive.

Also this session: `app-version-display-and-semver` was backlogged (semver
ex-tel releases + a user-visible in-app version for feedback triage).

Nothing is in flight. Local `main` is 20 commits ahead of `origin` — this
feature is not deployed yet.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding.

## Cross-Artifact Issues

None. The shipped pipe/skill match `infrastructure` (Aggregation Pipe /
Ingestion Skill), `datamodel` (sanitization dedup-key invariant;
ledger/quarantine artifacts), and `constitution` (maintainer tooling scope).

## Constitution Compliance

No violations. The `curation-review` skill is maintainer tooling per
`constitution` v1.1.1 (not app runtime); the recommend-only / no-deck-write
Production Annotation landed at the head of `server/src/curation/ledger.ts`.

## Diagrams

- datamodel.md — stale ⚠️ (ledger/quarantine + sanitization note — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (Aggregation Pipe + Ingestion Skill — run /ardd-diagram infrastructure)
- ui.md — current ✅

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-21. Run
  /ardd-defects to refresh.

## Feature Backlog

- 1 backlogged · 0 planned · 0 tasked · 20 implemented · 1 subsumed — see
  `.project/features/`.
  - Backlogged: `app-version-display-and-semver` — target with
    `/ardd-plan app-version-display-and-semver`.

## In Flight

Nothing in flight — no worktrees, no ready or in-progress tasks files.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step:
`/ardd-plan app-version-display-and-semver` (the one backlog item). Other open
loops: a `/ardd-diagram` pass for the two stale diagrams, and shipping the
accumulated `main` work (20 commits — curation feature + docs) to beta by
pushing, then promoting to prod when ready.
