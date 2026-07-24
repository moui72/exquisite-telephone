---
status: approved
branch: round-gating-and-reveal-polish
created: 2026-07-24
features: []
surfaced-defects: []
---

# Plan — Round gating fix and reveal-screen polish

## Goal

Fix the round-gating divergence that lets a book advance ahead of the room
(F003) and add the two missing reveal-screen affordances — legible "read by"
attribution (F004) and a post-vote confirmation for the encore vote (F005).

## Scope

**In scope** — the three remaining open items from
`feedback-drawing-tools-reveal-and-round-0639.md`:

- **F003** (bug, correctness) — turn progression is not holding to the
  round-gate: a book sometimes passes and lets a player begin their next
  turn while another player is still on the current round, so rounds start
  staggered. Contradicts [[ui]] Writing/Drawing View ("waiting for the round
  to finish") and [[datamodel]] Normalization Rules (round-gated
  progression). The pure gating logic exists in
  `shared/src/turnAdvancement.ts` (`currentRoundFor`, the
  `position > currentRoundFor(room)` wait guard) — this is a divergence to
  diagnose and close, not missing logic.
- **F004** (UX) — during reveal, "read by" attribution notes are illegible
  against the background behind them; pull them onto the card surface or badge
  them so they carry their own background.
- **F005** (UX) — a non-host player who clicks "Vote for an Encore" gets no
  confirmation the vote registered; add a post-vote affordance (suggested: the
  button becomes "Withdraw encore vote", making the vote retractable), and add
  the voter-side affordance to [[ui]]'s End-of-game controls, which currently
  only specifies the host-side readiness count.

**Out of scope** — F001/F002/F006 from the same file are already tasked under
`plan-host-drawing-tool-controls-2026-07-24-590b.md`; the two palette features
likewise. No new capabilities.

## Technical Approach

F003 is diagnosed against the existing derived-state model (constitution
Principle VI): `computeNextEntry` already returns `null` when
`position > currentRoundFor(room)`, so the fix targets wherever a next entry
is assigned or a player is advanced *without* consulting that guard — the
regression test reproduces the staggered-round symptom first, then the fix
routes the bypassed path through the single `turnAdvancement` source of truth.
The fix must remain consistent with the just-shipped 30-second grace countdown
(`plan-dismissable-grace-and-drift`), whose firing window depends on rounds
being correctly gated. F004 and F005 are localized to
`client/src/lib/views/Reveal.svelte`; F005 also adds the retract path
(`session.voteToPlayAgain` already sets `Room.playAgainVotes` — the withdraw
action removes the player from it) and a matching sentence to [[ui]]'s
End-of-game controls.

## Phase Breakdown

_Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file._

**Phase 1 — Round-gating fix** (no dependency; correctness, do first)
- Reproduce F003 with a failing test that drives two books to divergent
  round positions and asserts the behind book gates the ahead book's next
  turn. [artifacts: ui, datamodel]
- Route the bypassed advancement/assignment path through
  `turnAdvancement`'s round-gate guard so no book is assigned an entry while
  `position > currentRoundFor(room)`; keep consistency with the grace-
  countdown firing window. [artifacts: ui, datamodel]

**Phase 2 — Reveal attribution legibility** (independent of Phase 1)
- F004: render the "read by" / "being read by" notes on the book card
  surface (or as self-backgrounded badges) so they are legible against the
  reveal background. [artifacts: ui]

**Phase 3 — Encore-vote confirmation** (independent of Phases 1–2)
- F005: give the non-host encore voter a post-vote affordance — the button
  becomes a "Withdraw encore vote" toggle that retracts the vote
  (`Room.playAgainVotes`) — and add the voter-side affordance to [[ui]]'s
  End-of-game controls. [artifacts: ui]

## Complexity Tracking

| Deviation | Justification |
|---|---|
| (none) | Each item is a localized fix routed through existing state and the single `turnAdvancement` source of truth; no new abstraction or dependency, so no Principle-I deviation to justify. |

## Open Questions

- **F003 root cause.** The exact bypassed path is identified during Phase 1's
  repro, not pre-committed here — candidates include a server-side assignment
  that doesn't consult `computeNextEntry`, or a client advancing optimistically
  before the round gate. The failing test drives the diagnosis.
- **F005 retract semantics.** Confirm withdrawing an encore vote is allowed
  any time before "Play again" fires (vs. locked once a threshold is shown);
  the suggested toggle assumes it stays retractable throughout reveal.

## Production Annotation Summary

- No production shortcut is introduced by this plan. If the F003 diagnosis
  surfaces a temporary guard or narrowed fix, annotate it under [[ui]]'s
  `## Production Annotations` at implementation time per the constitution.
