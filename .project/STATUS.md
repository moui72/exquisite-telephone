# Exquisite Telephone — Project Status

_Updated: 2026-07-22 (**App version display + semver releases shipped to
`main`.** `tasks-app-version-display-and-semver-dfaf.md` (11 tasks, TDD) is
`completed` and merged, worktree reaped. Feature
`app-version-display-and-semver` → `implemented`. Full suite green.

Delivered: a channel-aware version composer (`shared/appVersion.ts`) — prod
`v0.1.0`, beta `v0.1.0-beta+<sha>`, dev `v0.1.0-dev` — baked into the client at
build time via a Vite `define` fed by Dockerfile `ARG`s; shown muted in the
Salon Footer and prominently in the About tab; `ci.yml` `deploy-beta` passes
the beta build-args (version + sha) while keeping the code-change deploy gate;
`promote.yml` gains a `bump` dispatch input (default `patch`) and, on
promotion, auto-bumps `package.json`, commits to `main`, fast-forwards
`release`, tags `vX.Y.Z`, creates the GitHub release, and versions the prod
deploy. The subagent caught and fixed a real bug (empty-string build env vs.
`undefined` → `v-dev`).

**`/ardd-defects` ran clean** (2026-07-22): a full artifact-vs-code survey
found no other drift from that `git checkout --theirs` merge — the About-tab
restoration was the only casualty and it's fixed. Safe to cut a tagged prod
release. The curation follow-up feedback
(`feedback-curation-pipe-followups-b8ae.md`, 3 items) is still open for its own
run.

Nothing is in flight. `main` is pushed to `origin` (beta deploy triggered by
that push); prod not yet promoted.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding.

## Cross-Artifact Issues

None (lint clean). The shipped version plumbing matches `infrastructure.md`
App Versioning and `ui.md` Salon Footer / Rules Overview Panel.

## Constitution Compliance

No violations. Build-time injection (Principle I); `package.json` as version
source (Manifest/Script Hygiene); the `promote.yml` bump-commit deviation is
recorded in the plan's Complexity Tracking.

## Diagrams

- datamodel.md — stale ⚠️ (curation ledger/quarantine — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (curation pipe/skill + App Versioning — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (About tab restored + version display — run /ardd-diagram ui)

## Code-vs-Artifact Defects

- 0 defects — DEFECTS.md verified 2026-07-22. A full artifact-vs-code survey
  (extra scrutiny on `ui.md` after the About-tab drift) found **no other
  merge-loss drift**; every artifact matches the code.

## Feedback

- 1 open feedback file (`feedback-curation-pipe-followups-b8ae.md`, 3 items) —
  left for its own `/ardd-plan` run.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 21 implemented · 1 subsumed — see
  `.project/features/`. Backlog and work queue are both empty.

## In Flight

Nothing in flight — no worktrees, no ready or in-progress tasks files.

## Summary

0 issues found. Safe to /plan: yes. No ready work remains. Recommended next
steps, in rough priority: (1) **promote to prod** — `main` is pushed and
beta-deployed, defects are clean, so a `promote.yml` dispatch will cut the
first real semver tag; (2) plan the curation follow-up feedback; (3) a
`/ardd-diagram` pass for the three stale diagrams.
