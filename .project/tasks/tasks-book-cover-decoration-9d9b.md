---
plan: plan-book-cover-decoration-2026-07-21-589c.md
generated: 2026-07-21
status: in-progress
---

# Tasks

Constitution declares Test-First Development (Principle III): every code task
is preceded by a test written and confirmed failing (red) before implementation.
The full-suite pre-commit hook requires the red test to pass the hook, so mark
each red test `it.fails` (Vitest) on its commit and remove the marker on the
paired implementation commit.

## Phase 1: Shared state and types

- [x] T001 [artifacts: datamodel] Add reveal/decoration fields to the shared
  `Room` and `Book` types: `Book.cover` (draw-op array, same `stroke`/`fill`
  shape as an entry drawing; nullable), `Book.coverTemplate` (nullable string
  id), the `Room.status` union gains `'decorating'`, and
  `Room.decorationWindowStartedAt` (nullable epoch ms) +
  `Room.coverSubmissions` (`string[]`). Update any room/book factory defaults
  (new rooms/books start with `cover=null`, `coverTemplate=null`,
  `decorationWindowStartedAt=null`, `coverSubmissions=[]`). Add/adjust a shared
  type test asserting the new shape and defaults.
- [x] T002 [artifacts: datamodel] [parallel] Add the nine-id cover-template
  constant to `shared/` (`fan-deco`, `damask-lattice`, `marbled-endpaper`,
  `star-chart`, `herringbone-cloth`, `halftone-bloom`, `contour-field`,
  `pennant-row`, `houndstooth`) as a static constant with an exported
  `CoverTemplateId` type, plus a membership/validation helper. Test the
  constant's membership and that the id set is exactly these nine.

## Phase 2: Server — the decorating phase

- [x] T003 [artifacts: datamodel, infrastructure] Write a failing test: when
  the final entry completes the game, `onSubmitEntry` transitions
  `Room.status` to `decorating` (NOT `reveal`), stamps
  `decorationWindowStartedAt`, and leaves reveal-only records
  (`bookReads`/`currentlyReading`) empty. Confirm red.
- [x] T004 [artifacts: datamodel, infrastructure] Implement the completion
  branch change in `onSubmitEntry`: `writing → decorating` with
  `decorationWindowStartedAt = now`, replacing the direct `writing → reveal`.
  Make T003 pass; keep the existing `game_completed`/reveal logging tied to the
  eventual `→ reveal` transition (now emitted when the window closes).
- [x] T005 [artifacts: datamodel, infrastructure] Write a failing test for a
  new `onSubmitCover` handler: accepts `{ roomId, playerId, bookId, cover,
  coverTemplate }`, stores them on the caller's OWN book only (rejects when
  `Book.originAuthorId !== playerId`), rejects an oversize cover payload with
  the same drawing-payload cap as `onSubmitEntry`, appends the player to
  `coverSubmissions` (deduped), and — when all active players have submitted —
  synchronously transitions `status` to `reveal` (clearing
  `decorationWindowStartedAt`). Confirm red.
- [x] T006 [artifacts: datamodel, infrastructure] Implement `onSubmitCover`
  per T005 and register it in the socket dispatch. Make T005 pass.
- [x] T007 [artifacts: infrastructure, datamodel] Write a failing test: the
  background sweep closes an expired `decorating` window — for a room where
  `now >= decorationWindowStartedAt + 120000`, it transitions `status` to
  `reveal`, clears `decorationWindowStartedAt`, and emits the reveal/completion
  log. Confirm red.
- [x] T008 [artifacts: infrastructure, datamodel] Implement the sweep's
  decorating-window close (reusing the existing sweep interval, no new timer).
  Make T007 pass; verify no regression in the existing timeout-vote sweep tests.

## Phase 3: Client — decoration canvas and window

- [x] T009 [artifacts: ui] Write a failing test for a cover-decoration canvas
  component that reuses `DrawingCanvas`, is pre-stamped "<username>'s book",
  honors `Room.monochromeOnly`, and edits a client-local draft cover (draw ops)
  without emitting per-stroke. Confirm red.
- [x] T010 [artifacts: ui] Implement the cover-decoration canvas component per
  T009. Make it pass.
- [x] T011 [artifacts: ui, datamodel] Write a failing test for the
  `decorating` full-view screen: renders the cover canvas, a 2-minute countdown
  derived from `Room.decorationWindowStartedAt`, a "Present your cover"
  submit-early control that emits `submit_cover` and then shows a
  waiting-for-others state, and a submitted-count readout from
  `Room.coverSubmissions`. The client never advances to reveal itself — it
  waits for the server's `status` change. Confirm red.
- [x] T012 [artifacts: ui, datamodel] Implement the `decorating` window view
  and route `App` to it on `Room.status === 'decorating'`. Make T011 pass.
- [ ] T013 [artifacts: ui] Write a failing test: during `writing`, the
  round-gated waiting state offers the cover-decoration canvas, and when the
  player's next turn becomes ready while mid-decoration a 30-second client-side
  grace countdown precedes the turn view taking over — with NO change to the
  turn-timer deadline. Confirm red.
- [ ] T014 [artifacts: ui] Implement the waiting-state decoration entry point
  and the client-side 30s grace countdown per T013. Make it pass.

## Phase 4: Reveal card face uses the cover

- [ ] T015 [artifacts: ui, datamodel] Write a failing test: the Reveal card
  grid renders `Book.cover` (over `coverTemplate` when set) as the card face
  when `cover` is non-null, and falls back to the existing `generateCoverArt`
  abstract design when `cover` is null. Confirm red.
- [ ] T016 [artifacts: ui] Implement the Reveal card-face cover-with-fallback
  per T015. Make it pass; confirm undecorated books render exactly as before.

## Phase 5: Pregenerated templates

- [ ] T017 [artifacts: ui, datamodel] Write a failing test for a template
  picker above the decoration canvas offering the nine named backgrounds plus
  "blank"; selecting one sets `coverTemplate` and renders it as a low-opacity
  background beneath the ink, switchable without clearing the ink. Confirm red.
- [ ] T018 [artifacts: ui] Implement the template picker and low-opacity
  background rendering on the decoration canvas per T017. Make it pass.
- [ ] T019 [artifacts: ui] Write a failing test that a templated cover renders
  its `coverTemplate` background beneath the ink on the Reveal card face too
  (parity with the easel). Confirm red.
- [ ] T020 [artifacts: ui] Implement the template background rendering on the
  Reveal card face per T019. Make it pass.
