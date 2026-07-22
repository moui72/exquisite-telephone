---
status: approved
branch: curation-and-help-panel-follow
created: 2026-07-22
features: []
surfaced-defects: []
---

# Plan — curation follow-ups + help-panel tab styling

## Goal

Address two feedback rounds: fix and streamline the `curation-review` skill and
schedule the aggregation run, and restyle the help-panel's Rules/About tab
buttons.

## Scope

Consumes `feedback-curation-pipe-followups-b8ae.md` (F001–F003) and
`feedback-help-pane-tab-button-styling-8637.md` (F001). Unrelated topics
bundled at the user's request; the phases are independent.

**In scope.**
- **Curation skill fixes** — repair the `SKILL.md` `tsx -e` helper snippet (it
  uses top-level `await`, which fails), and make the skill **offer to fetch the
  pipe snapshot itself** read-only (`fly ssh sftp`), rather than requiring a
  pre-pull.
- **Scheduled aggregation** — replace the manual `fly ssh console; pnpm
  --filter server curation:aggregate` run with a **weekly GitHub Actions
  workflow** (Sunday 02:00 ET), reversing the documented "run in a
  deploy/restart window" model.
- **Help-panel tab buttons** — restyle the Rules | About tab buttons in
  `RulesOverview.svelte`, applying `/frontend-design:frontend-design` guidance,
  keeping the ARIA tablist/keyboard semantics intact.

**Not in scope.**
- **Changing the pipe's fold/sanitize/archive behavior** — untouched; only its
  invocation (scheduled) and the skill's fetch step change.
- **The injection defenses / recommend-only boundary** — unchanged.
- **Regenerating the stale diagrams** — a follow-up `/ardd-diagram` pass.

## Technical Approach

The three areas are independent and reference the artifacts rather than
repeating them.

**Skill fixes are surgical.** The `SKILL.md` "Invoking the helper" example is
rewritten to run without top-level `await` (async IIFE or a small file); the
Inputs/Procedure section gains a first step where the skill **offers** the
read-only `fly ssh sftp get …/curation-snapshot.json` fetch (dev still reads
the local path), preserving the no-mutating-`fly` boundary
([[infrastructure]] Curation Store — Ingestion Skill).

**Scheduled aggregation reuses the existing CLI.** A new
`.github/workflows/curation-aggregate.yml` runs on a weekly `cron`, `fly ssh
console -C 'pnpm --filter server curation:aggregate'` against the running
machine using the existing Fly token secret. GitHub cron is UTC and ignores
DST, so the schedule is pinned to a fixed UTC time documented as "≈2am ET". The
pipe archives events but the server caches its event count until restart
([[infrastructure]] Aggregation Pipe), so the workflow must account for the
restart (trigger one, or document the staleness). `infrastructure.md`'s
"run in a deploy/restart window" wording is revised to the scheduled model.

**Tab buttons get a design pass.** `/frontend-design:frontend-design` drives
the visual rework of the tab buttons — theme-consistent (Marigold/gilt,
Fraunces/Rubik/Space Mono), a clear selected-vs-unselected state, good
affordance — with the existing `role="tablist"`/tab/tabpanel semantics and
keyboard handling preserved. `ui.md`'s Rules Overview Panel tab description is
revised to match.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in
the linked tasks file. The three phases are independent (no ordering
dependency).

### Phase 1 — Curation-review skill fixes

- Fix the `SKILL.md` "Invoking the helper" snippet so the documented invocation
  runs (no top-level `await`) — feedback F001 (curation).
- Add a first-step **offer** to fetch the snapshot read-only (`fly ssh sftp`);
  dev reads the local path; no-mutating-`fly` boundary preserved — feedback
  F002 (curation) `[artifacts: infrastructure]` (Ingestion Skill fetch
  description revised to match).

### Phase 2 — Scheduled aggregation workflow

- New `.github/workflows/curation-aggregate.yml`: weekly `cron` (≈Sunday 02:00
  ET, pinned to a fixed UTC time), `fly ssh console -C '…curation:aggregate'`
  using the existing Fly token, accounting for the cached-count/restart
  interaction — feedback F003 (curation).
- Revise `infrastructure.md` Aggregation Pipe: the manual "run in a
  deploy/restart window" model becomes the scheduled workflow — feedback F003
  `[artifacts: infrastructure]`.

### Phase 3 — Help-panel tab-button restyle

- Restyle the Rules | About tab buttons in `RulesOverview.svelte` per
  `/frontend-design:frontend-design` guidance, preserving ARIA tablist/tab/
  tabpanel roles and keyboard behavior; keep `RulesOverview.test.ts` green —
  feedback F001 (help-pane).
- Revise `ui.md` Rules Overview Panel's tab-button description to match the new
  treatment — feedback F001 (help-pane) `[artifacts: ui]`.

## Open Questions

- **Which channel(s) the aggregation schedule targets** — beta, prod, or both
  (each has its own volume). The feedback flagged this; a per-run decision to
  settle in Phase 2.
- **How the workflow handles the server's cached event count** — trigger a
  machine restart after aggregating, or accept/document the staleness until the
  next deploy. Phase 2 decision.
- **Exact UTC cron time** — 06:00 UTC (2am EST) vs 07:00 UTC (2am EDT); pick one
  fixed time and document the ±1h seasonal drift.
