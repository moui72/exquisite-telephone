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

**Still to run:** a `/ardd-defects` pass — the About-tab drift fixed last plan
means the earlier Reveal-rework merge (`git checkout --theirs` on `ui.md`) may
have dropped other artifact content the same way. The curation follow-up
feedback (`feedback-curation-pipe-followups-b8ae.md`, 3 items) is still open
for its own run.

Nothing is in flight. Local `main` is 38 commits ahead of `origin`, none
deployed yet.)_

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

- 0 recorded in DEFECTS.md (last checked 2026-07-21). **A `/ardd-defects` pass
  is due** — the About-tab drift found this session is evidence the
  Reveal-rework merge may have dropped other artifact content.

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
steps, in rough priority: (1) **push `main`** (38 commits — curation + app
version) to ship to beta, then eyeball `beta-ex-tel.ty-pe.com` and promote to
prod (which will cut the first real semver tag); (2) **`/ardd-defects`** to
check for other merge-loss drift; (3) plan the curation follow-up feedback;
(4) a `/ardd-diagram` pass for the three stale diagrams.
