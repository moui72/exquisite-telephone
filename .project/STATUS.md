# Exquisite Telephone — Project Status

_Updated: 2026-07-22 (**Curation + tab-styling follow-ups shipped to `main`.**
`tasks-curation-and-help-panel-follow-c7f6.md` (6 tasks) is `completed` and
merged, worktree reaped. Delivered: the `curation-review` SKILL.md `tsx -e`
snippet fixed (dynamic-import async IIFE) + a read-only snapshot self-fetch
offer; a new `.github/workflows/curation-aggregate.yml` (weekly Sun 07:00 UTC,
per-channel beta+prod jobs, `fly apps restart` after aggregating); and the
Rules|About tab buttons restyled as "gilt placards" via frontend-design (ARIA
preserved, tests green). `infrastructure.md` + `ui.md` revised to match. No
open feedback remains from that round.

**⚠ New gap found on inspection (needs follow-up):** the scheduled workflow —
and the manual run it replaced — invoke `pnpm --filter server
curation:aggregate`, which is `tsx src/curation/cli.ts`. But the prod runtime
Docker image is slim (compiled `dist/` + pruned prod deps only — no
`server/src/`, no `tsx`), so **the aggregate CLI can't run on the deployed
machine as-is**. The pipe was only ever smoke-tested in dev. Fix direction:
compile the curation CLI into `server/dist` and call `node
server/dist/curation/cli.js`. Capture with `/ardd-feedback` before relying on
the schedule.

Nothing is in flight.)_

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
- infrastructure.md — stale ⚠️ (curation pipe/skill + App Versioning + scheduled aggregate — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (About tab + version display + restyled tabs — run /ardd-diagram ui)

## Code-vs-Artifact Defects

- 0 recorded in DEFECTS.md (verified 2026-07-22). NB: the slim-image gap above
  is a fresh implementation bug (route via `/ardd-feedback`), not existing
  recorded drift.

## Feedback

- No open feedback. **Recommended:** file the curation-CLI-in-prod slim-image
  gap (above) via `/ardd-feedback`.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 21 implemented · 1 subsumed — see
  `.project/features/`. Backlog empty.

## In Flight

Nothing in flight — no worktrees, no ready or in-progress tasks files.

## Deployment

- **Prod:** `v0.2.0` at `ex-tel.ty-pe.com`.
- **Beta:** current `main` at `beta-ex-tel.ty-pe.com` once pushed.
- Local `main` ahead of `origin` by unpushed commits (this follow-up merge +
  the earlier docs). The follow-up merge touches real code
  (`RulesOverview.svelte`, the workflow), so pushing WILL redeploy beta.

## Summary

0 issues found by the routine checks. Recommended next steps: (1)
**`/ardd-feedback`** the slim-image curation-CLI gap (the scheduled aggregate
won't run in prod until fixed); (2) push to ship the tab restyle + workflow to
beta and eyeball the tabs; (3) a `/ardd-diagram` pass for the three stale
diagrams.
