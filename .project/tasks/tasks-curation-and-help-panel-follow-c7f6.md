---
plan: plan-curation-and-help-panel-follow-2026-07-22-4cab.md
generated: 2026-07-22
status: completed
---

# Tasks

Constitution Principle III (Test-First) applies to code with testable behavior.
Several tasks here are documentation (SKILL.md), workflow YAML, or CSS-only
styling — validated structurally (the snippet actually runs; YAML parses;
existing component tests stay green) rather than by a new unit test, per the
Principle III documentation/no-behavior-change exception.

## Phase 1: Curation-review skill fixes

- [x] T001 Fix the `curation-review` SKILL.md "Invoking the helper" snippet so
  the documented invocation actually runs: rewrite the `pnpm --filter server
  exec tsx -e '...'` example to avoid top-level `await` (wrap in an async IIFE,
  or point it at a small file). Verify by running the corrected snippet end to
  end against a sample snapshot and confirming it prints reconcile/analyze
  output. (feedback F001, curation; file
  `.claude/skills/curation-review/SKILL.md` — Invoking the helper)
- [x] T002 [artifacts: infrastructure] Add a first step to the
  `curation-review` skill's Inputs/Procedure where it **offers** to fetch the
  pipe snapshot itself, read-only (`fly ssh sftp get
  …/curation-snapshot.json`), instead of requiring a pre-pull — dev still reads
  the local path; keep the no-mutating-`fly` boundary explicit. Update
  `infrastructure.md` Curation Store — Ingestion Skill so the described fetch
  posture matches. (feedback F002, curation)

## Phase 2: Scheduled aggregation workflow

- [x] T003 [artifacts: infrastructure] Create
  `.github/workflows/curation-aggregate.yml`: a weekly `schedule: cron` pinned
  to a fixed UTC time (≈Sunday 02:00 America/New_York — document the ±1h DST
  drift), plus `workflow_dispatch`. It runs `fly ssh console -C 'pnpm --filter
  server curation:aggregate'` against the running machine(s) using the existing
  Fly token secret, and accounts for the server's cached event count (trigger a
  restart after aggregating, or document the staleness) and which channel(s) it
  targets (see the plan's Open Questions — settle at implementation). Validate
  the workflow YAML parses. (feedback F003, curation)
- [x] T004 [artifacts: infrastructure] Revise `infrastructure.md` Aggregation
  Pipe: replace the "run in a deploy/restart window" manual-run wording with the
  scheduled-workflow model (naming `curation-aggregate.yml`, the weekly cadence,
  and the cached-count/restart handling chosen in T003). (feedback F003,
  curation — the reconsidered-decision artifact revision)

## Phase 3: Help-panel tab-button restyle

- [x] T005 [artifacts: ui] Restyle the Rules | About tab buttons in
  `client/src/lib/components/RulesOverview.svelte`, applying
  `/frontend-design:frontend-design` guidance: theme-consistent
  (Marigold/gilt, the Fraunces/Rubik/Space Mono type system), a clear
  selected-vs-unselected state, and good affordance. **Preserve** the existing
  `role="tablist"`/`role="tab"`/`role="tabpanel"` semantics, `aria-selected`,
  and keyboard behavior; keep `RulesOverview.test.ts` green (extend it only if a
  new asserted behavior is added, not for pure styling). Invoke the
  frontend-design skill for the aesthetic direction before writing the markup.
  (feedback F001, help-pane)
- [x] T006 [artifacts: ui] Revise `ui.md` Rules Overview Panel's tab-button
  description to match the restyled treatment from T005 (the selected/unselected
  states and theme framing), without re-specifying pixel details. (feedback
  F001, help-pane)
