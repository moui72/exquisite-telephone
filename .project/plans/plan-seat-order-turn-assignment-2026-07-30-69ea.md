---
status: approved
branch: seat-order-turn-assignment
created: 2026-07-30
features: []
surfaced-defects: []
---

# Plan — Seat-order integrity in turn assignment

## Goal

Reproduce and fix the wrong-book/wrong-prompt turn assignment two players
reported (a book handed to the wrong seat, and a first drawing turn showing a
prompt from a different book), pinning down whether the fault is server-side
seat-order corruption or client-side derivation/staleness before changing any
rotation code.

## Scope

**In scope**

- Diagnosing the observed symptoms in `feedback-turn-ordering-fixed-rotation-f1a4`
  (books not passing in stable seat order) and
  `feedback-wrong-book-prompt-first-drawing-turn-88f2` (first drawing turn shows a
  prompt from a different book) — treated as one investigation because both trace
  to the same round-robin assignment computed over `room.players` order.
- A reproduction test (or tests) that fails on the current code and captures the
  wrong assignment, exercising the concrete suspects: a multi-player game with a
  disconnect/`onRejoin` cycle mid-game, and the client's reactive
  `myTurn`/`previousEntry` derivation in `WritingDrawing.svelte`.
- The minimal fix at whichever layer the reproduction implicates, plus a
  regression guard so the fixed rotation stays fixed.
- Correcting the two feedback files' cited hypotheses in place only if the
  investigation shows the named suspect (`onRejoin` re-appending) is not the
  cause — factual citation fix per the reviewer-guide exemption.

**Out of scope**

- Changing the round-robin *formula*. `datamodel.md` Normalization Rules —
  Author rotation (`authorIndex = (originIndex + position) % activeCount`) is the
  intended design and is not being revised; the fix preserves seat order or
  corrects a derivation, it does not alter the rotation rule.
- Reworking reconnect/session-token semantics beyond what the specific defect
  requires.
- The other open Reveal / drawing / flaky-test feedback (separate plans).

## Technical Approach

The rotation is a pure function of `room.players` order: `computeNextEntry`
(`shared/src/turnAdvancement.ts`) does `originIndex =
active.findIndex(p => p.id === book.originAuthorId)` then
`author = active[(originIndex + position) % activeCount]` over
`activePlayers(room)` (kicked filtered, roster order preserved). The **server**
assigns turns with this, and the **client** independently recomputes the same
function over its synced `state.room` to display `myTurn` /
`myBook.entries[position-1]` (`WritingDrawing.svelte:42–48`). So a wrong book can
arise from exactly two places: (a) `room.players` seat order drifting on the
server between turns, or (b) the client deriving against a stale/partial
`state.room`.

A first read of the server paths shows seat order is *not* obviously disturbed:
`joinRoom` (`server/src/domain/roomStore.ts`) refuses joins once
`room.status !== 'lobby'` (no mid-game append), `onDisconnect` marks
`connected = false` and keeps the seat, and `onRejoin`
(`server/src/socket/handlers.ts`) resolves the player by id and sets
`connected = true` in place — it does **not** re-append. That contradicts both
feedback files' stated prime suspect (`onRejoin` re-appending), so the plan must
verify empirically rather than fix the hypothesized cause. This is a
diagnosis-first plan: the reproduction test is the deliverable that decides which
layer to fix, and the constitution's Test-First principle is satisfied by writing
that failing test before any production change.

Because the exact repro isn't yet known, Phase 1 explicitly allows for the
outcome that a faithful multi-player + reconnect scenario does **not** reproduce
at the server layer — in which case the investigation pivots to the client
derivation (reactive `myTurn` recompute against a room update that lands
mid-turn, or a `previousEntry` read against the wrong `myBook`) and the failing
test is authored there instead. Either way Phase 2 fixes the layer Phase 1
implicates; the plan does not pre-commit to a server fix.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in the
linked tasks file.

### Phase 1 — Reproduce and localize (produces a failing test)

- Construct a deterministic multi-player scenario (≥3 players) that plays through
  the opening text round into the first drawing round, asserting each player's
  assigned `bookId`/`position` matches the fixed seat-to-seat rotation. Run it
  against `shared/src/turnAdvancement.ts` directly and against the real-socket
  server harness (`server/src/socket/*.test.ts` style) to confirm the server
  assigns correctly with a stable roster. [artifacts: datamodel]
  (feedback f1a4, feedback 88f2)
- Extend that scenario with a disconnect + `onRejoin` cycle for one player mid-game
  and re-assert the rotation, checking whether any observable seat-order drift or
  wrong `bookId`/`position` appears. [artifacts: datamodel]
  (feedback f1a4, feedback 88f2)
- If the server layer holds, author a `WritingDrawing.svelte` component/derivation
  test that reproduces the wrong displayed prompt via the reactive
  `myTurn`/`myBook`/`previousEntry` path (e.g. against a room update applied
  mid-turn or a stale `state.room`), pinning the fault to the client.
  [artifacts: ui] (feedback 88f2)
- Land at least one test that is **red** on current code and precisely names the
  faulty layer; this is the gate for Phase 2. Depends on: nothing.

### Phase 2 — Fix the implicated layer

- Apply the minimal change the Phase-1 failing test demands: preserve/repair seat
  order on the server path it implicates, or correct the client derivation/staleness
  in `WritingDrawing.svelte` so `myTurn`/`previousEntry` always resolve against the
  authoritative current room. Make the Phase-1 test go green without touching the
  rotation formula. [artifacts: datamodel, ui] (feedback f1a4, feedback 88f2)
  Depends on: Phase 1.

### Phase 3 — Regression guard, verify, reconcile feedback

- Keep the Phase-1 reproduction as a permanent regression test; add a focused
  assertion for the specific wrong-assignment signature so it can't silently
  return. Depends on: Phase 2.
- Verify with a concrete multi-player + reconnect run (manual or scripted) that the
  reported symptom is gone. Depends on: Phase 2.
- If Phase 1 disproved the `onRejoin`-re-append hypothesis, correct that citation in
  both feedback files in place (reviewer-guide factual-correction exemption only —
  no decision/content change). [artifacts: datamodel, ui] Depends on: Phase 1.

## Open Questions

- Is the fault server-side (seat-order drift) or client-side (reactive
  `myTurn`/`previousEntry` derivation against a stale/mid-update `state.room`)?
  Phase 1 decides this; the plan deliberately does not pre-commit.
- Does the reported repro require a reconnect at all, or can it surface from a
  room update landing mid-turn on the client without any disconnect? Phase 1's
  client-path test should settle whether reconnect is necessary or incidental.
- If neither the server nor the client path reproduces the symptom under faithful
  conditions, is this a "cannot reproduce" outcome to record back as feedback
  rather than a code change? (Fallback only — pursue reproduction first.)
