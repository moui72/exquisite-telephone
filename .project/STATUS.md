# Exquisite Telephone — Project Status

_Updated: 2026-07-31 (**v0.6.0 shipped to prod; all 5 remaining feedback items
fixed via a 3-way parallel fan-out.** **Prod:** promoted main→release as
**v0.6.0** (tagged, released, prod deployed) — ships the previously-unpushed
short-turn-timer, lobby self-identity/rename, room-code copy/join-link, and
seat-order regression guards. The badge bot's `[skip ci]` commit blocked the
first promote (docs-only HEAD, no e2e status); resolved by carrying the
app-identical green e2e result from `77ddbd5` onto the badge commit (user-authorized)
and re-dispatching. **Fan-out:** 3 file-disjoint plans ran in parallel worktrees,
all merged to local main (`f7489df`), all worktrees reaped, combined tree green
(lint/typecheck/check:fly + 639 tests):
(1) `flaky-socket-test-deflake` — connect-budget race; added 5000ms
`waitForConnect()` in `waitFor.ts`, routed all 43 connect-waits through it, kept
the tight 2000ms default for real app-signal waits. Verified across 7 runs incl.
under load.
(2) `drawingcanvas-cover-and-live-stroke` — 5da8: `redrawAll` cleared + replayed
only committed `ops`, never the in-progress `currentStroke` (now repainted);
f6d0: template clip now hugs the `<canvas>` alone via a new `background` slot on
`DrawingCanvas` (toolbar outside the clip).
(3) `reveal-modal-sizing-and-cross-viewer` — 23ab: bounded scroll region + pinned
control row (Close moved in for touch); **d607 cross-viewer leak NOT reproducible**
(page state is strictly client-local per datamodel.md) — fix skipped, citation
left as-is (already hedged; classification change isn't a factual-correction
exemption). **Open feedback: 0.** 29 implemented · 1 subsumed, 0 backlogged, all
artifacts stable, diagrams current. **Local main is 20 commits ahead of the
v0.6.0 `origin/main` (unpushed)** — pushing deploys beta and would ship these 3
bug-fix bundles to beta (and re-trigger the badge bot). Two agent caveats: the
DrawingCanvas + Reveal fixes rest on component tests, not a live `/run` visual
check (worth an in-app eyeball); the badge bot pushing to `main` HEAD is the
recurring friction worth addressing. Next: decide whether to push the 20 commits
(beta), or leave local until you want a beta refresh.)_

_Updated: 2026-07-31 (**Seat-order/turn-assignment plan COMPLETE — "cannot
reproduce", no production code changed; also updated ArDD to beta.6.** The
delegated worktree run finished `tasks-seat-order-turn-assignment-58a4.md`
(8/8, now **completed**, merged FF to `eb31035`, worktree reaped). **Key
finding: both reported symptoms are non-reproducible on current code** — the
feedback was filed on a *guessed* cause (`onRejoin` re-appending a player) that
git history confirms was never in the code. Delivered as permanent regression
guards, not fixes: new tests in `shared/src/turnAdvancement.test.ts` (rotation
baseline), `server/src/socket/server.test.ts` (mid-game token reconnect leaves
seat order byte-for-byte unchanged), `client/src/lib/views/WritingDrawing.test.ts`
(`myTurn`/`myBook`/`previousEntry` derive from one room snapshot → foreign-book
prompt structurally impossible). T005 fix was correctly SKIPPED (no red test);
T008 corrected the disproved citation in both feedback files (additive only).
Full suite green on every commit. **First delegation attempt failed** on
`worktree-align.sh reason=diverged` — local `main` had diverged from
`origin/main` (a `[skip ci]` "sync ArDD version badge" bot commit local never
pulled); resolved by rebasing local `main` (37 commits) onto `origin/main`, then
re-delegating (that bot will re-diverge main again — a `pull --rebase` before
local work avoids it). **ArDD:** updated beta.5→beta.6 (now up-to-date), and
`status_history_keep: 5` set (this file now keeps only the newest 5 blocks; full
history in git). **Open feedback: 5** — `…reveal-all-modal…-23ab` +
`…reveal-page-turn…-d607` (both ui/Reveal, bundle-able), `…cover-template…-f6d0`
(ui/CoverDecoration), `…drawing-stroke…-5da8` (ui/DrawingCanvas),
`…flaky-server-socket…-b13d` (test-support). 29 implemented · 1 subsumed, 0
backlogged, all artifacts stable, diagrams current. `main` unpushed (ahead of
`origin/main`); prod v0.5.0. Recommend `/ardd-plan --slate` to group the 5
remaining feedback files.)_

_Updated: 2026-07-30 (**Planned the seat-order/turn-assignment bundle — 2
feedback files consumed, tasks ready.** New approved plan
`plan-seat-order-turn-assignment-2026-07-30-69ea.md` bundles
`…turn-ordering…-f1a4` + `…wrong-book-prompt…-88f2` (both now **planned**,
bound to it) into a **diagnosis-first** fix: the code read contradicts both
files' stated suspect — `onRejoin` preserves the seat in place (no re-append),
mid-game joins are refused, `onDisconnect` keeps the seat — so the plan writes a
RED reproduction test to localize the fault (server seat-order drift vs. the
client's own `computeNextEntries`/`previousEntry` derivation in
`WritingDrawing.svelte`) *before* touching rotation code. Tasks file
`tasks-seat-order-turn-assignment-58a4.md` (**ready**, 0/8, 3 phases: reproduce
→ fix implicated layer → regression+verify+citation-fix). **Open feedback now:
5** (was 7): `…cover-template…-f6d0` (ui/CoverDecoration), `…reveal-page-turn…-d607`
+ `…reveal-all-modal…-23ab` (ui/Reveal, could bundle),
`…drawing-stroke-invisible…-5da8` (ui/DrawingCanvas), `…flaky-server-socket…-b13d`
(test-support) — all still safe to fan out, disjoint from this plan. Otherwise:
29 implemented · 1 subsumed, 0 backlogged, all 3 artifacts stable, diagrams
current. `main` unpushed; prod v0.5.0. Work Queue: one ready tasks file, no
in-flight claims. Auto-running `/ardd-implement` next.)_

_Updated: 2026-07-30 (**+1 open feedback: reveal-all modal too tall
(7 open total).** New file `feedback-reveal-all-modal-too-tall-23ab.md`
(**open**, 1 Bug [artifacts: ui]): in the book viewer, choosing "reveal all"
grows the per-book modal so tall its controls become inaccessible — obscured by
the nav bar and/or pushed below the lowest scroll point. Code ref:
`Reveal.svelte` per-book modal / `handleRevealAll` (~L391); the modal shell is
`max-h-full … overflow-y-auto` but reveal-all content overflows the usable
height so the close/control row can't be reached. Footprint = ui/Reveal, same
component as `…reveal-page-turn…-d607` → those two could bundle. **Open feedback
now: 7, all Bugs:** (1) `…wrong-book-prompt…-88f2` + `…turn-ordering…-f1a4` =
*same root (rotation/reconnect), bundle*; (2) `…cover-template…-f6d0`
(ui/CoverDecoration); (3) `…reveal-page-turn…-d607` + `…reveal-all-modal…-23ab`
(ui/Reveal — could bundle); (4) `…drawing-stroke-invisible…-5da8`
(ui/DrawingCanvas); (5) `…flaky-server-socket-tests-b13d` (test-support).
Otherwise unchanged: 29 implemented · 1 subsumed, 0 backlogged, all 3 artifacts
stable, diagrams current. `main` unpushed; prod v0.5.0. Auto-running
`/ardd-plan --slate` to get the grouping across all seven.)_

_Updated: 2026-07-30 (**+1 open feedback: cover-template clip regression
(6 open total).** New file
`feedback-cover-template-not-clipped-to-canvas-regression-f6d0.md` (**open**,
1 Bug [artifacts: ui]): cover background templates still aren't constrained to
the canvas — a **regression/incomplete fix** of the earlier
`feedback-cover-decoration-background-ca-4113.md` F001 (shipped under
`plan-host-drawing-tool-controls-2026-07-24-590b.md`). The `overflow-hidden`
clip wrapper in `CoverDecorationCanvas.svelte` wraps the whole `DrawingCanvas`
(toolbar + canvas), so the `inset-0` template layer bleeds behind the toolbar
instead of clipping to the canvas rectangle; fix scopes the template+clip to the
`<canvas>` bounds only. **Open feedback now: 6, all Bugs** — a full play-test
sweep: (1) `…wrong-book-prompt…-88f2` + `…turn-ordering…-f1a4` = *same root
(rotation/reconnect), bundle*; (2) `…cover-template…-f6d0` (ui/CoverDecoration);
(3) `…reveal-page-turn…-d607` (ui/Reveal); (4) `…drawing-stroke-invisible…-5da8`
(ui/DrawingCanvas); (5) `…flaky-server-socket-tests-b13d` (test-support).
Footprints mostly disjoint → likely 1 bundle + 4 solo fan-outs. Otherwise
unchanged: 29 implemented · 1 subsumed, 0 backlogged, diagrams current. `main`
unpushed; prod v0.5.0. **Recommend `/ardd-plan --slate` now** to get the grouping
before this queue grows further.)_

