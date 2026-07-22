# Exquisite Telephone — Project Status

_Updated: 2026-07-22 (**Curation aggregation pipe + ingestion skill planned and
tasked — backlog now empty.** `plan-curation-data-aggregation-pipe-2026-07-22-4c9b.md`
(approved) → `tasks-curation-data-aggregation-pipe-d7bf.md` (`ready`, 11 tasks,
5 phases, TDD). Designed against
`research-curation-aggregation-pipe-2026-07-21-4bbe.md`.

Two deliverables: (1) a deterministic `server` CLI **pipe** — reuse
`aggregate()`, a pure display-safety **sanitizer** (output-only, never the
exact-text dedup key), and **archive** folded events (snapshot-then-move,
draining `MAX_CURATION_EVENTS`); (2) a repo-local **ingestion skill** — a
Claude Code maintainer tool that read-only fetches the pipe snapshot, keeps a
gitignored **ledger** + **offensive-quarantine**, and recommends deck
add/removes judged against `PROMPT_CRITERIA.md` for a human to apply. The
injection defense is architectural (structured-data isolation, no deck writes,
no mutating `fly`, human-in-the-loop), not a string filter.

Artifact design applied: `infrastructure` (Aggregation Pipe + Ingestion Skill
sections; rewrote the `MAX_CURATION_EVENTS` annotation), `datamodel`
(dedup-key sanitization invariant + CurationLedger/OffensiveQuarantine
maintainer artifacts), and **`constitution` bumped v1.1.0 → v1.1.1** (maintainer
tooling — incl. the LLM ingestion skill — is not app runtime).

Nothing is in flight. Both channels were current at the last deploy; this
feature is not built or deployed yet.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding. (Three plan-time details are parked in the
plan's Open Questions — skill name/report shape, removal threshold, offensive-
flag mechanism — not artifact gaps.)

## Cross-Artifact Issues

None. The pipe/skill concepts, the sanitization dedup-key invariant, and the
maintainer-tooling scope are defined and referenced consistently across
`infrastructure`/`datamodel`/`constitution`; lint clean.

## Constitution Compliance

No violations. `constitution` v1.1.1 explicitly scopes the LLM ingestion skill
as maintainer tooling (not app runtime), so it does not breach the
party-game/no-premature-scaling scope. The plan's Complexity Tracking justifies
the LLM tool and the ledger/quarantine files. Production annotations
(recommend-only boundary; drop-fallback between pipe runs) are recorded in
`infrastructure`.

## Diagrams

- datamodel.md — stale ⚠️ (ledger/quarantine + sanitization note — run /ardd-diagram datamodel)
- infrastructure.md — stale ⚠️ (Aggregation Pipe + Ingestion Skill — run /ardd-diagram infrastructure)
- ui.md — current ✅

## Code-vs-Artifact Defects

- 0 known defects — see DEFECTS.md, last checked 2026-07-21. Run
  /ardd-defects to refresh.

## Feature Backlog

- 0 backlogged · 0 planned · 1 tasked · 19 implemented · 1 subsumed — see
  `.project/features/`. **The backlog is empty** — everything logged is
  planned or shipped.
  - Tasked: `curation-data-aggregation-pipe` (this plan, ready to implement).

## Work Queue

- `tasks-curation-data-aggregation-pipe-d7bf.md` — plan
  `plan-curation-data-aggregation-pipe-2026-07-22-4c9b.md`, feature
  `curation-data-aggregation-pipe`: the only `ready` file; nothing else in
  flight to overlap.

## In Flight

Nothing in flight — no worktrees, no in-progress tasks files.

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: run
`/ardd-implement` and pick `tasks-curation-data-aggregation-pipe-d7bf.md`
(11 tasks, TDD, delegates to a background worktree). With the backlog empty,
after this the open loops are: a `/ardd-diagram` pass for the two stale
diagrams, and shipping the accumulated `main` work to beta/prod when ready.
