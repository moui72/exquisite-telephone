---
status: open
created: 2026-07-19
plan: null
---

# Feedback

## Bugs
- [ ] F001 The host gets no signal that a kick has frozen the room.
  After the Salon Footer refactor moved the Moderation Panel from an
  always-visible inline panel to a modal opened by the footer's gavel,
  the host-specific suppression of the "this game can't continue"
  page-body notice (`client/src/lib/views/WritingDrawing.svelte:120` —
  the notice renders only when `state.player?.id !==
  state.room.hostPlayerId`) no longer has anything backing it up. That
  suppression was introduced to avoid showing the same notice twice in
  one client while the panel was inline and always on screen; with the
  panel now behind a gavel button, a host who kicks a player mid-game
  sees nothing at all until they happen to reopen the modal. Non-host
  players still see the notice correctly, so the room looks frozen to
  everyone except the one person who can unfreeze it. `ui.md`'s
  Moderation Panel section now states the footer gavel should carry a
  frozen-room indication reachable without opening the modal.
  [artifacts: ui]
