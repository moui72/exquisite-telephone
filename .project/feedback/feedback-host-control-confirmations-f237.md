---
status: open
created: 2026-07-23
---

# Feedback

## UX

- [ ] F001 Destructive host controls in the moderation panel fire
  immediately with no confirmation, so a mis-tap irreversibly ends or
  resets a game in progress. In `ModerationPanel.svelte` (shown during
  lobby/writing), **End game** (`handleEndGame` → `session.endGame()`,
  `ModerationPanel.svelte:30-32`), **Restart / "Restage the Salon"**
  (`handleRestartGame` → `session.restartGame()`, `:34-36`, button `:104`),
  and **Kick** (`handleKick`, button `:71-78`) all wire directly to the
  button with no intermediate confirm. By contrast the Reveal page already
  guards its host controls: **Close the Exhibition** (end) and **Stage an
  Encore** (play again) route through `requestHostAction()` and show a
  warning modal when books are still unread/open, derived from
  `room.bookReads` / `room.currentlyReading` (`Reveal.svelte:158-171`,
  modal `:336-369`), with a force-through override. The gap: the same
  accidental-destructive-action protection the Reveal flow has is absent
  from the moderation panel's End/Restart/Kick, where an errant tap
  mid-writing wipes progress with no undo. This isn't about read-state
  there (nothing has been read pre-reveal) — it's a plain "are you sure?"
  guard that's currently missing. [artifacts: ui]
