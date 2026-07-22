# Exquisite Telephone — Project Status

_Updated: 2026-07-22 (**App-version-display + semver releases planned and
tasked; backlog empty.** `plan-app-version-display-and-semver-2026-07-22-0c08.md`
(approved) → `tasks-app-version-display-and-semver-dfaf.md` (`ready`, 11 tasks,
4 phases, TDD). The app gets its own semver (root `package.json`), a
channel-aware build string injected at build time (prod `vX.Y.Z`, beta
`vX.Y.Z-beta+<sha>`), shown muted in the **Salon Footer** and prominently in
the help-panel **About tab**; `promote.yml` auto-bumps + tags + releases on
promotion; `ci.yml` passes the beta build-args.

**Drift fixed along the way:** `ui.md` had lost its About-tab description (a
casualty of the Reveal-rework merge — a `git checkout --theirs` on `ui.md`
discarded a non-conflicting section that was only on `main`), even though
`about-tab-help-panel` is shipped in `RulesOverview.svelte`. This plan restored
the About-tab description to match the code. **Worth a `/ardd-defects` sweep**
to catch any *other* drift from that same merge.

The curation follow-up feedback (`feedback-curation-pipe-followups-b8ae.md`, 3
items) was deliberately left for its own run and is still open.

Nothing is in flight. Local `main` is 23 commits ahead of `origin`.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding.

## Cross-Artifact Issues

None (lint clean). Note the About-tab restoration brought `ui.md` back in line
with the shipped `RulesOverview.svelte`.

## Constitution Compliance

No violations. Build-time injection over a runtime endpoint (Principle I);
`package.json` as the version source fits the Manifest/Script Hygiene standard;
the one deviation (`promote.yml` writing a bump commit) is justified in the
plan's Complexity Tracking.

## Diagrams

- datamodel.md — stale ⚠️ (curation ledger/quarantine — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (curation pipe/skill + App Versioning — run /ardd-diagram infrastructure)
- ui.md — stale ⚠️ (About tab restored + version display — run /ardd-diagram ui)

## Code-vs-Artifact Defects

- 0 recorded in DEFECTS.md (last checked 2026-07-21) — but the About-tab
  drift found this session is evidence a `/ardd-defects` pass is due. Run it to
  capture any other merge-loss drift.

## Feedback

- 1 open feedback file (`feedback-curation-pipe-followups-b8ae.md`, 3 items:
  SKILL.md `tsx -e` bug; skill self-fetch UX; weekly scheduled aggregate
  workflow) — left for its own `/ardd-plan` run.

## Feature Backlog

- 0 backlogged · 0 planned · 1 tasked · 20 implemented · 1 subsumed — see
  `.project/features/`. Backlog is empty.
  - Tasked: `app-version-display-and-semver` (this plan, ready to implement).

## Work Queue

- `tasks-app-version-display-and-semver-dfaf.md` — plan
  `plan-app-version-display-and-semver-2026-07-22-0c08.md`, feature
  `app-version-display-and-semver`: the only `ready` file; nothing else in
  flight.

## In Flight

Nothing in flight — no worktrees, no in-progress tasks files.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: `/ardd-implement`
the `app-version-display-and-semver` tasks file (11 tasks, TDD). Other open
loops: plan the curation follow-up feedback; run `/ardd-defects` (the About-tab
drift suggests other merge-loss drift may exist); a `/ardd-diagram` pass for
the three stale diagrams; and ship the accumulated `main` work (curation +
docs) to beta by pushing, then promote to prod.
