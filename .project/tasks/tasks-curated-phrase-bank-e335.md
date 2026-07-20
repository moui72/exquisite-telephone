---
plan: plan-curated-phrase-bank-2026-07-20-4eeb.md
generated: 2026-07-20
status: in-progress
---

# Tasks

## Phase 1: Shared types and artifact correction

- [x] T001 [artifacts: datamodel] Add a failing test in `shared/src/types.test.ts` asserting the shape of `PromptRating` (`{ phrase: string; up: number; down: number }`) and `CandidatePhrase` (`{ phrase: string; votes: number; firstLoggedAt: number }`), then add both interfaces plus `export type PromptRatingValue = 'up' | 'down'` to `shared/src/types.ts`. These are the only shapes in the app that outlive a process; document that in a doc comment on each.
- [x] T002 [parallel] Add an optional `rating?: PromptRatingValue` field to the entry-submission payload type in `shared/src/types.ts` (the type `onSubmitEntry` accepts). Optional because rating is never required to submit a turn. Test-first: assert a submission payload without `rating` still typechecks and is accepted.
- [x] T003 [artifacts: infrastructure] [parallel] Correct `.project/artifacts/infrastructure.md`: remove `onRatePrompt` from the Realtime Sync handler list, since the rating rides `onSubmitEntry` (see the plan's Technical Approach). Documentation-only — no test requirement (constitution Principle IV: docs describe only what is true).

## Phase 2: Curation store module

- [x] T004 Create `server/src/domain/curationStore.test.ts` with failing tests for load behavior: a missing file yields an empty store (`{ ratings: {}, candidates: [] }`); an unparseable file also yields an empty store AND emits a structured warning log rather than throwing (Principle IX). A lost curation file must never stop the server booting.
- [x] T005 Create `server/src/domain/curationStore.ts` satisfying T004 — module with a `createCurationStore(path, logger)` factory returning the store interface. In-memory state mirrors the file shape exactly, so there is no mapping layer.
- [x] T006 Failing tests first, then implement `recordRating(phrase, value, isBankPhrase)`: when `isBankPhrase`, increment that phrase's `up` or `down` in `ratings` (creating the record on first rating); when not a bank phrase and value is `'up'`, upsert into `candidates` by EXACT text — incrementing `votes` on an existing record rather than appending a duplicate, preserving the original `firstLoggedAt`. Cover the create-vs-increment branch for both destinations.
- [x] T007 Failing test first, then implement the discard case: a thumbs-DOWN on a non-bank phrase mutates nothing — no candidate record created, no rating record created, no throw. Test this explicitly and name it for what it is; "does nothing" is precisely the behavior a later refactor breaks silently. See `.project/artifacts/datamodel.md` Normalization Rules — Prompt rating.
- [ ] T008 Failing tests first, then implement the debounced atomic flush: serialize to a temp file in the same directory, fsync, then rename over the target. Assert that a crash simulated between write and rename leaves the PREVIOUS good file intact rather than a truncated one, and that N rapid `recordRating` calls within the debounce window produce one write, not N.
- [ ] T009 Failing test first, then implement `flush()` for explicit synchronous-on-demand writing (used by graceful shutdown in T012), independent of the debounce timer.

## Phase 3: Config and wiring

- [ ] T010 [artifacts: infrastructure] Failing test first in `server/src/config.test.ts`, then extend `loadConfig` with `curationDataPath` read from `CURATION_DATA_PATH`, defaulting to a local path. Resolves the plan's Open Question 2: pick a default that does not collide with existing `.gitignore` entries (`node_modules/`, `dist/`, `build/`, `.vite/`, `coverage/`, `.project/.lock`) and add the new path to `.gitignore` in this task.
- [ ] T011 Construct the curation store in `server/src/index.ts` and inject it into the socket layer. Per constitution Principle X the entry point WIRES only — no store logic defined inline there. Test that the server starts with a store injected and that `index.ts` contains no file I/O of its own.
- [ ] T012 Failing test first, then flush the store on graceful shutdown (SIGTERM/SIGINT) using T009's `flush()`, so a clean Fly deploy loses no ratings. Assert the handler is registered and that flush is awaited before exit.

## Phase 4: Server: origin resolution and submission handling

- [ ] T013 [artifacts: datamodel] Failing test first, then add server-side origin resolution: a set-membership test of the position-0 `Entry.content` against `CURATED_PHRASE_BANK` (imported from `shared`). Build the lookup set once at module load, not per call. Assert a phrase that is player-written but coincidentally identical to a bank entry resolves as a BANK phrase — the two are indistinguishable by text and the bank tally is the more useful destination.
- [ ] T014 [artifacts: datamodel] Failing tests first, then extend `onSubmitEntry` to accept the optional `rating`, and act on it ONLY when the submitted entry is `position === 1`. Cover: rating present at position 1 records; rating present at position 0, 2, or 3 is ignored entirely; rating absent at position 1 records nothing and the turn submits normally. Rating must never gate or fail a submission.
- [ ] T015 Failing test first, then confirm end-to-end at the handler level that a position-1 submission in curated mode routes to the bank tally, and in free-form mode (or a curated write-in) routes to the candidate pool. This is the integration point between T013's resolution and T006's routing.

## Phase 5: Client: the rating control

- [ ] T016 [artifacts: ui] Failing component test first, then add the thumbs-up/down control to the drawing view, rendered ONLY when the turn is `position === 1`. Assert it is absent at every other position — see `.project/artifacts/ui.md` Writing/Drawing View.
- [ ] T017 [artifacts: ui] Failing tests first, then implement the control's interaction: optional (submitting without touching it is the normal path), selectable, and changeable until submit. It must never block or gate the submit button. Both thumbs render regardless of phrase origin — branching the control by origin would leak which mode produced a phrase the player is not otherwise told about.
- [ ] T018 Failing test first, then include the selected rating in the `onSubmitEntry` payload. Assert that no selection sends no `rating` field (not `null`, not `'none'`) so the server's optional-field handling in T014 is exercised as designed.
- [ ] T019 [artifacts: ui] Verify no rating is ever surfaced back to any player in any view — not to the rater, not to the phrase's author, not on Reveal. Curation telemetry, not a scoreboard. This is a review-and-assert task against the client; add a test that the reveal view renders no rating data.

## Phase 6: Deployment

- [ ] T020 [artifacts: infrastructure] Add the volume mount to `fly.toml` and point `CURATION_DATA_PATH` at a file inside it. Resolves the plan's Open Question 1: the volume MUST be created in the same region as the running machine or the machine will fail to start — read the machine's actual region (`fly status`) rather than assuming `iad` from the config. Documentation/config change; no test requirement.
- [ ] T021 [artifacts: infrastructure] Document the one-time `fly volumes create` step in `infrastructure.md`'s Deployment section — a `fly deploy` will NOT create the volume for you, and a deploy against a missing volume fails at machine start. Include the region caveat from T020. Documentation-only; no test requirement.
