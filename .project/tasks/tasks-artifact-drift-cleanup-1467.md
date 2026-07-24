---
plan: plan-artifact-drift-cleanup-2026-07-24-d042.md   # exact filename of the source plan — authoritative binding
generated: 2026-07-24
status: in-progress   # generating -> ready -> in-progress -> completed (schema-of-record: scripts/lint-project.sh)
---

# Tasks

## Phase 1: Artifact documentation reconciliation

- [x] T001 [artifacts: datamodel] [parallel] [defect: 8c27d9ca] In `.project/artifacts/datamodel.md`, fix the laps completion-formula clause. It currently reads that a book completes after `Room.players.length * <resolved lapsPerBook>` entries and that `computeNextEntry`'s check is `position >= room.players.length` times the laps value. The code (`shared/src/turnAdvancement.ts` → `isBookComplete`) measures completion against the **active** (non-kicked) roster: `activePlayers(room).length * laps`. Reword this one clause to reference the active count, matching the other clauses in the same Laps section. Stamp frontmatter: `ardd-state.sh stamp .project/artifacts/datamodel.md last_updated 2026-07-24` (and `diagram_status stale` if the artifact declares a diagram_type and isn't `unrendered`).

- [x] T002 [artifacts: infrastructure] [parallel] [defect: e2d1fcde] In `.project/artifacts/infrastructure.md` App Versioning section, genericize the stale example. The text says the single source of truth is the root `package.json` `version` field "(`0.1.0` today …)"; root `package.json` is now `0.3.0`. Drop the literal value or rephrase it as clearly illustrative so it does not re-stale at the next release (do NOT simply bump to `0.3.0`). Leave the described mechanism unchanged. Stamp `last_updated 2026-07-24`.

- [x] T003 [artifacts: infrastructure] [parallel] [defect: 964c79ab] In `.project/artifacts/infrastructure.md`, fold the two resolved `[OPEN: …]` markers back into settled prose. (a) E2E per-sha result location + missing-result policy: `ci.yml`'s `e2e-result` job posts an `e2e/cross-browser` **commit status** and `promote.yml` **blocks** on a missing result. (b) Curation-write isolation tagging + scratch-vs-discard: isolation uses an **`x-e2e-test-signal` header** flag with the rating **discarded** (not written to a scratch path) — see `onSubmitEntry`/connect handler in `server/src/socket/`. Replace both `[OPEN:]` blocks with prose describing the decisions as made. Stamp `last_updated 2026-07-24`. (Shares a file with T002 — coordinate if run alongside it; not marked `[parallel]` against T002.)

- [x] T004 [artifacts: ui] [parallel] [defect: bc932879] In `.project/artifacts/ui.md`, update the Reveal View exhibit-plaque description. It currently states the attribution shows *Anonymous*; the code (`client/src/lib/views/Reveal.svelte` → `exhibitCaption()`) substitutes the origin author's real display name (`… Mixed Media, ${playerName(book.originAuthorId)}`) on both card and modal. Decision: code wins — document real-name attribution (the reveal is the unmasking). Stamp `last_updated 2026-07-24`.

- [x] T005 [artifacts: ui] [defect: d07cfd8c] In `.project/artifacts/ui.md`, update the Moderation Panel availability list. It currently lists the host gavel/panel as available during `lobby`, `writing`, and `reveal`; the code (`client/src/App.svelte` → `isHost` derivation) gates on `status !== 'ended'`, so it also renders during the brief `decorating` window. Decision: code wins — add `decorating` to the documented list. Stamp `last_updated 2026-07-24`. (Shares `ui.md` with T004 — coordinate; not marked `[parallel]` against T004.)

## Phase 2: Reveal readiness-count fix

- [x] T006 [defect: c7f08745] In `client/src/lib/views/Reveal.svelte`, change the play-again readiness-count denominator from `room.players.length` to `activePlayers(room)` (the helper used throughout the rest of the codebase). Today the denominator includes `kicked` records, so in a room where someone was kicked it over-counts (e.g. shows "3 of 5 ready" when only 4 players are active). Verify `activePlayers` is imported/available in this component; add the import if missing. Add or extend a test asserting the readiness denominator excludes kicked players, following the testing paradigm the codebase already uses for reveal/room logic. Independent of Phase 1.
