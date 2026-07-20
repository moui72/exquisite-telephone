---
status: approved
branch: curated-phrase-bank
created: 2026-07-20
features: [player-prompt-rating]
surfaced-defects: []
---

# Plan — Prompt rating and the curation store

## Goal

Let the player who draws a book's opening phrase rate it, and route that
rating to a durable curation store — tallies for curated-bank phrases,
candidate entries for player-written ones — so the phrase bank can be
pruned and grown from real play instead of by hand.

## Scope

**In scope**

- A thumbs-up/down control on the `Entry.position === 1` drawing turn,
  submitted alongside the entry.
- Server-side origin resolution: bank phrase vs. player-written, decided
  from `CURATED_PHRASE_BANK`, never from a client claim.
- A durable Curation Store — one JSON file, atomic write, debounced
  flush, `CURATION_DATA_PATH` env var, empty-on-missing startup.
- A Fly volume to hold it across deploys.
- Read path for the curator: the file itself is the interface.

**Out of scope**

- Any UI that surfaces ratings back to players. Deliberate: this is
  curation telemetry, not a scoreboard (see [[ui]]).
- Rating mid-chain phrases (`position > 1`) — they are descriptions of
  drawings, not prompts.
- Heart reactions on books — `book-love-reactions` was subsumed by this
  feature, not deferred.
- Moving any game state onto the volume. Game state stays in memory.
- An admin view, an export command, or bank auto-updating. The curator
  reads the JSON and edits `phraseBank.ts` by hand; automating that is
  premature until the file has real volume in it.

## Technical Approach

The rating rides along with the existing `onSubmitEntry` payload rather
than becoming its own event. It is a property of the submission — cast
on the same screen, settled at the same moment — and a separate
`onRatePrompt` round trip would need its own idempotency story for a
double-tap. The handler list in [[infrastructure]] names `onRatePrompt`;
this plan supersedes that detail with the simpler shape and the artifact
is corrected in Phase 1 rather than left describing a handler that never
gets written (Principle IV — documentation describes only what is true).

Origin resolution is a set membership test against
`CURATED_PHRASE_BANK`, done server-side at submit time. A phrase that is
player-written but coincidentally identical to a bank entry counts as a
bank phrase — see [[datamodel]] Normalization Rules — Prompt rating.

The store is a module with a narrow interface (`recordRating`, plus
load/flush lifecycle), owning its own file I/O and debounce. It is
constructed in `index.ts` and injected, per Principle X — the entry
point wires it, never defines it. Its in-memory shape is the file's
shape, so there is no mapping layer.

Test-first throughout (Principle III). The store's atomic-write and
debounce behavior, and the origin-resolution branch, are the parts most
worth failing tests first — both have edge cases (unparseable file,
crash mid-write, duplicate candidate text) that are easy to get wrong
and invisible at runtime until the data is already lost.

## Phase Breakdown

### Phase 1 — Shared types and artifact correction
_Depends on: nothing_

- Add `PromptRating` and `CandidatePhrase` types to `shared/src/types.ts`,
  and a `PromptRatingValue = 'up' | 'down'`. [artifacts: datamodel]
- Add the rating field to the entry-submission payload type.
- Correct [[infrastructure]]'s handler list: remove `onRatePrompt`,
  since the rating rides `onSubmitEntry`. [artifacts: infrastructure]

### Phase 2 — Curation store module
_Depends on: Phase 1_

Delivers the durable store, fully tested, with no wiring.

- Create the store module in `server/src/domain/` — load-at-startup,
  in-memory mutation, debounced atomic flush (temp + fsync + rename).
- Missing or unparseable file yields an empty store and a logged
  warning, never a throw (Principle IX — structured log event).
- `recordRating(phrase, value, isBankPhrase)` implementing the routing
  and the candidate upsert-by-exact-text.

### Phase 3 — Config and wiring
_Depends on: Phase 2_

- Extend `loadConfig` with `curationDataPath` from `CURATION_DATA_PATH`,
  defaulting to a local gitignored path. [artifacts: infrastructure]
- Construct the store in `index.ts` and inject it into the socket layer.
- Flush on graceful shutdown so a clean deploy loses nothing.

### Phase 4 — Server: origin resolution and submission handling
_Depends on: Phase 3_

- Extend `onSubmitEntry` to accept an optional rating, ignore it unless
  the entry is `position === 1`, resolve origin against
  `CURATED_PHRASE_BANK`, and call the store. [artifacts: datamodel]
- A thumbs-down on a player-written phrase is accepted and discarded —
  tested explicitly, since "does nothing" is exactly the behavior a
  future refactor would silently break.

### Phase 5 — Client: the rating control
_Depends on: Phase 4_

- Add the control to the drawing view, shown only when
  `position === 1`. [artifacts: ui]
- Optional and non-blocking; selectable and changeable until submit.
- Include it in the submit payload.

### Phase 6 — Deployment
_Depends on: Phase 5_

- Add the volume mount to `fly.toml` and set `CURATION_DATA_PATH` into
  it. [artifacts: infrastructure]
- Document the one-time `fly volumes create` step, which a deploy will
  not do for you.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| Introducing durable disk storage to an app whose artifacts thrice state it has none | The requirement is real and cannot be met in memory. Scoped as narrowly as possible: curation data only, no game state, one file, no new service or dependency. Principle I asks for the simplest thing that satisfies the requirement, not for the requirement to be refused. |
| Rating rides `onSubmitEntry` instead of the `onRatePrompt` handler named in `infrastructure.md` | A separate event needs its own idempotency handling for double-taps and can arrive after the entry it describes. Riding the submission makes the rating atomic with the thing it rates. The artifact is corrected in Phase 1 rather than left aspirational. |

## Open Questions

1. **Volume size and region.** Fly volumes have a minimum size (1GB) far
   beyond what a few hundred counters need, and are pinned to one
   region. Neither is a problem at this scale, but the volume must be
   created in the same region as the machine (`iad`) or the machine will
   fail to start. Resolve at Phase 6 by reading the running machine's
   region rather than assuming.
2. **Local dev default path.** Needs to be gitignored and not collide
   with the repo's existing ignores. Resolve at Phase 3.
3. **Does the curator want the candidate list deduplicated across
   near-misses?** Currently exact-text only, so "a bear on a unicycle"
   and "a bear riding a unicycle" are separate records. Deliberate for
   now — the curator reads them anyway — but if the list gets noisy,
   normalization is the fix. Not blocking.

## Production Annotation Summary

Shortcuts to annotate during implementation (both already recorded in
the artifacts; confirm they still describe reality when the code lands):

- **Curation store is single-writer and volume-bound** ([[infrastructure]])
  — the file assumes one process; the volume pins the app to one machine.
- **Player-written content retained past the session** ([[datamodel]]) —
  `CandidatePhrase` stores player-authored text durably, outliving its
  room. Human review before anything enters the bank is the mitigation.
