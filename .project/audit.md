# Audit
_Updated: 2026-07-16_

## constitution.md

- [ ] **[Q]** The Performance Budgets quality standard ("any user-observable real-time operation ... has a stated performance budget, defined per feature when the operation is added") has never been satisfied for any of the three named operations (stroke sync, turn-passing, reconnect time), and a prior plan explicitly declined to fix it (tracked as standing drift in `DEFECTS.md`). A standard nothing has ever complied with, three features after being written, reads as decorative rather than enforced. Decide: either state concrete budgets for these three operations now, or amend the constitution to drop/soften this standard so it stops being permanent unaddressed drift.

- [ ] **[R]** Principle IX (Observability) requires structured log events for room creation, join/leave/reconnect, turn advance, and game completion, but nothing in `infrastructure.md` or `datamodel.md` describes what those events actually look like (schema, fields, sink). If this principle is being honored in code, the artifact set has no record of it to check against; if it isn't, there's no visibility into that gap from the artifacts alone.

## datamodel.md

- [ ] **[Q]** The turn-timer system (per-room `turnTimerMinutes`, per-player `timerExtensions`, a `TimeoutVote` entity with 4 vote options, a background sweep, plurality resolution) is one of the most complex parts of the data model — more machinery than the rest of the game's core loop combined. Principle I asks for the simplest solution that satisfies the requirement. Is a full democratic vote (full/half/15m/force-empty, per-player eligibility rules) the right level of complexity for a small-group party game, or would a simpler fixed rule (e.g. auto force-empty on timeout, no vote) satisfy the actual need with much less state to reason about?

- [ ] **[R]** "Play again" creates a new `Room`/`Player` set and moves only *currently-connected* sockets into it; a player who is disconnected at the moment "Play again" fires still gets a new `Player` record in the new room, but their stored `sessionToken` still resolves (via the session store) to their *old* room/player. If they reconnect after the old room is left in its post-reveal state (never marked `ended`), the rejoin path has no way to route them into the new game — they're stranded in a room that isn't ended but also isn't the one everyone else moved to, with no documented behavior for this case.

- [ ] **[R]** Kicking a stalled player does not cancel or otherwise interact with an already-open `TimeoutVote` that names them in `stalledPlayerIds` — the vote resolves normally even though `Room.nonContinuable` was already set the instant the kick happened. Other players may see and cast votes on a timeout situation involving a player who's already been removed from the game, before the room ends up frozen regardless of the vote's outcome. Not incorrect, but worth a documented decision on whether the vote should be closed out immediately on kick instead.

## infrastructure.md

- [ ] **[R]** The Turn Timer Sweep is a single server-wide `setInterval` iterating every in-progress timed room each tick; nothing describes error isolation between rooms. If processing one room's timer state throws (e.g. an unexpected/corrupt state), an uncaught exception inside a `setInterval` callback in Node stops that timer permanently — silently halting timeout resolution for *every* room, not just the one that faulted, until the process restarts. Worth a stated per-room try/catch boundary given how central this sweep is to preventing game deadlock.

- [ ] **[Q]** The Session Store's token TTL is described only as "a few minutes" — no exact value. Given it directly governs whether a phone-lock or wifi blip is tolerated versus treated as an abandonment, and Quality Standards call for stated performance budgets on user-observable timing behavior, this seems worth pinning to an exact number rather than leaving it as a qualitative description.

## ui.md

- [ ] **[Q]** The Reveal page's default pacing (2.5s cover, then auto-advance every 4s revealing up to 2 entries) is a specific set of numbers with no stated rationale, and no artifact says whether these were chosen deliberately (playtested) or are placeholders. If they're placeholders, they're easy to lose track of as "the real numbers" once nothing flags them as provisional.

## Summary
0 suggestions · 5 questions · 3 risks across 4 artifacts.
