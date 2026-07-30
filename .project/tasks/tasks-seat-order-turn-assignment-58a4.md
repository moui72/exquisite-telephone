---
plan: plan-seat-order-turn-assignment-2026-07-30-69ea.md
generated: 2026-07-30
status: in-progress
---

# Tasks

## Phase 1: Reproduce and localize

- [x] T001 [artifacts: datamodel] Add a deterministic pure-function reproduction test against `shared/src/turnAdvancement.ts`: build a Room with ≥3 seated players and books whose `originAuthorId` matches each seat, then drive `computeNextEntries`/`computeNextEntry` through the opening text round (position 0) into the first drawing round (position 1). Assert every player's assigned `bookId`/`position` matches the fixed seat-to-seat rotation `authorIndex = (originIndex + position) % activeCount` — in particular that each player's first drawing turn (position 1) is the *previous* seat's book. This establishes the correct-rotation baseline; expect it to PASS on current code (the formula is sound). (feedback f1a4, feedback 88f2)
- [x] T002 [artifacts: datamodel] Add a real-socket server integration test (in the `server/src/socket/*.test.ts` harness style) that plays a ≥3-player game through the opening text round and into the first drawing round, then drops one player's connection and reconnects them via `onRejoin` (token-based) mid-game. After the reconnect, assert `room.players` seat order is unchanged and each player's next assigned turn still matches the fixed rotation. This directly tests the feedback's stated prime suspect (`onRejoin` re-appending); if the server preserves seat order as the code read suggests, this test PASSES and clears the server layer.
- [x] T003 [artifacts: ui] Add a `WritingDrawing.svelte` derivation/component test exercising the reactive `myTurn` / `myBook` / `previousEntry` chain (`WritingDrawing.svelte:42–48`) under adversarial sync conditions: a `state.room` update that lands mid-turn, and a stale/partial room, checking whether the displayed `previousEntry` (the prompt to illustrate) can resolve against the wrong `myBook`. Drive it toward reproducing the reported "first drawing turn shows a prompt from a different book" symptom. (feedback 88f2)
- [x] T004 [artifacts: datamodel, ui] Review the outcomes of T001–T003 and ensure at least one test is RED on current code, precisely naming the faulty layer (server seat-order vs. client derivation). If none reproduce, tighten the scenario (e.g. two concurrent reconnects, a kick interleaved with a reconnect, or an out-of-order `roomUpdated`) until one fails or the investigation concludes "cannot reproduce" — recording that conclusion in the tasks notes as the gate decision for Phase 2. This is the Phase-2 gate. (feedback f1a4, feedback 88f2)

  > **GATE DECISION (T004): CANNOT REPRODUCE.** No test goes RED on current
  > code. Every faithful scenario preserves the correct fixed rotation:
  > - T001 (shared, pure): the `authorIndex = (originIndex + position) %
  >   activeCount` rotation is sound; each first drawing turn is the previous
  >   seat's book. PASS.
  > - T002 (server, real-socket): a single mid-game token reconnect leaves
  >   `room.players` seat order byte-for-byte unchanged and the rotation
  >   fixed. `onRejoin` finds the player in place and flips `connected` — it
  >   never re-appends. PASS. **This empirically disproves both feedbacks'
  >   stated prime suspect (`onRejoin` re-appending).**
  > - T003 (client, component): `myTurn`/`myBook`/`previousEntry` all derive
  >   from one `state.room` snapshot, so the displayed prompt is always the
  >   assigned book's or none — never a foreign book's — even under an
  >   out-of-order/stale broadcast or a torn/partial room. PASS.
  > - Tightened scenarios (in T002's block): two concurrent reconnects and a
  >   kick interleaved with a reconnect both preserve seat order (a kick sets
  >   `kicked = true` in place; nothing splices/reorders `room.players`
  >   mid-game). PASS.
  >
  > Grep confirms no mid-game path mutates `room.players` order (only
  > `find`/`filter`; `push` is lobby-join only). Conclusion: the reported
  > symptoms are not reproducible under the server or client as they stand.
  > **Phase-2 consequence:** there is no RED test, so T005 has no fix to make
  > (skip-with-note). T006–T008 complete what genuinely applies: the T001–T003
  > tests stand as the permanent regression guard (T006), and T008's citation
  > correction is warranted because T002 disproved the `onRejoin`-re-append
  > hypothesis.

## Phase 2: Fix the implicated layer

- [x] T005 [artifacts: datamodel, ui] Apply the minimal fix the RED Phase-1 test demands, at the layer it implicates: if server-side, repair/preserve `room.players` seat order on the implicated path (without altering the rotation formula in `shared/src/turnAdvancement.ts`); if client-side, correct the `myTurn`/`myBook`/`previousEntry` derivation in `client/src/lib/views/WritingDrawing.svelte` so it always resolves against the authoritative current room and never displays a prompt from the wrong book. Make the Phase-1 failing test GREEN; keep all other turn-assignment tests passing. (feedback f1a4, feedback 88f2)

  > **SKIPPED — NO FIX (cannot reproduce, per T004 gate).** There is no RED
  > Phase-1 test, so there is nothing to make green and no layer to repair.
  > The rotation formula in `shared/src/turnAdvancement.ts` and the client
  > derivation in `WritingDrawing.svelte` are both left unchanged — no
  > production code was touched by this plan. Git history confirms `onRejoin`
  > has never re-appended a player (the guessed cause was never present), so
  > this is "cannot reproduce," not "already fixed."

## Phase 3: Regression guard, verify, reconcile feedback

- [ ] T006 [artifacts: datamodel, ui] Promote the Phase-1 reproduction to a permanent regression test with a focused assertion for the exact wrong-assignment signature fixed in T005 (wrong `bookId` at position 1 / seat-order drift after reconnect), so the defect cannot silently return. Confirm the full test suite passes.
- [ ] T007 Verify end-to-end against a concrete multi-player + reconnect run (scripted e2e or manual per `/run`) that the reported symptom — a first drawing turn showing another book's prompt, and books not passing in stable seat order — is gone. Record the verification outcome.
- [ ] T008 [artifacts: datamodel, ui] If Phase 1 (T002) disproved the `onRejoin`-re-append hypothesis, correct that specific citation in `feedback-turn-ordering-fixed-rotation-f1a4.md` and `feedback-wrong-book-prompt-first-drawing-turn-88f2.md` in place — factual-correction exemption only (reviewer guide `templates/dot-project-readme.md`): fix the cited cause, never change the decision or item content. If the hypothesis held, skip with a note.
