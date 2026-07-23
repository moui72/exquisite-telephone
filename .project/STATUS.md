# Exquisite Telephone — Project Status

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
