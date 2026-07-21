---
status: open
created: 2026-07-21
plan: null
---

# Feedback

## Reconsidered

- [ ] F001 **Replace the timed, auto-advancing Reveal with a fully
  self-guided card-and-modal experience.** The current Reveal
  auto-advances on a synchronized clock (`Room.revealStartedAt`-derived
  pacing, cover art, one book at a time) — the timers are confusing and
  should go. Reversing this touches the current Reveal View design in
  [[ui]] and the reveal-pacing mechanism in [[datamodel]]
  (`Room.revealStartedAt` and the "Reveal pacing (synchronized clock)"
  normalization rule likely become dead once timers are removed — the
  plan/research should confirm whether the field can be dropped or is
  still wanted for anything else). The new design:

  - **Card grid.** Every book is a card, all visible to everyone at once
    (no host-driven single-book advance).
  - **Modal viewer.** Clicking a card opens that book in a modal.
  - **Manual paging.** Page-turn controls, both clickable and keyboard,
    with page-turn animations. No auto-advance.
  - **Page structure.** The initial prompt shows in isolation (page 1);
    every subsequent page shows the *previous* prompt-or-drawing above the
    newly revealed item (the "what did they see" pairing), not the whole
    chain at once.
  - **Save on last page.** The final page offers the save-to-PNG button
    (relocating today's PNG export into the per-book flow).
  - **Place is kept per book.** Closing a modal preserves your current
    page in that book; reopening resumes where you left off.
  - **Per-book reset.** A "back to start" control returns a book to its
    first-page, unopened state.
  - **Reveal all.** A "reveal all" option shows the full PNG strip for a
    book (today's all-at-once view, on demand rather than after a timer).
  - **Viewed/dirty card state.** Once a book has state (has been opened /
    is dirty), its card reflects that — shown as viewed, rendered *less*
    prominently than not-yet-viewed books, so a viewer can tell at a
    glance which books they still have to get to.

  Note: the paging position, kept-place, and viewed/dirty state are all
  *per-viewer, client-local* navigation state — each person explores
  independently — so this is expected to be UI-only with no new persisted
  `Room` state (contrast the removed shared clock). The plan should verify
  that assumption. This is a large, decision-reversing redesign; it may be
  worth an `/ardd-research` pass before `/ardd-plan` designs the artifact
  changes. [artifacts: ui, datamodel]
