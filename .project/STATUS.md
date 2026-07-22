# Exquisite Telephone — Project Status

_Updated: 2026-07-22 (**Slim-image curation-CLI fix shipped to `main`; all
queues empty.** `tasks-curation-cli-prod-entrypoint-2206.md` (4 tasks) is
`completed` and merged, worktree reaped. The scheduled/on-machine aggregate now
invokes the compiled `node server/dist/curation/cli.js` (workflow + SKILL +
`infrastructure.md` updated); a new guard test (`server/src/curation/
cli-dist.test.ts`, verified fail-if-absent) plus a `curation:aggregate:dist`
script keep the compiled entrypoint from silently vanishing. Suite green (234
server). This closes the curation feature's last thread — the scheduled
aggregation is now genuinely runnable in prod.

Nothing is in flight. Backlog, feedback, and work queue are all empty. Prod on
`v0.2.0`; beta on latest `main`.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding.

## Cross-Artifact Issues

None (lint clean).

## Constitution Compliance

No violations.

## Diagrams

- datamodel.md — stale ⚠️ (curation ledger/quarantine — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (curation pipe/skill, App Versioning, scheduled aggregate — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (About tab, version display, restyled tabs — run /ardd-diagram ui)

## Code-vs-Artifact Defects

- 0 defects — DEFECTS.md verified 2026-07-22. Artifacts match the code.

## Feedback

- No open feedback.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 21 implemented · 1 subsumed — see
  `.project/features/`. Backlog empty.

## In Flight

Nothing in flight — no worktrees, no ready or in-progress tasks files.

## Deployment

- **Prod:** `v0.2.0` at `ex-tel.ty-pe.com`.
- **Beta:** current `main` at `beta-ex-tel.ty-pe.com` (redeploys on the next
  code push).
- Local `main` is ahead of `origin` by this session's unpushed commits
  (curation-CLI fix + docs) — the fix touches real code, so a push redeploys
  beta.

## Summary

0 issues found. Nothing planned or in flight. The only open loop is a
`/ardd-diagram` pass to refresh the three stale diagrams (datamodel,
infrastructure, ui) after this session's feature work; otherwise the project is
at a clean rest. Push `main` to ship the fix to beta when ready.
