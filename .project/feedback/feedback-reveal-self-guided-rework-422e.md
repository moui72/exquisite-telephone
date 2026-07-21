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

  Note on state: the paging *position* and kept-place can stay
  per-viewer and client-local (each person explores independently). But
  the read/viewed and being-read state is **not** client-local — F002
  below requires it to be visible to *other* participants, so it must be
  shared through the server. This redesign therefore does introduce new
  synced/persisted per-player-per-book read state (contrast the original
  "UI-only" read of this — corrected by F002). This is a large,
  decision-reversing redesign; it is worth an `/ardd-research` pass before
  `/ardd-plan` designs the artifact changes. [artifacts: ui, datamodel]

- [ ] F002 **Read / being-read state is shared and visible to all
  participants.** Building on F001's per-book viewed state, each
  participant's read state is broadcast, not private:
  - A **"read by \<player\>"** badge appears on a book's card once that
    player has opened *and closed* its modal (a completed read).
  - A **"being read by \<player\>"** badge shows while that book's modal
    is currently open for a given player (live, real-time).

  This reverses F001's initial "UI-only, no new `Room` state" note: it
  needs shared per-player-per-book read tracking and a live
  currently-open signal. Implications the plan/research should design
  (shapes not prescribed here): new `Room`/`Player` state for
  read-by-whom and currently-reading-what ([[datamodel]]), and real-time
  modal open/close sync — new Socket.IO events broadcast to the room
  ([[infrastructure]], whose handler list would gain entries), plus the
  badges themselves ([[ui]]). [artifacts: ui, datamodel, infrastructure]

- [ ] F003 **Warn the host before closing the lobby with unread books.**
  When the host tries to start a new game or otherwise close/leave the
  lobby and not every book has been read (per F002's completed-read
  state), warn them — naming who hasn't read what — and, if every book
  has been read but one is still open (being read), tell them that
  instead. The host can **force** the new-game/end-lobby anyway; this is
  a warning, not a hard gate (consistent with the existing
  force-anyway moderation pattern, e.g. the small-game override).

  Open question for the plan/research — the trigger phrasing is
  ambiguous and should be pinned before design: does "read" mean *every
  book read by at least one player* (a book nobody opened blocks), or
  *every player has read every book* (per-player completeness)? The
  warning copy ("who hasn't read what") reads per-player, but the
  trigger ("not every book has been read by any player") reads
  per-book-has-a-reader. These imply different state and different
  messages; do not silently pick one. [artifacts: ui, datamodel]
