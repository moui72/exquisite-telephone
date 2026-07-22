# Exquisite Telephone — Project Status

_Updated: 2026-07-22 (**Slim-image curation-CLI fix planned and tasked.**
`plan-curation-cli-prod-entrypoint-2026-07-22-bc34.md` (approved) →
`tasks-curation-cli-prod-entrypoint-2206.md` (`ready`, 4 tasks). The bug: the
scheduled/manual aggregate invoked `tsx src/curation/cli.ts`, absent from the
slim prod image. The fix is small — the server `tsc` build already emits
`server/dist/curation/cli.js` and the runtime image already copies
`server/dist`, so it just repoints the workflow + SKILL + `infrastructure.md`
at `node server/dist/curation/cli.js` (dev keeps `tsx`) and adds a regression
guard. No behavior change, no image change. The consuming feedback is now
`planned`; no open feedback remains.

Nothing is in flight. Prod is on `v0.2.0`; beta has the tab restyle.)_

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

- 0 recorded in DEFECTS.md (verified 2026-07-22). The slim-image CLI bug is
  now captured as planned feedback (not recorded drift).

## Feedback

- No open feedback — `feedback-curation-cli-slim-image-996e.md` is `planned`,
  consumed by the plan above.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 21 implemented · 1 subsumed — see
  `.project/features/`. Backlog empty.

## Work Queue

- `tasks-curation-cli-prod-entrypoint-2206.md` — plan
  `plan-curation-cli-prod-entrypoint-2026-07-22-bc34.md`, no bound features
  (feedback-driven): the only `ready` file; nothing else in flight.

## In Flight

Nothing in flight — no worktrees, no in-progress tasks files.

## Deployment

- **Prod:** `v0.2.0` at `ex-tel.ty-pe.com`.
- **Beta:** current `main` at `beta-ex-tel.ty-pe.com` (tab restyle live once the
  push's deploy finishes).

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: `/ardd-implement`
the `tasks-curation-cli-prod-entrypoint-2206.md` fix (4 tasks) — this makes the
scheduled aggregate actually runnable in prod. Then a `/ardd-diagram` pass for
the three stale diagrams. Backlog and feedback are otherwise empty.
