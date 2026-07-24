# Research: webkit/msedge e2e flakiness and slowness (CI run 30066639657)

Date: 2026-07-24 · Commit under test: c7c39c4 · Investigation only, no code changed.

## Summary

The "Target page, context or browser has been closed" error is a **symptom,
not the cause**. Every failure block in the real logs begins with
`Test timeout of 240000ms exceeded.` — the test hit its 240s budget first,
and only then did fixture teardown (`fixtures.ts`, the
`for (const context of created) await context.close()` loop after
`await use(factory)`) close the contexts out from under the still-in-flight
locator action, which is why the action's *final* error text mentions a
closed target. Nothing in the suite closes a page/context/browser before
`driveToReveal` returns (`observer.close()` runs only after `runCoreFlow`
resolves in `e2e/settings-matrix.spec.ts:22`), so the originally suspected
mid-flow teardown race does not exist pre-timeout.

The real defect is a **check-then-act race between the poll-driver and
server-broadcast re-renders**, amplified by an unbounded action retry loop
(no `actionTimeout` configured) and by an **ambiguous accessible name** —
three different "Present your contribution" buttons in
`client/src/lib/views/WritingDrawing.svelte`. It reproduced on **webkit AND
msedge** (3 and 6 flaky tests respectively), while chromium and firefox were
clean — and msedge is a Chromium channel, which itself proves this is a
*timing* problem (slow shards widen the race window), not an engine-family
rendering difference.

## Root cause (flake)

Two concrete manifestations, both from `WritingDrawingPage.playIfMyTurn`
(`e2e/pages/writingDrawing.ts:118–141`) called from the `driveToReveal` poll
loop (`e2e/helpers/flow.ts:63–77`):

### Manifestation 1 — `fill` hangs forever (curated-monochrome, timer-configured on webkit)

Real log (webkit shard, job 89399110423):

```
Test timeout of 240000ms exceeded.
Error: locator.fill: Target page, context or browser has been closed
  - waiting for getByLabel('Your phrase')
    - locator resolved to <input type="text" required ...>
  - attempting fill action
  - element was detached from the DOM, retrying
    at pages/writingDrawing.ts:126 (playIfMyTurn)
```

Sequence: `phraseInput.isVisible()` (writingDrawing.ts:125) returned true,
then before/during `fill` (line 126) a `roomUpdated` broadcast re-rendered
the Svelte view (round advance driven by the other browser player and the
auto-playing observer, `e2e/helpers/observer.ts:143–166`), detaching the
input. The turn state that made "Your phrase" visible never returns, so
`fill` retries against a locator that will never resolve — and because
`playwright.config.ts` sets **no `actionTimeout`** (its `use` block has only
`baseURL` and `trace`), the retry is bounded only by the 240s test timeout.

### Manifestation 2 — `click` rebinds to a different, permanently-disabled button (small-game-override on webkit; the msedge failures show the identical signature)

Real log:

```
- waiting for getByRole('button', { name: 'Present your contribution' })
  - locator resolved to <button type="submit" class="...">  ← the TEXT turn's submit
- attempting click action
  - element is not stable / retrying
- element was detached from the DOM, retrying
  - locator resolved to <button disabled type="button" ...> ← the DRAWING turn's submit
- 348 × waiting for element to be visible, enabled and stable
    - element is not enabled
  - retrying click action (waiting 500ms)      ← until the 240s test timeout
    at pages/writingDrawing.ts:145 (submit)
```

This is the smoking gun. There are **three** buttons with the accessible
name "Present your contribution" in
`client/src/lib/views/WritingDrawing.svelte` — the curated-form submit
(~line 378, `type="submit" disabled={!curatedContent}`), the text-form
submit (~line 415, `type="submit"`, never disabled), and the drawing-turn
submit (~line 486–489, `type="button" disabled={drawnOps.length === 0}`).
Only one renders at a time, so strict mode never complains — but across a
re-render the unscoped `getByRole('button', { name: 'Present your contribution' })`
in `submit()` (writingDrawing.ts:145) silently **rebinds to a different
turn's button**.

What happened: the click on the text submit *actually dispatched and the
submission succeeded* (Playwright can fire the event and then see the
element detach before its post-action checks complete, which it treats as
"retry"). The round advanced, the view swapped to this player's next turn —
a drawing turn with an empty canvas — and the retry re-resolved the same
name to that turn's submit, which is disabled until strokes exist
(`disabled={drawnOps.length === 0}`). No stroke will ever be drawn by a
retrying click, so it spins 348–447 × 500ms until the 240s timeout.

### Which close races which action

Only one close is involved, and it fires *after* the failure is already
decided: the `game` fixture teardown in `e2e/fixtures.ts` (the
`for (const context of created) await context.close()` after
`await use(factory)`, ~line 96) closes the player contexts while the
timed-out `fill`/`click` is still in flight, converting the underlying
"timed out retrying" into the reported "Target page, context or browser has
been closed". The failure-*causing* race is server-broadcast re-render vs.
the non-atomic check-then-act in `playIfMyTurn`.

### Why webkit and msedge, not chromium/firefox

Timing, not engine. Each CI job (`.github/workflows/ci.yml`, matrix is
`shard: [1..4]` only — Playwright's deterministic ordering happens to give
each shard mostly one project) runs 9 tests with 2 workers on a 2-vCPU
`ubuntu-latest` runner, each test spawning 2–3 browser contexts plus a
socket observer, against **live beta over TLS**. WebKit's bundled build and
the branded Edge binary are the heaviest of the four; under CPU contention
their event-dispatch/render latency widens the window between (a) the
visibility check and the action, and (b) click dispatch and Playwright's
detach detection. The `setPointerCapture` stub is **not implicated** — all
failing actions were on *text* turns, and the stub only runs inside
`drawStrokes`. Nor are the 2-minute cover window / 30s grace implicated in
the flake itself (they cost time, not correctness — see below).

All three webkit first-attempts burned exactly 4.0m (the test timeout); all
retries passed (1.3m, 1.3m, 4.0s per the log), which is why the run is
"flaky" rather than red.

## Slowness (webkit 12m25s, msedge 17m29s vs 4m26s/8m12s)

Breakdown of the webkit shard from log timestamps:

| Component | Cost |
| --- | --- |
| Setup (checkout, pnpm install, build:shared, browser install) | ~2.5m (04:25:00 → 04:26:52) |
| 5 passing flows + retries | ~1.2–1.3m each |
| 3 flaky first attempts | **3 × 4.0m = 12m of worker time** (~6m wall at 2 workers) |
| Total test phase | 10.8m |

So the majority of the excess is **flake penalty, not engine slowness**: a
failed attempt costs the *entire* 240s budget because the impossible
`fill`/`click` retries unboundedly (no `actionTimeout`), then the retry
re-runs the full ~1.3m flow. msedge, with 6 flaky tests, paid the same tax
twice as often — hence 17m29s despite being Chromium.

The residual per-flow floor (~1.2m even when green) is suite-design cost
that every engine pays: live-beta network latency on every action, the
serial lobby setup across 2–3 contexts, and the client-side **30s
decoration grace** (`GRACE_MS = 30_000`,
`client/src/lib/views/WritingDrawing.svelte:27`) at round transitions — the
spec itself budgets for it (`e2e/settings-matrix.spec.ts:14–16`). The
2-minute cover window is already short-circuited: browsers click "Present
your cover" (`flow.ts:68–72`) and the observer submits a blank cover
(`observer.ts:170–182`). And yes — the matrix runs the full flow once per
named combo (5 combos, `e2e/settings-matrix.ts`), so every per-flow wait is
×5, and the slowest engines pay the most.

Unconfirmed: I could not verify from logs how much of the ~1.2m green-flow
time is specifically the 30s grace vs. network latency vs. engine speed —
that would need a trace or local timing run.

## Remediation options (ranked; recommend, don't apply)

1. **Scope `submit()` to the current turn's form / control** (flake — the
   direct fix). E.g. resolve the submit button relative to the form that
   contains the control just used, or filter on `[type="submit"]:enabled`
   for text/curated turns. Prevents the rebind-to-disabled-drawing-button
   loop entirely. Tradeoff: none meaningful; smallest, most targeted change.
2. **Set a global `actionTimeout` (e.g. 15–20s) in `playwright.config.ts`**
   (slowness of failures + faster feedback). Turns a 4-minute burn into a
   quick, catchable `TimeoutError`. Tradeoff: any legitimately slow action
   anywhere in the suite must fit the budget; pick generously.
3. **Make `playIfMyTurn` tolerant of mid-action re-renders** (flake). Catch
   the action `TimeoutError` (given #2), return to the `driveToReveal` poll
   loop, and let the next pass re-inspect state — the loop is already
   designed to be idempotent-ish. Better still, verify progress via the
   observer's authoritative room snapshot (entry count advanced) instead of
   trusting click confirmation. Tradeoff: slightly more helper complexity;
   the observer-verification variant is the most robust but medium effort.
4. **Matrix CI over browser × shard (or fewer combos per engine)**
   (slowness). Give webkit/msedge their own parallelism or run the full
   5-combo matrix on chromium only and a sentinel combo on the others.
   Tradeoff: fewer engine-combo pairings covered; more CI jobs.
5. **A client-side test seam for `GRACE_MS`** (slowness, ~30s per round
   transition per flow). The existing seam (`E2E_SEAM_ENABLED` /
   `x-e2e-test-signal`) is **server-side only** (`server/src/config.ts:47`,
   `server/src/socket/server.ts:89`); the grace is a client constant, so
   shrinking it needs a new client seam (e.g. a query param or
   server-echoed flag) — honest caveat: this is new surface area, weigh
   against constitution Principle I.
6. **Do NOT invest in a teardown barrier** ("await all players before any
   close"). The evidence shows no pre-timeout teardown; the fixture close
   only runs after the test has already failed. A barrier would change the
   error message, not the outcome.

Options 1–3 together should eliminate both the flake and most of the excess
shard time in one pass; 4–5 are optional polish if green-flow time still
matters afterward.

## Evidence sources

- `gh run view 30066639657` summary and `--log-failed` (repo
  moui72/exquisite-telephone); webkit shard job 89399110423 full log.
- `e2e/pages/writingDrawing.ts` (lines 118–146), `e2e/helpers/flow.ts`
  (63–77), `e2e/fixtures.ts` (teardown ~96), `e2e/helpers/observer.ts`
  (autoplay 143–182), `playwright.config.ts` (no actionTimeout; retries: 1),
  `client/src/lib/views/WritingDrawing.svelte` (three same-named submits at
  ~378/415/489; `GRACE_MS` at 27), `.github/workflows/ci.yml` (118–160).
