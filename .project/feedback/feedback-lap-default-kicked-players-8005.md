---
status: open
created: 2026-07-20
plan: null
---

# Feedback

## Bugs

- [ ] F001 `onStartGame` resolves the lap default from the full roster,
  not the active (non-kicked) player count. `handlers.ts:160` calls
  `defaultLapsPerBook(room.players.length)`; since a host can kick a
  player during `lobby`, a lobby-kick-then-start computes the default off
  the inflated roster and produces a shorter-than-intended game (e.g. a
  5-player room kicked to 4 in the lobby should default to 2 laps but
  gets 1). Surfaced by the T003/T002 defect-fix implementer as a latent,
  out-of-scope inconsistency; low confidence it matters in practice. The
  fix likely routes this call site through the same `activePlayers`
  helper introduced in `shared/src/turnAdvancement.ts` during the
  `plan-25a0` defect pass, so the lap default and the completion math
  agree on which players count. The rule itself lives in `datamodel.md`
  (Normalization Rules — Laps per book), which says the default is
  derived from "live player count" without settling whether a kicked
  lobby player is live. [artifacts: datamodel]
