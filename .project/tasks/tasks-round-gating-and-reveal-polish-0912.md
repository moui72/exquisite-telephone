---
plan: plan-round-gating-and-reveal-polish-2026-07-24-400e.md
generated: 2026-07-24
status: in-progress
---

# Tasks

## Phase 1: Round-gating fix

> **BLOCKED — F003 not reproducible (2026-07-24).** T001 requires a *red*
> reproduction of a round-gate bypass; none can be written because no bypass
> exists. Every turn-assignment path already consults the
> `position > currentRoundFor(room)` gate and each already has a passing test:
> shared `computeNextEntry` (`shared/src/turnAdvancement.ts:98`, test
> `turnAdvancement.test.ts:206`), server submit `onSubmitEntry` round-not-open
> guard (`server/src/socket/handlers.ts:788`, test `handlers.test.ts:184`),
> server force-empty `resolveTimeoutVote` (via `computeNextEntries`), and the
> client `myTurn` (`WritingDrawing.svelte:44`, via `computeNextEntries`). The
> gate landed **2026-07-14** (commits `b171910`, `598c22e` — the F001-reversal
> work), ten days *before* this feedback (2026-07-24), and the grace-drift work
> (also 2026-07-24) already builds on correctly-gated rounds. A definitive
> multi-round integration test driving a maximally-staggered real submit
> sequence confirmed the invariant holds (no book ever exceeds min+1; no player
> is ever offered two books in a round; game completes cleanly) — it ran green,
> so it could not serve as the required red repro and was not committed.
> Conclusion: F003 was already closed at the shared/server layer before this
> plan was written; any residual symptom is a client-perception/display matter
> outside this plan's shared+server scope. T001/T002 left unchecked for the
> coordinator to adjudicate per "don't work around; STOP and report."

- [ ] T001 [artifacts: ui, datamodel] Reproduce F003 (feedback-drawing-tools-reveal-and-round-0639): write a failing test that constructs a room whose books sit at divergent round positions (one book's `entries.length` ahead of another's) and asserts that no next entry is assigned to the ahead book while `position > currentRoundFor(room)` — i.e. the room-wide round gate holds. Put the test where the bypassed path lives: extend `shared/src/turnAdvancement.test.ts` if `computeNextEntry`/`computeNextEntries` is the gap, or add a `server/src/index.test.ts` case if the server assigns entries without consulting them. Confirm it fails (red) before any fix. This is the diagnosis task — its failure pinpoints the bypassed path.

- [ ] T002 [artifacts: ui, datamodel] Fix F003: route the path that T001's test exposed through `turnAdvancement`'s round-gate guard so a book is never advanced/assigned an entry while `position > currentRoundFor(room)`, making T001's test pass. Keep behavior consistent with the shipped 30-second grace countdown (plan-dismissable-grace-and-drift), whose firing window assumes correctly gated rounds — verify existing grace-countdown tests still pass. No artifact edit expected (ui.md/datamodel already specify round-gating correctly); if the fix reveals an artifact inaccuracy, stop and surface it rather than editing the artifact here.

## Phase 2: Reveal attribution legibility

- [x] T003 [artifacts: ui] Fix F004 (feedback-drawing-tools-reveal-and-round-0639): in `client/src/lib/views/Reveal.svelte`, render the "read by" and "being read by" attribution notes on the book card surface (or as self-backgrounded badges) so they stay legible against the reveal background instead of floating over it. Write a failing `Reveal.test.ts` assertion first (the attribution nodes carry the card/badge surface treatment, not bare-on-background), then implement.

## Phase 3: Encore-vote confirmation

- [x] T004 [artifacts: ui] Fix F005 (feedback-drawing-tools-reveal-and-round-0639): give the non-host encore voter a post-vote affordance in `client/src/lib/views/Reveal.svelte` — after voting, the "Vote for an Encore" button becomes "Withdraw encore vote" and retracts the vote (removing the player from `Room.playAgainVotes`; add the withdraw emitter mirroring `session.voteToPlayAgain`). Write failing `Reveal.test.ts` cases first (button reflects voted/not-voted state; withdraw retracts), then implement. Also add the voter-side affordance to `ui.md`'s End-of-game controls (currently only the host-side readiness count is specified) — this is the artifact-revision half of the task.
