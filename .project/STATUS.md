# Exquisite Telephone — Project Status

_Updated: 2026-07-22 (**v0.2.0 shipped to prod; follow-up plan tasked.** The
prod promotion cut the first real semver release — `package.json` bumped to
`0.2.0`, tag `v0.2.0`, GitHub release, prod deployed. Local `main` rebased onto
the bump (linear history preserved).

Both open feedback files were consumed into one approved plan,
`plan-curation-and-help-panel-follow-2026-07-22-4cab.md` →
`tasks-curation-and-help-panel-follow-c7f6.md` (`ready`, 6 tasks, 3 independent
phases): (1) fix the `curation-review` SKILL.md `tsx -e` snippet + add a
read-only snapshot self-fetch offer; (2) a weekly `curation-aggregate.yml`
workflow replacing the manual aggregate run (revises the infrastructure
Aggregation Pipe model — a reconsidered decision); (3) restyle the help-panel
Rules|About tab buttons via `/frontend-design` (revises ui Rules Overview
Panel). No open feedback remains.

Nothing is in flight.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding. (The plan carries 3 Open Questions —
aggregation channel targeting, cached-count/restart handling, exact UTC cron
time — to settle at implementation.)

## Cross-Artifact Issues

None (lint clean).

## Constitution Compliance

No violations.

## Diagrams

- datamodel.md — stale ⚠️ (curation ledger/quarantine — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (curation pipe/skill + App Versioning — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (About tab + version display — run /ardd-diagram ui)

## Code-vs-Artifact Defects

- 0 defects — DEFECTS.md verified 2026-07-22. Artifacts match the code.

## Feedback

- No open feedback — both files (`feedback-curation-pipe-followups-b8ae.md`,
  `feedback-help-pane-tab-button-styling-8637.md`) are `planned`, consumed by
  the plan above.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 21 implemented · 1 subsumed — see
  `.project/features/`. Backlog empty.

## Work Queue

- `tasks-curation-and-help-panel-follow-c7f6.md` — plan
  `plan-curation-and-help-panel-follow-2026-07-22-4cab.md`, no bound features
  (feedback-driven): the only `ready` file; nothing else in flight.

## In Flight

Nothing in flight — no worktrees, no in-progress tasks files.

## Deployment

- **Prod:** `v0.2.0` (promoted this session) at `ex-tel.ty-pe.com`.
- **Beta:** current `main` at `beta-ex-tel.ty-pe.com`.
- Local `main` is ahead of `origin` by unpushed `.project/` docs commits (the
  v0.2.0 rebase + this plan run) — docs-only, so pushing won't redeploy beta.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: `/ardd-implement`
the `tasks-curation-and-help-panel-follow-c7f6.md` file (6 tasks; Phase 3
invokes `/frontend-design` for the tab buttons). Then a `/ardd-diagram` pass
for the three stale diagrams. Backlog and feedback are both empty.
