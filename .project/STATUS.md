# Exquisite Telephone — Project Status

_Updated: 2026-07-23 (**Confirmation-dialog work SHIPPED (5/5, merged).** A
shared `ConfirmDialog` component landed (`client/src/lib/components/`), the
Reveal unread-books warning migrated onto it behavior-preserving, and all
three destructive Moderation Panel controls — End game, Restart, **and Kick**
(dialog names the player) — are now confirmation-gated. Branch merged to `main`
(`3098784`) and reaped; `reusable-confirmation-modal-co` and
`host-control-confirmation-guar` → **implemented**, feedback F001 closed, suite
green. **Two deliberate implementation deviations from the plan/artifact
wording** (both sound, no re-plan needed): the component uses **callback props
(`onConfirm`/`onCancel`) not events** — matching the codebase's universal
callback-prop convention and Svelte 5 realities — and adds an **`ariaLabel`
prop** (defaults to heading) so the migrated Reveal warning keeps its existing
accessible name. Focus-trap open question resolved: a dependency-free
`svelte:window` Tab-cycle between the two controls, initial focus on cancel,
Escape=cancel. Register: 24 implemented · 1 subsumed; 0 backlogged/tasked, 0
open feedback. `ui.md` and `infrastructure.md` diagrams remain stale.)_

_Updated: 2026-07-23 (**Planned & tasked the confirmation-dialog work.**
`ui.md` gained a **Confirmation Dialog (shared component)** section; all three
destructive Moderation Panel controls — End game, Restart, **and Kick** — now
specify a confirmation (a plain are-you-sure, no read-state); the Reveal
unread-books warning migrates
onto the shared component with behavior unchanged, and read/not-read framing
is documented as Reveal-only. Feedback F001 marked incorporated → planned,
bound to the plan. Plan
`plan-reusable-confirmation-modal-co-2026-07-23-029e.md` **approved**; tasks
`tasks-reusable-confirmation-modal-co-9935.md` **ready, 0/5** across 3 phases
(build the component → migrate Reveal → guard the panel; Phases 2 & 3 parallel
after Phase 1). Both `reusable-confirmation-modal-co` and
`host-control-confirmation-guar` → tasked. Register: 2 tasked · 22 implemented
· 1 subsumed; 0 open feedback. `ui.md` and `infrastructure.md` diagrams both
stale. Next: `/ardd-implement`.)_

_Updated: 2026-07-23 (**Cross-browser e2e test gate SHIPPED to beta (13/13,
merged).** The delegated worktree completed all 13 tasks; branch merged to
`main` (`adcc105`) and reaped, feature `cross-browser-e2e-game-flow-te` →
**implemented**, tasks file → completed. Delivered: Playwright suite
(chromium/firefox/webkit/msedge), a socket.io observer that asserts exact
`DrawOps`, test-only seams (an `x-e2e-test-signal` header gated by
`E2E_TEST_SIGNAL_SECRET`, curation-discard for tagged traffic, a timer seam),
a settings matrix, a beta-deploy CI job recording a per-sha GitHub commit
status (`e2e/cross-browser`), and a `promote.yml` gate that **blocks on
red-or-missing**. `E2E_SEAM_ENABLED` added as a second per-channel fly key
(beta true / prod false) via the generated template.
**TWO CAVEATS carried forward (not yet resolved):** (1) only chromium ran to
green locally — firefox/webkit/msedge specs are written but were exercised
only in principle; CI is their first real run. (2) **A one-time manual step is
REQUIRED before the gate protects curation**: set `E2E_TEST_SIGNAL_SECRET` as
BOTH a Fly secret on `exquisite-telephone-beta` and a matching GitHub Actions
repo secret — until then, test ratings would write to beta's real Curation
Store while specs still pass green (false confidence). Register: 2 backlogged ·
22 implemented · 1 subsumed; 1 open feedback. `infrastructure.md` diagram
remains stale.)_

_Updated: 2026-07-23 (**Logged host-control-confirmation feedback + backlogged
two features; e2e suite implementation in flight.** Feedback F001
(`feedback-host-control-confirmations`, **open**): the moderation panel's
destructive host controls (End game / Restart / Kick) fire with no
confirmation, unlike the Reveal page's read-state-aware guard. Backlogged
`reusable-confirmation-modal-co` (one reusable confirm dialog, customizable
text, replacing today's hand-rolled inline modals) and
`host-control-confirmation-guar` (extend confirmation to all destructive host
controls; read/not-read state surfaced only in the reveal case). Register: 2
backlogged · 1 tasked · 21 implemented · 1 subsumed; 1 open feedback. **In
flight:** the `cross-browser-e2e-game-flow-te` tasks
(`tasks-cross-browser-e2e-game-flow-te-3d40.md`) are being implemented in a
delegated worktree — 3/13 at last check; on completion it auto-merges to main
(merge_policy: auto), reaps, and re-runs status. `infrastructure.md` diagram
remains stale (`/ardd-diagram infrastructure`).)_

_Updated: 2026-07-23 (**Planned & tasked `cross-browser-e2e-game-flow-te`.**
A Playwright cross-browser e2e suite (Chromium/Firefox/WebKit/msedge) for the
main game flow, wired as a **beta-deploy job** (gated by the existing
code-change `changes` signal — fix/feat runs the full suite, docs/chore runs
nothing) that records a per-commit result, which `promote.yml` reads to gate
prod (red-or-missing blocks). Design landed in `infrastructure.md` (new
End-to-End Test Gate section; two bounded `[OPEN:]` items — the curation
test-tag mechanism and per-sha result storage/missing-result policy — both
scoped to implementation, artifact kept `stable`). Plan
`plan-cross-browser-e2e-game-flow-te-2026-07-23-cbcb.md` **approved**; tasks
`tasks-cross-browser-e2e-game-flow-te-3d40.md` **ready, 0/13** across 5
phases. Register now: 1 tasked · 21 implemented · 1 subsumed. `infrastructure.md`
diagram is now **stale** (run `/ardd-diagram infrastructure`). Next: run the
tasks with `/ardd-implement`.)_

_Updated: 2026-07-23 (**Backlogged `cross-browser-e2e-game-flow-te`** — an
end-to-end suite covering the main game flow (lobby → write/draw → reveal)
across Firefox, Safari, Chrome, and Edge, meant to run against beta as a
promote gate before prod. Register now: 1 backlogged · 21 implemented · 1
subsumed. Everything else unchanged and clean — four stable artifacts,
diagrams current, 0 defects, 0 open feedback, nothing in flight. Plan it with
`/ardd-plan cross-browser-e2e-game-flow-te` when ready.)_

_Updated: 2026-07-23 (**ArDD install updated: v1.0.5-beta.1 → v1.1.1-beta.3**
(source `c0386d3` → `9bc9b38`, beta channel). All skills reinstalled, no
migrations pending, README badge already present. Project state is otherwise
unchanged from the block below and fully clean: four stable artifacts, all
diagrams current, no open placeholders, 0 recorded defects, 0 open feedback,
nothing in flight, no orphaned completion flips, and every feature
implemented/subsumed. `up-to-date` — no further ArDD update available.)_

_Updated: 2026-07-23 (**Boudoir Damask redesign shipped to beta.** The app was
re-skinned from the light butter/marigold theme to Boudoir Damask: a deep
bordeaux ground hung with a gold fleur-de-lis damask, champagne placards and
gilt frames floating on it, sapphire as the interactive accent. Every on-ground
text spot was framed on a new `.plaque` surface (verified end-to-end in a live
2-player walkthrough). The splash title moved to Pirata One (self-hosted,
gold-gradient, no outline). Finally the palette tokens were renamed to their
colours (`butter`→`champagne`, `marigold`→`gold`, `bubblegum`→`sapphire`,
`velvet`→`wine`, `grass`→`emerald`; `ink`/`bordeaux` kept), and `ui.md`'s Visual
Identity rewritten to match. Suite green (227 client), typecheck + lint clean.

All of this is on `main` → **beta only**. **Prod is still on `v0.2.2`, the old
light theme** — a prod promote is deliberately held pending sign-off. Backlog,
feedback, and work queue are all empty.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding.

## Cross-Artifact Issues

None. The redesign is a UI-only restyle: `ui.md` Visual Identity was rewritten
for it; `datamodel.md` and `infrastructure.md` are unaffected and consistent.

## Constitution Compliance

No violations. (Prod running an older theme than beta is normal dual-channel
deploy lag, not a production shortcut — no annotation owed.)

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — current ✅ (the redesign restyled existing components and added a CSS
  `.plaque` utility; the structure-only component diagram is unchanged)

## Code-vs-Artifact Defects

- 0 defects — DEFECTS.md verified 2026-07-22. Artifacts match the code.

## Feedback

- No open feedback.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 21 implemented · 1 subsumed — see
  `.project/features/`. Backlog empty.

## In Flight

Nothing in flight — no worktrees, no ready or in-progress tasks files.

## Deployment

- **Prod:** `v0.2.2` at `ex-tel.ty-pe.com` — still the **old light theme**
  (the Boudoir redesign has not been promoted).
- **Beta:** current `main` at `beta-ex-tel.ty-pe.com` — the full Boudoir Damask
  redesign + Pirata One title + token name-sweep.

## Tooling

- ArDD update available: installed `c0386d3`, source at `v1.1.1-beta.3` (beta
  channel) — run /ardd-update.

## Summary

0 issues found. The project is at a clean rest; the redesign is complete and
verified on beta. Recommended next step: **promote to prod when you're ready to
ship the redesign** (currently held per your instruction). Optional tooling:
`/ardd-update` to pull the available ArDD release.
