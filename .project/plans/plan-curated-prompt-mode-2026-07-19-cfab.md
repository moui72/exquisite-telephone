---
status: approved
branch: curated-prompt-mode
created: 2026-07-19
features: [curated-prompt-mode]
surfaced-defects: []
---

# Plan — Curated Prompt Mode

## Goal

Give the host a second prompt-generation mode in which each player picks
their book's opening phrase from a privately dealt hand of curated
phrases — dealt so that no phrase ever reaches two players in the same
game — with the hand size and an optional write-your-own escape hatch
both host-configurable.

## Scope

**Included**

- A fixed curated phrase bank as a static constant in `shared/`.
- Four new `Room` fields — `promptMode`, `curatedPromptCount`,
  `allowPromptWriteIn`, `dealtPrompts` — with host controls in the Lobby.
- A shuffle-then-partition deal at `onStartGame`, re-dealt on *Restart
  game*, with the count clamped to what the bank can cover.
- Server-side validation of opening submissions against the submitting
  player's own dealt hand (or free text, when write-in is allowed).
- An opening-turn (`position === 0`) branch in the Writing/Drawing view
  presenting the dealt hand as a choice.
- Correcting the blind-guess hint so it no longer renders on the opening
  turn, where it describes a situation the player is not in.

**Not included**

- Any change to text turns at `position > 0` — they stay free-form
  unconditionally, in both modes.
- Per-client scoping of `dealtPrompts` in the broadcast (recorded as a
  production annotation, not built).
- Host-authored or per-room custom phrase banks; the bank is one fixed
  set shared by every game.
- Carry-over of curated settings through *Play again*, which mints a new
  room whose settings start at their defaults like every other setting.

## Technical Approach

The feature plugs into three existing seams rather than introducing new
mechanism:

- **Host settings** follow the `onSetLapsPerBook` /`onSetMonochrome`
  handler shape in `server/src/socket/handlers.ts` — host-only, guarded
  on `status === 'lobby'`. The three new setters are decomposed per
  concern (Principle VIII) rather than folded into one
  multi-field handler.
- **The deal** hangs off `createBooksForRoom`'s two existing call sites
  (`onStartGame` at handlers.ts:155 and the restart path at
  handlers.ts:435), so restart re-deals for free rather than needing its
  own path.
- **The opening turn** extends the `myTurn.position > 0` distinction the
  Writing/Drawing view already draws at
  `client/src/lib/views/WritingDrawing.svelte:38` to derive
  `previousEntry`. Today that seam gates the *previous entry display*
  but not the *hint*, which is why the blind-guess copy currently
  renders on the opening turn; this plan brings the hint under the same
  branch it should always have been under.

Deal logic lives in `shared/` as a pure function over `(bank, playerIds,
requestedCount)` returning `Record<playerId, string[]>` — no room
mutation, no randomness sourced inside it beyond an injectable shuffle,
so the distinctness and clamping guarantees are directly unit-testable
without standing up a room. Per [[datamodel]] Normalization Rules —
Curated prompts, distinctness comes from partitioning a single shuffle,
which makes the guarantee structural rather than enforced by a
retry-until-distinct loop.

## Phase Breakdown

### Phase 1 — Shared types, phrase bank, and deal logic
_Depends on: nothing_

Delivers the pure, fully-tested core with no server or client wiring.

- Extend the `Room` type in `shared/src/types.ts` with the four new
  fields, per [[datamodel]].
- Create the curated phrase bank constant in `shared/` — sized so a
  realistic room never hits the clamp.
- Create the deal function (shuffle-then-partition, injectable shuffle,
  count clamped to `floor(bankSize / playerCount)` floor 1).

### Phase 2 — Server: host settings, deal, and submission validation
_Depends on: Phase 1_

Delivers a server that can be driven entirely from tests: settings
persist, the deal happens at the right moments, invalid opening
submissions are rejected.

- Three host-only setting handlers mirroring `onSetLapsPerBook`.
- Deal at `onStartGame`; re-deal on the restart path.
- Validate opening (`position === 0`) submissions against the
  submitting player's own hand, honoring `allowPromptWriteIn` — the
  server never trusts a client claim about the active mode.

### Phase 3 — Client: Lobby host controls
_Depends on: Phase 2_

Delivers the host's ability to configure the mode, per [[ui]] Lobby View.

- Prompt-mode control plus its dependent count selector and write-in
  toggle, hidden entirely in free-form mode.
- An `InfoTooltip` info affordance matching the existing three host
  settings.

### Phase 4 — Client: opening-turn selection and hint correction
_Depends on: Phase 3_

Delivers the player-facing half, per [[ui]] Writing / Drawing View.

- Opening-turn branch presenting the dealt hand as a selectable choice,
  plus the write-in option when allowed.
- Split the turn hint three ways (draw / later-text / opening-text),
  removing the blind-guess copy from the opening turn.

### Phase 5 — Full-suite verification
_Depends on: Phase 4_

Lint, typecheck, and full test suite green across all three packages.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| A new pure module in `shared/` for the deal, rather than inlining it in `onStartGame` | It has two call sites (start and restart) from the outset, so this is genuine duplication at introduction, not a speculative abstraction (Principle I). Isolating it also makes the distinctness and clamping guarantees unit-testable without a room. |
| Four new `Room` fields rather than one nested settings object | Matches the existing flat-field convention for `monochromeOnly` / `turnTimerMinutes` / `lapsPerBook`; nesting only these four would make the room shape inconsistent with itself. |

## Open Questions

- None. The two decisions that could have been left open were resolved
  during artifact design: bank exhaustion clamps the count at deal time
  (rather than erroring or dealing duplicates), and the broadcast leak of
  other players' hands is accepted for now and recorded as a production
  annotation rather than fixed with per-client scoping.

## Production Annotation Summary

- **Unscoped dealt prompts** — `Room.dealtPrompts` ships in the
  room-wide broadcast, so every client can read every other player's
  hand. Inert for gameplay but contrary to the "pass the folded paper"
  ethos. Already recorded under [[datamodel]] Production Annotations;
  no new annotation site is introduced by this plan.
