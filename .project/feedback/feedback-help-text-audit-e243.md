---
status: open
created: 2026-07-20
plan: null
---

# Feedback

_Findings from the first `/audit-help-text` run (2026-07-20). All are
player-facing help text problems in shipped behavior._

## Bugs

- [ ] F001 `client/src/lib/components/RulesOverview.svelte:30` — the
  app's primary self-explanation — says "A guest is handed a blank page
  and asked to write a phrase — **anything they like**." This is FALSE
  whenever `Room.promptMode === 'curated'`: the player is dealt a fixed
  hand and picks one. "Anything they like" holds only in free-form
  mode, or in curated mode when `allowPromptWriteIn` is true. The
  sentence predates curated mode and nothing flagged it when that mode
  shipped. Evidence: `datamodel.md` Normalization Rules — Curated
  prompts; `WritingDrawing.svelte:240` renders a chooser, not a blank
  input. [artifacts: ui]

- [ ] F002 The `player-prompt-rating` thumbs control
  (`WritingDrawing.svelte:340-372`) ships with only the legend "Was this
  fun to draw?" and **no explanation anywhere** — not in the rules
  panel, not in the footer, nowhere. The design deliberately makes
  ratings anonymous curation telemetry never surfaced to any player
  (`ui.md`), but a player sees thumbs appear on a phrase **another
  player wrote** and has every reason to read it as rating that person.
  The omission creates exactly the social dynamic `ui.md` designed out.
  Ranked above F003 despite being the newest feature: a tooltip gap
  leaves a host guessing, whereas this one actively invites a wrong and
  socially costly reading. [artifacts: ui]

- [ ] F003 Three host controls in the Lobby have no `InfoTooltip` while
  four others do: the curated prompt count selector
  (`Lobby.svelte:307`), the allow-write-in checkbox (`:325`), and the
  small-game acknowledgement checkbox (`:339`). The existing
  curated-mode tooltip reads "Curated deals every guest a private hand
  of phrases to choose from, and no two players are ever offered the
  same phrase" — it explains the mode but says nothing about choosing a
  hand size or enabling write-in.

  **Settle rather than assume:** one tooltip covering a cluster of
  related settings is a legitimate design. Decide whether that tooltip
  is extended to cover the two curated sub-settings, or whether each
  gets its own. The small-game acknowledgement is a separate question —
  it is the only one of the three that is not part of curated mode.
  [artifacts: ui]

## UX

- [ ] F004 `RulesOverview` describes only the base write/draw/reveal
  loop and omits four shipped features: turn timers, laps per book,
  curated prompt mode, and prompt rating. It also implies a book passes
  around the circle exactly once — "the book passes around the circle" —
  while `Room.lapsPerBook` allows 1 to 3 full rotations. Scope is a
  judgment call: a rules panel that documents every setting stops being
  an overview, so decide what belongs there versus in a tooltip.
  [artifacts: ui]
