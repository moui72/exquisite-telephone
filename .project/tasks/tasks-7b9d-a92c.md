---
plan: plan-7b9d-2026-07-17-dded.md
generated: 2026-07-17
status: in-progress
---

# Tasks

## Phase 1: Fix

- [x] T001 [artifacts: infrastructure, ui] Write a failing test in
  `client/src/lib/export/pngExport.test.ts` reproducing the flood-fill
  leak: construct a `Book` with at least 3 entries — e.g. a text entry, a
  drawing entry containing an unbounded background `fill` op (seeded on
  open background with no enclosing stroke boundary), and another text or
  drawing entry after it. Call `renderBookOntoContext` against a fake
  `MinimalCanvasContext` (matching the existing test file's pattern) and
  assert that pixels belonging to the *other* entries' rows are
  unaffected by the fill color afterward. This test must fail against
  current code, which lets the fill bleed across row boundaries via
  `getImageData(0, 0, width, height)` spanning the whole composite
  canvas. `[feedback: feedback-main-8a99.md F001]`
- [ ] T002 [artifacts: infrastructure, ui] Fix the `fill` op branch in
  `renderBookOntoContext` (`client/src/lib/export/pngExport.ts`,
  currently around lines 86-90):
  ```ts
  } else {
    const imageData = ctx.getImageData(0, 0, width, height);
    floodFill(imageData, { x: op.point.x, y: op.point.y + y }, op.color);
    ctx.putImageData(imageData, 0, 0);
  }
  ```
  Change it to scope the flood fill to just the current entry's own row:
  ```ts
  } else {
    const imageData = ctx.getImageData(0, y, width, DRAWING_ROW_HEIGHT);
    floodFill(imageData, { x: op.point.x, y: op.point.y }, op.color);
    ctx.putImageData(imageData, 0, y);
  }
  ```
  (Note the seed point drops the `+ y` offset since the extracted
  `imageData` is now row-local, starting at this entry's own `y`.) Make
  T001 pass. Do not modify `client/src/lib/drawing/floodFill.ts` — it
  already operates correctly against whatever bounds it's given; only
  what `pngExport.ts` hands it needs to change.
  `[feedback: feedback-main-8a99.md F001]`

## Phase 2: Verification

- [ ] T003 Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test`
  across the whole workspace (shared/server/client) and confirm
  everything passes. Then manually verify live via the `/run` pattern:
  create a room with 3 players, play through to a drawing turn, use the
  fill tool to background-fill an unbounded region (no enclosing stroke),
  finish the game, go to Reveal, and save that book as a PNG — confirm
  the fill color only appears within that one drawing entry's row in the
  exported image, not bleeding into the other entries' rows above/below
  it. Report results.
