---
status: approved
branch: short-turn-timer-options
created: 2026-07-27
features: [short-turn-timer-options]
surfaced-defects: []
---

# Plan — Short turn-timer options + Lobby self-identity & self-rename

## Goal

Add short (30s/60s/90s/2m) turn-timer options and let a non-host see which
Lobby roster entry is theirs and rename themselves by clicking it.

## Scope

Three threads, all rooted in the Lobby (`client/src/lib/views/Lobby.svelte`)
— bundled because they edit the same file:

**In:**
- **`short-turn-timer-options` (feature).** Add 30s / 60s / 90s / 2m to the
  host turn-timer selector, stored as fractional minutes
  (`0.5 | 1 | 1.5 | 2`) per the confirmed design — the `turnTimerMinutes *
  60000` deadline math is unchanged (see [[datamodel]] Room, revised this
  run). Touches `shared/src/types.ts` (the `turnTimerMinutes` union), the
  Lobby `TURN_TIMER_OPTIONS` list + label map + `handleTurnTimerChange`
  cast.
- **F001 self-identity** (`feedback-lobby-self-identity-and-rename-ff4b.md`).
  Mark the current player's entry in the Lobby roster ("(you)"), visible to
  every player including non-hosts — mirroring the existing "(host)" tag.
- **F002 self-rename** (same feedback file). A player may change their own
  display name while `Room.status === 'lobby'` by clicking their own roster
  entry; the new name broadcasts to the room. Needs a new
  `setDisplayName` session emitter + `onSetDisplayName` server handler
  (mirroring the existing lobby setters like `onSetTurnTimer`), and makes
  `Player.name` mutable in the lobby.

**Out:**
- No rename once the game has left the lobby, and no renaming *other*
  players — a player edits only their own name, lobby-only (consistent with
  every other lobby-mutable Room setting).
- No change to the timeout-vote / grace / deadline mechanics for the timer —
  short durations only make the existing deadline fire sooner.
- No display-name uniqueness constraint — `Player.id`, not name, is the key
  (duplicate names already possible at join today).

## Technical Approach

- **Timer.** Extend the `turnTimerMinutes` literal union with the four
  fractional-minute values and add their labeled options to the Lobby
  selector; the server/shared deadline computation already multiplies
  minutes by 60000, so nothing downstream changes (see [[datamodel]] Room).
- **Self-identity (F001).** The roster already renders `activePlayers(room)`
  with a per-entry "(host)" tag keyed on `hostPlayerId`; add a parallel
  "(you)" tag keyed on `state.player.id`.
- **Self-rename (F002).** Follow the established lobby-setter pattern: a
  `session.setDisplayName(name)` emitter → an `onSetDisplayName` socket
  handler that validates the caller is renaming their own seat, the room is
  in `lobby`, and the (trimmed) name is non-empty, then updates
  `Player.name` and broadcasts the room. The Lobby roster entry for the
  current player becomes an inline edit affordance. See [[infrastructure]]
  (handler list) and [[datamodel]] (Player.name lobby-mutability rule),
  both revised in Phase 1.

## Phase Breakdown

_Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file._

**Phase 1 — Artifact revisions (docs) for the feedback items.** (The
feature's datamodel/ui edits were already applied this planning run.)
- Revise `ui.md` Lobby View: the roster marks the current player ("(you)"),
  and a player may click their own roster entry to rename themselves while
  in the lobby (F001, F002). `[artifacts: ui]`
- Revise `datamodel.md`: `Player.name` is mutable while
  `Room.status === 'lobby'` via a self-rename action — add the normalization
  rule (own seat only, lobby only, trimmed non-empty, no uniqueness
  requirement) (F002). `[artifacts: datamodel]`
- Revise `infrastructure.md`: add the `onSetDisplayName` socket handler to
  the handler list (F002). `[artifacts: infrastructure]`

**Phase 2 — Short turn-timer options (code).** Depends on Phase 1 only for
the already-applied datamodel/ui feature edits.
- Extend the `turnTimerMinutes` union in `shared/src/types.ts` to
  `0.5 | 1 | 1.5 | 2 | 15 | 30 | 60 | 240 | 720 | null`, add the four short
  options to the Lobby `TURN_TIMER_OPTIONS` + label map and widen the
  `handleTurnTimerChange` cast; test-first.

**Phase 3 — F001 self-identity marker (code).** Depends on Phase 1.
- Mark the current player's Lobby roster entry with a "(you)" tag (visible
  to non-hosts too), mirroring the "(host)" tag; test-first.

**Phase 4 — F002 self-rename (code).** Depends on Phase 1; independent of
Phases 2–3 in behavior but shares `Lobby.svelte`, so sequence after them.
- Add a `setDisplayName` session emitter and an `onSetDisplayName` server
  handler (lobby-only, own-seat-only, trimmed-non-empty validation, then
  broadcast), and an inline click-to-edit affordance on the current
  player's roster entry; test-first across shared/server/client as needed.

## Complexity Tracking

No complexity deviations to justify. The timer change reuses the existing
deadline math; the rename follows the established lobby-setter emitter/
handler pattern rather than introducing a new mechanism (constitution
Principle I).

## Open Questions

- **Name validation specifics (F002).** Trim whitespace and reject an empty
  result is assumed; a max length (the join form uses `autocomplete="name"`
  with no explicit cap today) and whether to collapse internal whitespace
  are implementation calls — settle in Phase 4, keeping parity with whatever
  the join-time path already enforces.
- **Very short timers vs. the timeout-vote/grace flow.** A 30s turn is far
  shorter than any existing option; the mechanism is unchanged, but Phase 2
  should sanity-check that the timeout-vote UI and the 30s cover-grace
  countdown don't collide awkwardly at rapid-fire pace (verification, not a
  redesign).
- **Rename affordance shape (F001/F002).** Whether the current player's
  entry is an always-visible text input, a click-to-reveal input, or an
  edit icon — a UX detail for Phase 4; the "(you)" marker (Phase 3) lands
  regardless.

## Production Annotation Summary

No new production shortcuts. The timer change touches no
secure-context/shortcut surface; the rename handler is ordinary
authoritative server state with the same trust model as the other lobby
setters.
</content>
