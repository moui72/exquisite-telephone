---
status: approved
branch: help-text-accuracy
created: 2026-07-20
features: []
surfaced-defects: [c217e21f, f678931d]
---

# Plan — Help-text accuracy and artifact truthfulness

## Goal

Make every player-facing explanation true of the game as it actually
ships — correcting the rules panel's false claim about writing an
opening phrase, explaining what the rating control does, closing the
Lobby's tooltip gaps, and bringing the two artifacts that misdescribe
the code back in line.

## Scope

**In scope**

- F001 — the rules panel tells players they may write "anything they
  like", false whenever `promptMode === 'curated'`.
- F002 — the prompt-rating control ships with no explanation anywhere.
- F003 — three Lobby host controls have no `InfoTooltip`.
- F004 — the rules panel omits four shipped features and implies a
  single lap.
- Defect `c217e21f` — `infrastructure.md`'s handler list omits three
  handlers `server.ts` wires.
- Defect `f678931d` — `ui.md` claims the `(?)` pattern covers "every
  host-configurable setting" against four tooltips and seven controls.

**Out of scope**

- `feedback-main-338d.md` (the post-kick frozen-room signal). Still
  `open`, deliberately untouched — it is a state-broadcast bug, shares
  no files with this work, and folding it in would mix two unrelated
  debugging contexts.
- All three backlogged features (`fly-config-lockstep`,
  `release-promotion-workflow`, `curation-data-aggregation-pipe`).
  Deploy and curation infrastructure; a different concern.
- Rewriting the docent voice generally, or any visual redesign. This
  plan changes what the text *claims*, not how the salon sounds.
- Surfacing ratings back to players. `ui.md` deliberately forbids it;
  F002 is solved by explaining the control, never by displaying results.

## Technical Approach

**Every change here is prose, and prose has no type checker.** That is
the whole reason these defects existed: the code enforcing curated mode
was updated everywhere it mattered, and the sentence describing it was
not. So the tests worth writing are the ones that bind text to the state
it describes — a test asserting the rules panel says nothing
mode-specific, or that a tooltip exists for every rendered host control,
survives the next feature in a way a hand-checked string does not.

**The artifact fixes are not symmetric.** `c217e21f` is a pure omission:
add three handler names, no design question, no code change. `f678931d`
is different — `ui.md`'s claim becomes true or false depending on what
F003 decides, so the artifact cannot be corrected until the tooltip
question is settled. That ordering is why the two defects sit in
different phases rather than being batched as "the doc fixes".

**F001 before F004, though both touch the same file.** F001 removes a
false statement; F004 decides how much the panel should cover. The first
is a correction with an obviously right answer, the second is a scope
judgment that may stall on its open question. Sequencing them separately
means a decision about completeness cannot hold up the removal of a lie.

**F002 is the highest-value fix despite being the newest code.** A
missing tooltip leaves a host guessing at a setting. An unexplained
thumbs control on a phrase *another player wrote* invites the reading
that you are rating that person — the exact social dynamic `ui.md`
designed out by keeping ratings anonymous and unsurfaced. The omission
does active harm; the tooltip gaps are passive.

Test-first per Principle III where a behavioral assertion is possible.
Several tasks here are pure copy or artifact edits, which that principle
exempts.

## Phase Breakdown

### Phase 1 — Handler-list correction
_Depends on: nothing_

Fully independent of every other phase; no code change, no design
question.

- Add `onSetPromptMode`, `onSetCuratedPromptCount`, and
  `onSetAllowPromptWriteIn` to [[infrastructure]]'s Realtime Sync
  handler list. The list reads as exhaustive, so an agent consulting it
  concludes these do not exist. (defect `c217e21f`)
  [artifacts: infrastructure]

### Phase 2 — Remove the false opening-phrase claim
_Depends on: nothing_

The highest-severity finding and the smallest change.

- `RulesOverview.svelte` currently says a guest may write "anything they
  like". Correct it so it holds in **both** prompt modes. (F001)
  [artifacts: ui]
- Add a test binding the panel's copy to the claim, so a future mode
  cannot silently falsify it again.

### Phase 3 — Explain the rating control
_Depends on: nothing_

- Give the thumbs control an explanation of what a rating is *for*:
  that it tunes the phrase deck, is anonymous, and is never shown to
  anyone — including the player whose phrase it was. (F002)
  [artifacts: ui]
- Resolve Open Question 3 first: inline near the control, in the rules
  panel, or both.

### Phase 4 — Lobby tooltip coverage, and the artifact claim it settles
_Depends on: Phase 3_

Grouped deliberately: `ui.md`'s wording depends on what the code ends up
covering, so deciding and documenting belong in one phase rather than
being split across a code phase and a doc phase that could disagree.

- Resolve Open Question 2, then close the gaps for the curated prompt
  count selector, the allow-write-in toggle, and the small-game
  acknowledgement. (F003) [artifacts: ui]
- Reconcile [[ui]]'s "every host-configurable setting" sentence with the
  result — either it becomes true, or it is narrowed to what is actually
  covered. Its current form is self-contradictory regardless: it asserts
  "every" and then enumerates four. (defect `f678931d`)
  [artifacts: ui]
- Add a test asserting every rendered host control has an associated
  info affordance, so the count cannot drift again.

### Phase 5 — Rules panel completeness
_Depends on: Phase 2, Phase 4_

Last because it is the only phase gated on a scope judgment rather than
a factual correction.

- Resolve Open Question 1, then extend the panel to cover what it
  omits: turn timers, laps per book, curated mode, and rating. (F004)
  [artifacts: ui]
- Correct the implication that a book passes around the circle exactly
  once — `Room.lapsPerBook` allows one to three rotations. (F004)

## Complexity Tracking

| Deviation | Justification |
|---|---|
| Tests asserting the content of prose | Ordinarily brittle and not worth writing. Here the failure being prevented is precisely a silent prose/behavior divergence that shipped twice already. The assertions are deliberately about *structure* (a tooltip exists per control; the panel makes no mode-specific claim) rather than exact wording, so copy edits do not break them. |

## Open Questions

1. **What should the rules panel cover?** It currently explains only the
   base write/draw/reveal loop. A panel documenting every setting stops
   being an overview and duplicates the tooltips; a panel that ignores
   four shipped features misleads by omission. Resolve in Phase 5 —
   likely by covering what changes the *shape* of a game (laps, curated
   mode) and leaving per-setting detail to tooltips.
2. **Extend the curated tooltip, or add separate ones?** One tooltip
   covering a cluster of related settings is a legitimate design. The
   prompt count and write-in toggle are both curated sub-settings and
   may belong in the existing tooltip; the small-game acknowledgement is
   unrelated to curated mode and is a separate call. Resolve in Phase 4.
3. **Where does the rating explanation live?** Inline near the control
   is discoverable exactly when it is needed but adds turn-screen
   clutter; the rules panel is calmer but is not open at the moment of
   confusion. Resolve in Phase 3.

## Production Annotation Summary

No production shortcuts are introduced by this plan. The existing
annotations in [[ui]] and [[datamodel]] are unaffected — nothing here
changes what is stored, broadcast, or retained.
