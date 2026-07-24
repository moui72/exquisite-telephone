---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: artifact-drift-cleanup   # the branch inline implementation would use; may never be created (see step 1)
created: 2026-07-24
features: []
surfaced-defects: [8c27d9ca, e2d1fcde, 964c79ab, bc932879, d07cfd8c, c7f08745]
---

# Plan: Artifact drift cleanup

## Goal

Reconcile the six drift defects from the 2026-07-24 `/ardd-defects` survey — five by correcting stale artifact wording, one by fixing the reveal readiness denominator in code.

## Scope

**Included** — all six entries from the current `DEFECTS.md`:

- `8c27d9ca` — datamodel.md laps completion-formula clause still reads `room.players.length` where the code (and the rest of the same section) uses the **active** roster.
- `e2d1fcde` — infrastructure.md App Versioning example literal (`0.1.0 today`) is stale; genericize so it can't re-stale at the next release.
- `964c79ab` — infrastructure.md carries two `[OPEN: …]` markers whose decisions the code has since made; fold them back as resolved.
- `bc932879` — ui.md reveal plaque documents `Anonymous`; code renders the origin author's real name. **Decision: code wins** — document real-name attribution.
- `d07cfd8c` — ui.md lists the moderation gavel for `lobby`/`writing`/`reveal`; code also renders it during `decorating`. **Decision: code wins** — add `decorating`.
- `c7f08745` — `Reveal.svelte` play-again readiness denominator uses `room.players.length` (counts kicked players) instead of `activePlayers(room)`. **Decision: fix code.**

**Not included** — no feature work, no new capability, no behavior change beyond the single readiness-denominator correction. `DEFECTS.md` itself classifies all six as "no broken contract."

## Technical Approach

Five of the six are pure documentation reconciliation against decisions the code already made — edit the artifact text and refresh its frontmatter (`last_updated`; `diagram_status stale` where the artifact renders). The one code change (`c7f08745`) brings a single divergent line into agreement with the codebase's own `activePlayers()` convention (defined in `shared/`), matching the kicked-record semantics documented in datamodel.md. No datamodel or infrastructure decision changes; the artifacts are being brought in line with code, not the reverse.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in the linked tasks file.

**Phase 1 — Artifact documentation reconciliation** (no dependencies; items touch different artifacts and can proceed in parallel)

- Fix datamodel.md laps completion-formula clause to reference the active roster [artifacts: datamodel] [defect: 8c27d9ca]
- Genericize the infrastructure.md App Versioning version example [artifacts: infrastructure] [defect: e2d1fcde]
- Fold the two resolved `[OPEN: …]` markers in infrastructure.md back into settled prose (E2E per-sha commit-status + missing-result blocking policy; `x-e2e-test-signal` header isolation with rating discarded) [artifacts: infrastructure] [defect: 964c79ab]
- Update ui.md reveal plaque description to document real-name attribution [artifacts: ui] [defect: bc932879]
- Update ui.md moderation-panel availability to include `decorating` [artifacts: ui] [defect: d07cfd8c]

**Phase 2 — Reveal readiness-count fix** (independent of Phase 1)

- Change the `Reveal.svelte` play-again readiness denominator from `room.players.length` to `activePlayers(room)` [defect: c7f08745]

## Complexity Tracking

None — cosmetic drift reconciliation and a one-line convention fix; no deviations from the simplest solution to justify.

## Open Questions

None — all four which-side-wins decisions were resolved before drafting.

## Production Annotation Summary

None — no production shortcut is introduced or newly documented by this plan.
