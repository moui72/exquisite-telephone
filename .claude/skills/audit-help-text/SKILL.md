---
name: audit-help-text
description: "Audit the in-app help text — rules panel, turn hints, setting tooltips, docent copy — for accuracy against actual behavior, staleness, and gaps where a shipped feature has no player-facing explanation. Reports findings; does not fix them."
---

# /audit-help-text

Check every player-facing explanation in the app against what the code
actually does, and find shipped behavior that has no explanation at all.

**This skill reports. It does not edit.** Help text is voice-sensitive
(the salon docent register — see `.project/artifacts/ui.md` Visual
Identity), and rewriting it is a judgment call the user makes. Findings
become `/ardd-feedback` items or a `/ardd-backlog` entry, per the
handoff at the end.

## Why this exists

Help text rots in a specific way: a feature changes, its behavior is
updated everywhere the code enforces it, and the sentence describing it
to players is left behind — because nothing fails when prose goes wrong.
There is no type checker for "this tooltip is now a lie."

Two real instances from this repo, useful as calibration:

- The blind-guess turn hint ("you have never been told the original
  phrase, only what you see drawn above") rendered on **opening** turns,
  where there is no preceding entry and both claims are false. It shipped
  that way and was caught later by a task that happened to touch the
  hint.
- `ui.md` claimed tooltips existed for "every host-configurable setting",
  naming a minimum-player-override tooltip. The Lobby has four tooltips;
  there are six host-configurable `Room` fields.

Both are the same failure: prose drifted from behavior, and nothing
enforced the link.

## Do not hardcode an inventory

Derive the surfaces every run. A checklist baked into this file becomes
exactly the stale document the skill exists to catch — a new help surface
added next month would be invisible to an audit that only walks a fixed
list.

## Steps

### 1. Build the help-surface inventory

Find every place the app explains itself to a player. Search rather than
recall; the shape of these changes.

- **Rules / overview panels** — `client/src/lib/components/` (e.g.
  `RulesOverview.svelte`), plus whatever opens them
  (`SalonFooter.svelte` is the current entry point).
- **Setting tooltips** — grep for `InfoTooltip` call sites across
  `client/src/lib/views/`. Note each one's `label`.
- **Turn hints** — the docent-voice guidance in `WritingDrawing.svelte`.
  These are per-turn-kind and are the most drift-prone text in the app,
  because turn kinds have been added and split over time.
- **Status / waiting copy** — `TurnStatus.svelte` and equivalents.
- **Moderation copy** — `ModerationPanel.svelte`, plus any host-facing
  explanation of what a control does.
- **Error and empty states** — these carry docent-voice copy too and are
  easy to forget; grep the views for error/empty branches.
- **Anything else** matching a text-bearing pattern: `aria-label`,
  `title=`, `placeholder=`, and long string literals in `.svelte` files.

### 2. Check each surface for accuracy

For every claim the text makes, find the code or artifact that governs
it and confirm they agree. Read `.project/artifacts/ui.md` and
`datamodel.md` — `datamodel.md`'s Normalization Rules are where most
behavioral claims are actually settled.

Look specifically for:

- **Claims that are false in some states but not others.** This is the
  highest-yield category and the blind-guess hint is its archetype: text
  correct for the common case, wrong for an edge the author wasn't
  thinking about. For any conditional surface, enumerate the states it
  renders in and check the text against *each*.
- **Numbers, ranges, and defaults** stated in prose — turn-timer options,
  laps range, dealt-prompt counts, minimum players. Verify against the
  code, not the artifact, then check the artifact too (a mismatch there
  is a separate finding for `/ardd-defects`).
- **Named controls** that no longer exist under that name, or moved.
  (The Salon Footer refactor moved both the rules link and the
  moderation panel; prose naming their old locations would be stale.)
- **Promises about what other players can see.** These matter more than
  usual — the game's whole premise is controlled information, and text
  that misdescribes what is hidden is worse than text that is merely
  vague.

### 3. Find the gaps

Work in both directions; the two find different things.

**Feature → explanation.** Walk `.project/features/*.md` for entries at
`status: implemented` and ask whether each is explained anywhere a
player would find it. Recent features are the likeliest gaps — the
implementation lands, the help text is a separate thought.

**Control → explanation.** Enumerate every host-configurable field in
`datamodel.md` and every interactive control in the views, then check
each has an explanation. Count them; a count mismatch against the number
of tooltips is a fast signal. Judgment applies — one tooltip may
legitimately cover a cluster of related settings, and that is a finding
to *raise*, not to silently accept or reject.

**Also check the inverse:** help text describing something that no
longer exists, or was subsumed. A feature marked `subsumed` in the
register whose explanation still ships is a real defect.

### 4. Report

Group findings by severity, most severe first:

1. **Wrong** — text that makes a false claim. Say in which state it is
   false, since that is what makes it fixable.
2. **Stale** — text describing a prior design, a moved control, or a
   removed feature.
3. **Missing** — shipped behavior with no player-facing explanation.
4. **Thin** — present but unlikely to actually answer a player's
   question.

For each: the file and line, what it says now, what is actually true,
and the evidence (the code path or artifact rule that settles it). Do
not propose replacement copy unless asked — the docent voice is
deliberate and rewriting it is the user's call.

If a finding is a code-vs-artifact mismatch rather than a help-text
problem, say so and point at `/ardd-defects`; that file has a single
writer and this skill is not it.

### 5. Hand off

Nothing here writes state. Offer:

- `/ardd-feedback` for wrong/stale text and small gaps — these are bugs
  in shipped behavior.
- `/ardd-backlog` if a gap is large enough to be its own capability (a
  whole feature with no guidance anywhere).
- `/ardd-defects` for artifact-vs-code drift noticed along the way.

Let the user choose. A long list of findings is not automatically a plan.
