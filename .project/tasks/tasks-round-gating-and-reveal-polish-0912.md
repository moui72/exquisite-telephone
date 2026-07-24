---
plan: plan-round-gating-and-reveal-polish-2026-07-24-400e.md
generated: 2026-07-24
status: in-progress
---

# Tasks

## Phase 1: Round-gating fix

- [ ] T001 [artifacts: ui, datamodel] Reproduce F003 (feedback-drawing-tools-reveal-and-round-0639): write a failing test that constructs a room whose books sit at divergent round positions (one book's `entries.length` ahead of another's) and asserts that no next entry is assigned to the ahead book while `position > currentRoundFor(room)` — i.e. the room-wide round gate holds. Put the test where the bypassed path lives: extend `shared/src/turnAdvancement.test.ts` if `computeNextEntry`/`computeNextEntries` is the gap, or add a `server/src/index.test.ts` case if the server assigns entries without consulting them. Confirm it fails (red) before any fix. This is the diagnosis task — its failure pinpoints the bypassed path.

- [ ] T002 [artifacts: ui, datamodel] Fix F003: route the path that T001's test exposed through `turnAdvancement`'s round-gate guard so a book is never advanced/assigned an entry while `position > currentRoundFor(room)`, making T001's test pass. Keep behavior consistent with the shipped 30-second grace countdown (plan-dismissable-grace-and-drift), whose firing window assumes correctly gated rounds — verify existing grace-countdown tests still pass. No artifact edit expected (ui.md/datamodel already specify round-gating correctly); if the fix reveals an artifact inaccuracy, stop and surface it rather than editing the artifact here.

## Phase 2: Reveal attribution legibility

- [ ] T003 [artifacts: ui] Fix F004 (feedback-drawing-tools-reveal-and-round-0639): in `client/src/lib/views/Reveal.svelte`, render the "read by" and "being read by" attribution notes on the book card surface (or as self-backgrounded badges) so they stay legible against the reveal background instead of floating over it. Write a failing `Reveal.test.ts` assertion first (the attribution nodes carry the card/badge surface treatment, not bare-on-background), then implement.

## Phase 3: Encore-vote confirmation

- [ ] T004 [artifacts: ui] Fix F005 (feedback-drawing-tools-reveal-and-round-0639): give the non-host encore voter a post-vote affordance in `client/src/lib/views/Reveal.svelte` — after voting, the "Vote for an Encore" button becomes "Withdraw encore vote" and retracts the vote (removing the player from `Room.playAgainVotes`; add the withdraw emitter mirroring `session.voteToPlayAgain`). Write failing `Reveal.test.ts` cases first (button reflects voted/not-voted state; withdraw retracts), then implement. Also add the voter-side affordance to `ui.md`'s End-of-game controls (currently only the host-side readiness count is specified) — this is the artifact-revision half of the task.
