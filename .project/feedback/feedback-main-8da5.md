---
status: planned
created: 2026-07-18
plan: plan-7c63-2026-07-18-f55f.md
---

# Feedback

## Bugs

- [x] F001 `ModerationPanel.svelte` renders the "this game can't
  continue" notice, and `WritingDrawing.svelte` also renders the same
  notice in the page body — when the host has the panel expanded
  during a non-continuable game, the notice shows twice. Introduced by
  the `salon-gallery-ui-redesign` implementation (task T009), which
  added the notice to `ModerationPanel` to match `ui.md`'s literal
  description without noticing `WritingDrawing.svelte` already
  rendered it. [artifacts: ui]

## UX

- [x] F002 Error and Empty terminal states in `Lobby.svelte` still show
  raw server error codes verbatim (`room-not-found`, `not-host`, etc.)
  instead of docent-voice copy. `ui.md`'s Docent Voice section names
  Error as needing the voice treatment, but no code path translates
  these codes to human-readable copy — a pre-existing gap the
  `salon-gallery-ui-redesign` implementation didn't fix, since no task
  authorized building an error-code-to-copy mapping. [artifacts: ui]
