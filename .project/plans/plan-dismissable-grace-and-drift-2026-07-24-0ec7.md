---
status: approved        # draft -> approved -> superseded (schema-of-record: scripts/lint-project.sh)
branch: dismissable-grace-and-drift   # the branch inline implementation would use; may never be created (see step 1)
created: 2026-07-24
features: []
surfaced-defects: [8b429ce5, 809c08f2]
---

# Plan: Dismissable cover grace + drift cleanup

## Goal

Let a player skip the 30-second mid-game cover-decoration grace countdown to go straight to their turn, and clear the two documentation-drift defects left over from the previous artifact-drift-cleanup pass.

## Scope

**Included:**

- **F001 (feedback, UX)** — the 30-second grace countdown that appears when a
  player's next turn is ready while they're mid-decoration should be
  dismissable: a skip control that ends the countdown early and hands the
  player straight to their turn view. The countdown is client-side only and
  does not touch the turn timer or server state, so the skip is a client
  change plus a `ui.md` revision documenting the control.
- **8b429ce5 (defect, datamodel)** — the author-rotation clause in the Laps
  section still reads `% players.length`; the code (`computeNextEntry`) rotates
  over `activePlayers(room)`/`activeCount`. Docs-only wording fix (sibling of
  the completion-formula clause fixed last pass).
- **809c08f2 (defect, infrastructure)** — the Config Lockstep allowlist says
  "`app` alone", but `scripts/fly-config/generate.ts` now has two per-channel
  keys (`app`, `E2E_SEAM_ENABLED`). Fix the artifact wording and the stale
  "app is the only key" header comment in the generator template (which
  propagates into the committed `fly.toml` / `fly.staging.toml`).

**Not included** — no change to the end-of-game decoration window
(`Room.status === 'decorating'`, server-tracked); only the mid-game 30s grace
countdown is touched. No behavior change from the two defect fixes (docs and a
generated comment only).

## Technical Approach

The grace-countdown skip is a UI affordance on the existing client-side
countdown that renders before the turn view takes over (see `ui.md` Turn view
/ Cover Decoration and `[[datamodel]]` Normalization Rules — Cover
decoration): add a control that resolves the countdown immediately for that
player. No server round-trip, no turn-timer effect — same semantics as letting
the countdown expire, just on demand. The two defect fixes bring stale wording
back in line with code that is already correct; the infrastructure fix also
touches the generator template comment so the committed fly configs regenerate
consistently (`gen:fly` / `check:fly`).

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in the linked tasks file.

**Phase 1 — Documentation drift fixes** (no dependencies; different files, parallelizable)

- Correct the datamodel.md author-rotation clause to reference the active roster [artifacts: datamodel] [defect: 8b429ce5]
- Correct the infrastructure.md Config Lockstep allowlist wording to name both `app` and `E2E_SEAM_ENABLED`, and fix the matching "app is the only key" header comment in `scripts/fly-config/fly.template.toml`, regenerating `fly.toml` / `fly.staging.toml` via `gen:fly` so the committed configs match [artifacts: infrastructure] [defect: 809c08f2]

**Phase 2 — Dismissable grace countdown** (independent of Phase 1; addresses feedback F001)

- Add a skip/dismiss control to the 30-second mid-game cover-decoration grace countdown in the client turn-transition view, ending the countdown early and advancing the player to their turn, with a test [addresses feedback F001]
- Revise ui.md to document the grace-countdown skip control [artifacts: ui] [addresses feedback F001]

## Complexity Tracking

None — two documentation fixes and one small client-side UI affordance; no deviations from the simplest solution to justify.

## Open Questions

None — the grace countdown is already established as client-side only; the skip is a local resolution of it.

## Production Annotation Summary

None — no production shortcut is introduced or newly documented by this plan.
