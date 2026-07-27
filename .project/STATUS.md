# Exquisite Telephone — Project Status

_Updated: 2026-07-27 (**Planned + tasked short turn-timer options + Lobby
self-identity/self-rename (bundled via `--slate`).** A `/ardd-plan --slate` over
the plannable surface (1 backlogged feature + 1 open feedback file) found both
edit `client/src/lib/views/Lobby.svelte`, so it bundled them into one plan.
Approved `plan-short-turn-timer-options-2026-07-27-1cf1.md` with ready tasks
`tasks-short-turn-timer-options-98a3.md` (**ready**, 0/11) across 4 phases: P1
artifact revisions (ui/datamodel/infrastructure for the feedback), P2 short
turn-timer options, P3 F001 "(you)" marker, P4 F002 self-rename. **Feature**
`short-turn-timer-options` → **tasked**; **feedback**
`feedback-lobby-self-identity-and-rename-ff4b.md` → **planned** (F001/F002 both
incorporated — UX items, no override needed). **Design decision (user-confirmed):**
sub-minute timers are stored as **fractional minutes** (`0.5|1|1.5|2` for
30s/60s/90s/2m) — the `turnTimerMinutes * 60000` deadline math is unchanged, so
no seconds-field rename (constitution I). The feature's datamodel + ui edits
were applied this run and committed (`ffa314a`); infrastructure's
`onSetDisplayName` handler-list edit lands in P1 (T003). F002 is broader than
its `[artifacts: ui]` tag — it also touches datamodel (Player.name
lobby-mutability) + infrastructure (new handler) + server/session, all captured
in the plan. **Register:** 28 implemented · 1 tasked (`short-turn-timer-options`)
· 1 subsumed; **0 backlogged, 0 open feedback.** **Diagrams:** datamodel + ui
now **stale** (this run's edits), infrastructure current (goes stale at T003).
DEFECTS.md holds 2 cosmetic doc-drift entries (2026-07-24). **Work Queue:** one
ready file, nothing else ready/in-flight. **Next: `/ardd-implement`** the 11-task
file. *(next_step_prompt is `auto`, but I'm NOT auto-chaining this one: it's an
11-task, multi-surface plan (shared/server/client) and worktree delegation is
broken this session — the Agent worktree base carries an injected badge-sync
commit that diverges from main, forcing slow inline execution with a
full-suite pre-commit per task. Worth an explicit go-ahead before committing to
that. Say the word — or run `/ardd-implement` — and I'll proceed inline.)_

_Updated: 2026-07-27 (**Lobby join-link chip + guest-list context menu SHIPPED
(3/3), implemented inline.** `tasks-lobby-join-link-chip-and-menu-686f.md` →
**completed**; the delegated worktree was abandoned first (its harness base
carried an injected `1bebc6b` "sync ArDD version badge" commit → `worktree-align.sh`
reported `aligned=false reason=diverged`), so execution fell back to inline on
`main`. Delivered: **T001** ui.md Lobby View revised (join link → its own
click-to-copy chip under the room code; context menu → whole Guest List widget
with two items); **T002** TDD red `Lobby.test.ts` cases (`.fails`, incl. the
room-code-stays-bare v0.5.0 guard); **T003** `Lobby.svelte` — a `join-link-chip`
click-to-copy control showing `<origin>/?room=<code>`, and the contextmenu/
long-press handlers moved onto the `guest-list` widget wrapper with "Copy room
code" + "Copy join link" items (reusing `clipboard.ts`/`handleCopyJoinLink`; a
justified `svelte-ignore a11y_no_static_element_interactions` on the wrapper).
Full suite green (**client 286**, incl. 3 previously-`.fails` now passing),
svelte-check 0/0. UI-only — no datamodel/infra/server change; ui diagram left
`current` (structure unchanged). Commits `50e6060`→`7ab4c34` on `main`. The
plan's `features:` was empty, so no register flip. Note a **flaky server socket
test** (`waitForEvent … "connect"` 2000ms) reappeared once on a pre-commit run
and passed on retry — pre-existing load flake, not this change. **Register:**
28 implemented · 1 backlogged (`short-turn-timer-options`) · 1 subsumed.
**1 open feedback** (`feedback-lobby-self-identity-and-rename-ff4b.md`, from a
concurrent session — still untracked on disk). Plannable now: that feedback
file + the backlogged feature. **Concurrency caveat:** a parallel session has
been writing `.project/` this turn (its feedback file + this STATUS.md were
uncommitted when I wrote), so I'm NOT auto-running `/ardd-plan` — coordinate
first. Diagrams current, ArDD up-to-date. Next: `/ardd-plan --slate` to group
the open feedback + backlogged feature, or plan either directly.)_

_Updated: 2026-07-27 (**+1 open feedback: Lobby self-identity + rename-by-click
(2 UX items).** New feedback file
`feedback-lobby-self-identity-and-rename-ff4b.md` (**open**, 2 items, both
*UX* [artifacts: ui]): **F001** — Lobby View doesn't mark which players-list
entry is "you" when viewing as a non-host; **F002** — a non-host should be able
to change their display name by clicking their own name in the Lobby (currently
fixed at join time). Next `/ardd-plan` picks it up. All four artifacts stable,
0 open questions, diagrams current, ArDD up-to-date (commit 541b283, beta
channel). DEFECTS.md still holds 2 cosmetic doc-drift entries (verified
2026-07-24). Register: 28 implemented · 1 backlogged
(`short-turn-timer-options`) · 1 subsumed. **In flight:**
`tasks-lobby-join-link-chip-and-menu-686f.md` is **in-progress**, 1/3, on the
primary checkout (no sibling worktree). No `ready` tasks file → no Work Queue.
Next: finish the in-flight join-link tasks (`/ardd-implement`), then
`/ardd-plan` to sweep the open feedback + backlogged feature.)_

_Updated: 2026-07-27 (**Planned + tasked the Lobby join-link chip + guest-list
context menu (both reconsider overrides confirmed).** F001/F002 of
`feedback-lobby-join-link-chip-and-menu-601c.md` were confirmed as reversals of
recorded ui.md Lobby View decisions (join link was context-menu-only; the menu
was room-code-anchored with a single item); feedback file now **planned**.
Approved `plan-lobby-join-link-chip-and-menu-2026-07-27-ba69.md` with ready
tasks `tasks-lobby-join-link-chip-and-menu-686f.md` (**ready**, 0/3): P1 revises
ui.md's copy/context-menu paragraph (join link → its own click-to-copy chip
under the room code; context menu → whole Guest List widget, two items "copy
room code" + "copy join link"); P2 implements in `Lobby.svelte` test-first —
a failing `Lobby.test.ts` case for the chip and the widget-wide two-item menu
(incl. a guard that the `data-testid="room-code"` text stays the bare code, the
v0.5.0 regression), then the implementation. UI-only: no
datamodel/infra/server change, reuses the existing `clipboard.ts` helper and
Foyer `?room=` pre-fill; no new production shortcut. **Work Queue:** one ready
file, no other ready or in-flight work — nothing to parallelize. Backlog +
feedback now empty; register unchanged (28 implemented · 1 subsumed). Diagrams
current, ArDD up-to-date. DEFECTS.md holds 2 cosmetic doc-drift entries
(verified 2026-07-24). Next: `/ardd-implement`. *(next_step_prompt: auto —
auto-running `/ardd-implement`.)*)_

_Updated: 2026-07-27 (**+1 open feedback: Lobby join-link chip + guest-list
context menu (2 reconsider items).** New feedback file
`feedback-lobby-join-link-chip-and-menu-601c.md` (**open**, 2 items, both
*Reconsidered* [artifacts: ui]): **F001** — show the join link as its own
click-to-copy chip in smaller text under the room code, not only via the
context menu (reverses ui.md's decision that the join link is exposed *only*
through a "copy join link" context-menu item); **F002** — make the copy
context menu available on the whole Guest List widget via right-click (not just
the room-code element) and have it offer 'copy room code' and 'copy join link'
as two separate items (reverses ui.md's decision that the menu is anchored to
the room code with a single "copy join link" item). Both touch
`client/src/lib/views/Lobby.svelte` (room-code button + context-menu overlay)
and ui.md's Lobby View copy/context-menu paragraph — so `/ardd-plan` will
carry artifact-revision tasks alongside the code change. State otherwise
unchanged: 28 features implemented (1 subsumed), no backlog, no ready/in-flight
tasks, all four artifacts stable, all three diagrams current, ArDD up-to-date.
DEFECTS.md holds 2 cosmetic doc-drift entries (verified 2026-07-24). Next:
`/ardd-plan` to sweep this feedback file. *(next_step_prompt: auto — auto-running
`/ardd-plan feedback-lobby-join-link-chip-and-menu-601c.md`.)*)_

_Updated: 2026-07-25 (**Shipped v0.5.0 to prod; ArDD updated; all clear.** The
prod deploy of everything since v0.4.0 (reveal F004/F005, canvas focus mode,
room-code copy/join-link, monochrome→paletteMode reversal) initially failed the
cross-browser e2e gate — a real regression the mocked unit suite couldn't see:
the room-code click-to-copy cue was an `opacity-0` span *inside* the
`data-testid="room-code"` element, so `innerText` read "<CODE>\nCopied" and
guests joined a garbled code (host saw 1 player). Root-caused by a headless
local repro, fixed (moved the test-id to an inner span, commit `06a1113`), e2e
went green on all four browsers, and prod promoted to **v0.5.0** (`release` ==
`main` at `bfa6aee`). Then updated the ArDD install on the beta channel:
`9bc9b38` (v1.1.1-beta.3) → `541b283` (v1.2.1-beta.5), no pending migrations,
all four workflow fields already set. **State: fully clear** — 28 features
implemented (1 subsumed), no backlog, no open feedback, no ready/in-flight
tasks, all three diagrams current, ArDD up-to-date. DEFECTS.md holds 2
cosmetic doc-drift entries (last verified 2026-07-24, already surfaced). Nothing
pending; safe to plan/implement whenever new work arrives.)_

_Updated: 2026-07-24 (**Monochrome→palette-mode reversal merged & implemented;
queue drained.** The delegated worktree completed all 4 tasks; branch merged
into `main` (clean, net −220 lines) and reaped. `Room.monochromeOnly`,
`onSetMonochrome`, `setMonochrome`, and `palettePreset` are gone — grep over
code/tests/e2e is clean (Constitution IV); `Room.paletteMode`
(`monochrome | primary | standard | extended`, default `standard`) is the
single host lever, with one Lobby palette-mode selector (monochrome listed
first). Full suite green: **shared 70 · server 255 · client 282 · root 6 = 613
passing**, svelte-check clean. Artifacts (datamodel/ui/infrastructure), README
datamodel diagram, and e2e page objects all realigned by the worker. Feedback
file `planned`. **Final-pass housekeeping done:** all three diagrams back to
`current` (fixed the README Canvas-node label to "palette mode"). **Backlog and
feedback are empty — nothing left to plan or implement.** Remaining: push `main`
and cut a prod promote (this reversal + the earlier features are unreleased —
prod is still on v0.4.0).)_

_Updated: 2026-07-24 (**Planned + tasked the monochrome→palette-mode reversal
(user-confirmed override).** F001 of `feedback-monochrome-as-palette-option-e4ce.md`
was confirmed as a decision reversal of the v0.4.0 palette design; feedback file
now **planned**. Approved `plan-monochrome-into-palette-mode-2026-07-24-9207.md`
with ready tasks `tasks-monochrome-into-palette-mode-6ba3.md` (**ready**, 0/4):
retire `Room.monochromeOnly` + `onSetMonochrome` + `setMonochrome`, rename
`palettePreset` → `paletteMode` and add a `monochrome` value
(`monochrome | primary | standard | extended`), and collapse the two Lobby
controls into one palette-mode selector — Constitution IV (no dead
architecture), so the old symbols are deleted, not left. Phasing: P1 rewrites
datamodel/ui/infrastructure (docs); P2–P4 fold into ONE atomic code task (T004)
because the field rename ripples across shared+server+client and the pre-commit
hook gates the full suite, so an incremental rename would break typecheck at a
commit boundary. No persistence migration (rooms in-memory). Backlog + feedback
now empty — this is the last queued work. Next: `/ardd-implement`, then the
final push + diagram-regen + prod-promote pass.)_

_Updated: 2026-07-24 (**Room-code copy / join link merged & implemented.** The
delegated worktree completed all 4 tasks; branch merged into `main` (clean) and
reaped. Full suite green: **shared 70 · server 258 · client 281 · root 6 = 615
passing**, svelte-check clean. Feature `room-code-copy-and-join-link` →
**implemented**. Shipped: Lobby room-code click-to-copy with a 2s inline
"copied" cue (new `client/src/lib/clipboard.ts`), a custom right-click / 500ms
long-press context menu with "copy join link" (`<origin>/?room=<code>`), and
Foyer URL-param pre-fill that seeds the join form and strips the param via
`history.replaceState`. Footer left unchanged (Lobby-only). Added a **Production
Annotation** to ui.md: the clipboard helper is secure-context-only (no
`execCommand` fallback) — harmless on HTTPS prod/beta. **Only remaining
plannable:** `feedback-monochrome-as-palette-option-e4ce.md` (open
reconsider — fold monochrome into the palette-preset control). ui diagram
**stale**. `main` unpushed. Next: plan + implement the monochrome fold, then a
final push + diagram-regen + prod-promote pass.)_

_Updated: 2026-07-24 (**Planned + tasked room-code copy / join link.** Approved
`plan-room-code-copy-and-join-link-2026-07-24-f5be.md` with ready tasks
`tasks-room-code-copy-and-join-link-259a.md` (**ready**, 0/4): P1 click-to-copy
the Lobby room code with an inline "copied" cue (+ a reusable clipboard helper);
P2 a custom right-click/long-press context menu with "copy join link"
(`<origin>/?room=<code>`); P3 Foyer reads a `room` URL param on load →
selects join tab + pre-fills the code (default: strip the param after seeding).
UI-only: ui.md Lobby/Foyer gained the click-to-copy + join-link + URL-param
paragraphs; no datamodel/infra/server change (join uses existing
`session.joinRoom()`). Feature `backlogged → tasked`; ui diagram **stale**.
Sequencing note: this and the still-open monochrome feedback both touch
`Lobby.svelte`/`ui.md`, so implementing sequentially (room-code first, then
plan+implement monochrome on updated code) avoids conflicts. Still open:
`feedback-monochrome-as-palette-option-e4ce.md`. Next: `/ardd-implement` the
room-code tasks.)_

_Updated: 2026-07-24 (**Canvas focus mode merged & implemented.** The delegated
worktree completed both tasks; branch `worktree-agent-a0dfb820203ce694c` merged
into `main` (clean) and reaped. Full suite green: **shared 70 · server 258 ·
client 269 · root 6 = 603 passing**, svelte-check clean. Feature
`focus-canvas-for-larger-drawin` → **implemented**. Shipped: a client-local
focus/expand toggle on the turn drawing canvas — at the `lg:` breakpoint
(≥1024px, desktop-only) it widens `max-w-md → lg:max-w-4xl` and stretches the
reused `DrawingCanvas` via a scoped CSS rule (the canvas carries a fixed
`width="320"`, so container-only widening would have been a no-op); hidden
below `lg:`, cover canvas unchanged, factored so extending it later is cheap.
Existing pointer-scaling keeps strokes accurate (T002 pins a 2× render case).
`main` unpushed (many commits ahead; prod on v0.4.0). **Still plannable:**
`room-code-copy-and-join-link` (backlogged) + `feedback-monochrome-as-palette-option-e4ce.md`
(open reconsider). ui diagram **stale** from the focus-mode paragraph. Next:
plan room-code or monochrome, or push/promote.)_

_Updated: 2026-07-24 (**Planned + tasked canvas focus mode.** Slate defrag over
the 2-feature backlog put both in a parallel set (disjoint footprints); planned
`focus-canvas-for-larger-drawin` first. Approved plan
`plan-focus-canvas-for-larger-drawin-2026-07-24-a6f4.md` with ready tasks
`tasks-focus-canvas-for-larger-drawin-6727.md` (**ready**, 0/2): a client-local
focus/expand toggle on the turn drawing canvas that breaks out of the
`max-w-md` layout at a tablet/desktop breakpoint (absent on mobile), reusing
`DrawingCanvas` unchanged — existing pointer-scaling keeps strokes accurate.
UI-only: ui.md Writing/Drawing View gained a Focus-mode paragraph; no
datamodel/infra/server change. Feature `backlogged → tasked`; ui diagram
**stale**. Open questions left for implementation: cover-canvas inclusion
(default no) and the exact breakpoint/expanded size. The reconsider-feedback
`feedback-monochrome-as-palette-option-e4ce.md` was deliberately left **open**
(unrelated to this plan). Still plannable: `room-code-copy-and-join-link`
(backlogged) + that monochrome feedback. Next: `/ardd-implement` the focus-canvas
tasks, or plan room-code / monochrome.)_

_Updated: 2026-07-24 (**Backlogged canvas-focus feature.** New register entry
`focus-canvas-for-larger-drawin` (**backlogged**): on larger viewports the
drawing canvas can be focused/expanded to a bigger surface than the default
layout allows; small/mobile viewports unaffected. Plannable inputs now: 2
backlogged features (`room-code-copy-and-join-link`,
`focus-canvas-for-larger-drawin`) + 1 open feedback
(`feedback-monochrome-as-palette-option-e4ce.md`). A `/ardd-plan --slate` would
group the two features.)_

_Updated: 2026-07-24 (**Backlogged room-code copy + join-link feature.** New
register entry `room-code-copy-and-join-link` (**backlogged**): clicking the
displayed room code copies the bare code; a context menu (right-click /
long-press) adds "copy join link" copying a shareable URL that pre-fills the
room on open. Open design question flagged for planning — the join-link path
may need a URL-param join route that doesn't exist yet. Plannable inputs now: 1
backlogged feature + 1 open feedback item
(`feedback-monochrome-as-palette-option-e4ce.md`). Next: `/ardd-plan
room-code-copy-and-join-link` or plan the monochrome-fold feedback.)_

_Updated: 2026-07-24 (**v0.4.0 shipped to prod; new reconsider-feedback opened.**
Cut the prod release: promote workflow ran green (e2e gate → minor bump →
fast-forward `release` → fly deploy `exquisite-telephone`), version **0.3.0 →
0.4.0**, tagged `v0.4.0`, `release` and `main` in sync at `a6e29d3`. Diagrams
had been regenerated to `current` beforehand. **One new open feedback item**
(`feedback-monochrome-as-palette-option-e4ce.md`, **Reconsidered**): F001 —
fold monochrome into the palette-preset control as a single palette-mode option
instead of the separate `Room.monochromeOnly` boolean + force-monochrome
toggle just shipped in `host-drawing-tool-controls` (v0.4.0). This reverses a
freshly recorded decision, so the next `/ardd-plan` must confirm the override
and bring datamodel/ui/infrastructure back in line (retire `monochromeOnly` /
`onSetMonochrome` in favor of a `monochrome` palette-mode value). No code
touched yet. Next: `/ardd-plan feedback-monochrome-as-palette-option-e4ce.md`.)_

_Updated: 2026-07-24 (**Round-gating/reveal plan merged; F003 closed as
verified-no-bug. Both batches now landed on `main`.** The second delegated
worktree finished and its branch `worktree-agent-aa3f3e3ffa5b33e7a` merged into
`main` (clean 3-way — `ui.md` End-of-game edit and the palette Production-
Annotation resolution sat in different sections; `handlers.ts`/`server.ts`
auto-merged the palette setters with the new `onWithdrawVoteToPlayAgain`) and
was reaped. Full suite green: **shared 70 · server 258 · client 265 · root 6 =
599 passing**. Shipped: **F004** — reveal "read by"/"being read by" notes as
self-backgrounded champagne badge chips (legible over the background); **F005**
— encore vote becomes a "Withdraw encore vote" toggle (`withdrawVoteToPlayAgain`
emitter + `onWithdrawVoteToPlayAgain` handler), retractable throughout Reveal
(the vote is only a host-facing readiness signal, nothing to lock), with the
voter-side affordance added to `ui.md` End-of-game controls. **F003 (round
gating) — closed as verified-no-bug** per coordinator adjudication (user
accepted): the round-gate is already enforced and tested at all four
turn-assignment layers (`computeNextEntry`, `onSubmitEntry` round-not-open
guard, `resolveTimeoutVote`, client `myTurn`), landed 2026-07-14 — ten days
before the report; a maximally-staggered integration test confirmed the
invariant. T001/T002 marked complete as verified-correct (not fix-implemented);
`tasks-round-gating-and-reveal-polish-0912.md` → **completed** (4/4). Any
residual play symptom becomes fresh client-scoped feedback, never a reopen
(`completed` is terminal). **Pipeline now fully drained:** empty backlog, no
open feedback, no ready/in-flight tasks, no unsurfaced defects. Remaining is
housekeeping only — datamodel/infrastructure/ui **diagrams stale** (run
`/ardd-diagram`), ArDD update available (→ v1.2.1-beta.1), and `main` is unpushed
(~8 commits ahead; push deploys beta). Next: push + verify in beta, or
regenerate diagrams.)_

_Updated: 2026-07-24 (**Palette plan merged & implemented; round-gating still in
flight.** The delegated palette worktree completed all 10 tasks and its branch
`worktree-agent-aed8a20e7ae01fe10` was merged into `main` (merge commit, clean
3-way — no `ui.md` conflict with the concurrent round-gating branch) and the
worktree reaped. Full suite green post-merge: **shared 70 · server 255 · client
262 · root 6 = 593 passing**. Features `host-drawing-tool-controls` and
`skin-tone-palette-colors` → **implemented** (register now 26 implemented, 0
tasked). Shipped: `Room.palettePreset` (primary/standard/extended) +
`Room.allowFillTool`, `onSetPalettePreset`/`onSetFillTool` handlers (in
`server/src/socket/handlers.ts` — the real per-setting home, not `index.ts`),
session emitters, Lobby controls, `DrawingCanvas` preset map with skin-tone
swatches (brown `#8d5524`, pink `#ffc1a6` in standard+extended), fill-tool
hiding threaded to every drawing surface (turn + cover), plus feedback F001
(mid-stroke color), F002 (tolerance flood fill — the `ui.md` exact-match
Production Annotation was resolved to `_(none)_`), F006 (pen/bucket radio), and
cover-decoration clip. Design decisions recorded: no server-side fill guard
(client-only hiding, consistent with `monochromeOnly`; `allowFillTool` is
lobby-immutable). **Still in flight:** the round-gating/reveal worktree
`worktree-agent-aa3f3e3ffa5b33e7a` (`tasks-round-gating-and-reveal-polish-0912.md`,
**in-progress 1/4**) — F003 round gating, F004 attribution, F005 encore
withdraw; will auto-merge on report-back. Note the palette suite once flagged a
pre-existing load-induced flake in the server round-gating socket test
(`rejects a submission from a player whose turn it is not`, 5s timeout) — not
caused by palette work, and the round-gating batch touches that area. Diagrams
for datamodel/infrastructure/ui remain **stale** (run `/ardd-diagram <name>`).
ArDD update still available (→ v1.2.1-beta.1). `main` is unpushed (4+ commits
ahead). Next: await the round-gating worktree merge.)_

_Updated: 2026-07-24 (**Planned round-gating fix + reveal polish; palette
implementation in flight.** Two things this pass. (1) The palette plan
`tasks-host-drawing-tool-controls-d6bf.md` is being implemented in a delegated
worktree (`agent-aed8a20e7ae01fe10`, branch
`worktree-agent-aed8a20e7ae01fe10`) — **in-progress 1/10**; both palette
features remain `tasked` in the register until that branch merges (state rides
the worktree). (2) Drained the last three open items from
`feedback-drawing-tools-reveal-and-round-0639.md` into a new approved plan
`plan-round-gating-and-reveal-polish-2026-07-24-400e.md` with
`tasks-round-gating-and-reveal-polish-0912.md` (**ready**, 0/4): F003
round-gating divergence (Phase 1 — reproduce with a failing round-gate test,
then route the bypassed advancement path through `turnAdvancement`'s
`currentRoundFor` guard; kept consistent with the shipped grace countdown),
F004 reveal attribution legibility, F005 encore-vote withdraw affordance + a
ui.md End-of-game-controls addition. That feedback file is now fully
**planned** — no open feedback remains. **Work Queue:** the two ready files
share only *declared* artifacts (datamodel, ui) — no feature overlap and no
code-path contact (palette = DrawingCanvas/floodFill/lobby/handlers;
round-gating = turnAdvancement/Reveal), safe to run independently; `merge_policy`
still governs at merge. No new artifact edits this pass (feedback-only plan).
datamodel/infrastructure/ui diagrams remain **stale** from the palette plan.
**ArDD update available:** installed 9bc9b38, source at v1.2.1-beta.1 — run
`/ardd-update`. Next: await the palette worktree merge, then `/ardd-implement`
the round-gating/reveal tasks.)_

_Updated: 2026-07-24 (**Planned host drawing-tool controls + skin-tone palette
+ drawing-canvas fixes.** Slate defrag over the 2-item backlog bundled both
palette features (shared `PALETTE_COLORS` seam in `DrawingCanvas.svelte`) into
one plan, `plan-host-drawing-tool-controls-2026-07-24-590b.md` (**approved**),
with tasks `tasks-host-drawing-tool-controls-d6bf.md` (**ready**, 0/10). Scope:
`host-drawing-tool-controls` (new `Room.palettePreset` + `Room.allowFillTool`,
their `onSetPalettePreset`/`onSetFillTool` handlers, session emitters, lobby
controls, `DrawingCanvas` preset/fill rendering) and `skin-tone-palette-colors`
(brown + pink swatches in the `standard`/`extended` presets) — both flipped
`backlogged → tasked`. Folded in drawing-canvas feedback F001 (mid-stroke
color), F002 (tolerance flood fill — resolves the ui.md exact-match Production
Annotation), F006 (pen/bucket radio) from
`feedback-drawing-tools-reveal-and-round-0639.md`, plus that file's sibling
`feedback-cover-decoration-background-ca-4113.md` F001 (clip cover background to
canvas — file now **planned**). Artifact edits applied: datamodel `Room` gains
`palettePreset`/`allowFillTool`; infrastructure handler list gains
`onSetPalettePreset`/`onSetFillTool`; ui Lobby + drawing/cover toolbars reflect
both. **Deferred, still open** in the drawing-tools feedback file: **F003 round
gating not holding — a correctness divergence, flagged for its own priority
plan next**; F004 reveal attribution legibility; F005 encore-vote confirmation.
Diagrams for datamodel/infrastructure/ui now **stale**. Next: `/ardd-implement`
the ready tasks file, or plan F003.)_

_Updated: 2026-07-24 (**Inbox drained: 9 out-of-band items → 2 feedback files
(1 + 6 items) + 2 register entries.** Play-session capture
via the `inbox` function, routed here in one pass. New feedback file
`feedback-drawing-tools-reveal-and-round-0639.md` (**open**, 6 items):
*Bugs* — F001 new color selection doesn't apply until the stroke ends
(contradicts ui.md "applies to new strokes only"); F002 fill tool leaves
speckled residue that never resolves, undercutting ui.md's fill-white-to-erase
path (Claude's unverified hypothesis, attributed in-file: antialias/tolerance
in the flood fill); F003 **round gating isn't holding** — books pass early and
rounds start staggered, contradicting ui.md's "waiting for the round to
finish" state and datamodel's round-gated progression (reported as a
preference; it is a divergence from recorded design, and it interacts with the
just-shipped 30s grace countdown). *UX* — F004 reveal "read by" notes
illegible against the background (card or badge them); F005 non-host "Vote for
an Encore" gives no post-vote affordance, and ui.md's End-of-game controls
section is silent on what the voter sees, so the artifact needs the addition
too; F006 toolbar tool selection should be an explicit pen/bucket radio rather
than a single fill toggle. The drain's first item was filed separately, before
the remaining six were batched, as
`feedback-cover-decoration-background-ca-4113.md` (**open**, 1 item) — the
cover-decoration UI doesn't clip the background templates to the canvas
[artifacts: ui]. Both files are from this drain; neither predates it.
**Register +2 backlogged** — `host-drawing-tool-controls` (palette presets +
fill-tool permission, grouped with the monochrome decree) and
`skin-tone-palette-colors` (brown/pink in the default palette; tracked
separately by the user's call so it survives if the preset work never lands).
Register now **2 backlogged · 24 implemented · 1 subsumed**; **2 open feedback
files**; all four artifacts stable, no drafts; nothing in flight; ArDD
up-to-date. `DEFECTS.md` unchanged — still lists 8b429ce5 + 809c08f2, both
fixed last run but not re-verified. Recommended: `/ardd-defects` to clear those
two, then `/ardd-plan` to sweep the 2 defects + both open feedback files into
one pass. *(`next_step_prompt: auto` would have run `/ardd-plan` here; held off
— the ask was to drain the inbox, and planning is a separate call.)*)_

_Updated: 2026-07-24 (**`dismissable-grace-and-drift` SHIPPED (4/4, merged &
reaped); +1 open feedback bug.** `tasks-dismissable-grace-and-drift-3cbd.md`
executed in a delegated worktree, fast-forward merged to `main` (`04ccebb`),
worktree reaped. Delivered: **T001** datamodel author-rotation clause →
active roster (defect 8b429ce5); **T002** infrastructure Config Lockstep
allowlist now names `app` + `E2E_SEAM_ENABLED`, template header comment fixed
and `fly.toml`/`fly.staging.toml` regenerated (`check:fly` passes) (defect
809c08f2); **T003** dismissable 30s grace countdown — `skipGrace()` +
"Go to my easel now" button (`grace-skip`) in `WritingDrawing.svelte`,
client-side only (no timer/server effect), TDD test in `WritingDrawing.test.ts`
(red→green, 49/49) (feedback F001); **T004** ui.md documents the skip control.
`last_updated 2026-07-24` on datamodel/infrastructure/ui; `diagram_status` left
`current` (interaction/prose edits). Register unchanged (24 implemented · 1
subsumed); nothing in flight.
**Two loose ends:** (1) `DEFECTS.md` still lists 8b429ce5 + 809c08f2 — both now
fixed this run but not yet re-verified; run `/ardd-defects` to clear them. (2)
**+1 open feedback (Bug):** `feedback-cover-decoration-background-ca-4113.md`
— cover-decoration UI doesn't constrain the background templates to the canvas
(they overflow/aren't clipped) [artifacts: ui]; the next `/ardd-plan` picks it
up. Recommended: `/ardd-defects` to clear the two now-fixed entries, then
`/ardd-plan` for the canvas-clipping bug (or `/ardd-plan` alone to sweep both
at once).)_

_Updated: 2026-07-24 (**`/ardd-defects` re-verify after cleanup — 6 fixed, 2
new; +1 open feedback.** Fresh four-parallel-survey artifact-vs-code pass
confirming the `artifact-drift-cleanup` fixes landed: **all six** prior
defects RESOLVED and dropped (datamodel laps completion, infra version
example + both `[OPEN:]` folds, ui plaque + gavel + readiness denominator).
`constitution.md` and `ui.md` clean. **2 new defects** recorded (`DEFECTS.md`,
last verified 2026-07-24) — both incomplete-reconciliation siblings of the
just-made fixes: **datamodel** (1) — author-rotation clause still reads
`% players.length` while `computeNextEntry` uses `activePlayers`/`activeCount`
(the T001 fix corrected the completion half of the sentence, not the rotation
half); **infrastructure** (1) — Config Lockstep allowlist still says "`app`
alone" but `generate.ts` now has two per-channel keys (`app`,
`E2E_SEAM_ENABLED`), internally inconsistent with the artifact's own E2E-seam
section. Both cosmetic/drift, code correct. Not recorded (code-vs-code, out of
scope): `config.ts` comments describe the old single-file curation store.
**+1 open feedback**: `feedback-dismissable-cover-grace-period-96ff.md` (UX) —
the 30s cover-decoration grace period should be dismissable so a player can
skip straight to their turn [artifacts: ui]. Register unchanged (24
implemented · 1 subsumed); nothing in flight. **Next: `/ardd-plan` to sweep
the 2 defects + the feedback item into one small pass.**)_

_Updated: 2026-07-24 (**`artifact-drift-cleanup` SHIPPED (6/6, merged & reaped).**
`tasks-artifact-drift-cleanup-1467.md` executed in a delegated worktree,
fast-forward merged to `main` (`38e1bae`), worktree reaped. All six 2026-07-24
`/ardd-defects` findings resolved: **T001** datamodel laps clause → `activePlayers(room).length * laps` (8c27d9ca); **T002** infrastructure version example genericized to illustrative `MAJOR.MINOR.PATCH` (e2d1fcde); **T003** two `[OPEN:]` markers folded into settled prose — E2E `e2e/cross-browser` commit-status + `promote.yml` blocking, `x-e2e-test-signal` ratings discarded (964c79ab); **T004** ui reveal plaque documents real-name attribution (bc932879); **T005** ui gavel availability adds `decorating` (d07cfd8c); **T006** `Reveal.svelte` readiness denominator → `activePlayers(room)` with import, plus a TDD test in `Reveal.test.ts` (room of 3 with 1 kicked asserts "1 of 2") — red-first via `it.fails`, then implemented; Reveal suite 23/23 (c7f08745). `last_updated 2026-07-24` stamped on datamodel/infrastructure/ui; `diagram_status` left `current` on all three (prose-only edits not reflected in the diagrams). Register unchanged (24 implemented · 1 subsumed); 0 open feedback; nothing in flight. **DEFECTS.md still lists all six until `/ardd-defects` re-runs — next: `/ardd-defects` to re-verify the fixes cleared.**)_

_Updated: 2026-07-24 (**Plan approved + tasked: `plan-artifact-drift-cleanup`
(6 defects).** `/ardd-plan` drafted, approved, and tasked
`plan-artifact-drift-cleanup-2026-07-24-d042.md` →
`tasks-artifact-drift-cleanup-1467.md` (**ready, 0/6**), reconciling all six
2026-07-24 `/ardd-defects` findings. Phase 1 (5 docs-only artifact fixes):
datamodel laps clause → active roster (8c27d9ca); infrastructure version
example genericized so it can't re-stale (e2d1fcde); two resolved `[OPEN:]`
markers folded back (964c79ab); ui reveal plaque documents real-name
attribution (bc932879); ui gavel availability adds `decorating` (d07cfd8c).
Phase 2 (1 code fix): `Reveal.svelte` readiness denominator →
`activePlayers(room)`, with a test (c7f08745). Which-side-wins decisions: code
won all three UI-vs-artifact defects except the readiness denominator, the one
genuine code fix. All six ids recorded in the plan's `surfaced-defects:`. Note:
DEFECTS.md still lists all six until `/ardd-implement` lands the fixes and a
fresh `/ardd-defects` runs. Artifacts stable, diagrams current; register
unchanged (24 implemented · 1 subsumed); 0 open feedback; nothing in flight.
**Next: `/ardd-implement` the ready tasks file.**)_

_Updated: 2026-07-24 (**`/ardd-defects` full survey — 6 cosmetic/drift
defects, none broken.** Fresh artifact-vs-code pass (four parallel surveys).
Code and artifacts agree closely; `constitution.md` clean. Recorded in
`DEFECTS.md` (last verified 2026-07-24): **datamodel** (1) — Laps completion
clause reads `Room.players.length`, code uses `activePlayers()` in
`isBookComplete` (inert, stale wording); **infrastructure** (2) — App
Versioning example value `0.1.0` stale vs `package.json` `0.3.0`; two
`[OPEN:]` markers (E2E per-sha result policy; curation-write isolation
tagging) resolved in code but never folded back; **ui** (3) — Reveal plaque
shows real author name vs illustrative "Anonymous"; moderation gavel also
renders during `decorating` (artifact lists only lobby/writing/reveal);
play-again readiness denominator uses `room.players.length` (includes kicked)
vs the codebase's usual `activePlayers`. All cosmetic/drift — doc-side or
minor UI polish, no broken contracts, nothing never-built. The next
`/ardd-plan` will offer each as a fix task. Register unchanged (24 implemented
· 1 subsumed); 0 open feedback; nothing in flight.)_

_Updated: 2026-07-24 (**E2E flake fix SHIPPED (6/6, merged).** Branch merged to
`main` (`a4b2a98`) and reaped; feedback F001's root cause is fixed and its
tasks file completed. Decisions: (T001) turn-scoped `data-testid`s
(`submit-text`/`submit-drawing`/`submit-curated`) so the submit locator can't
rebind to a disabled button; (T002) global `actionTimeout: 15_000`; (T003)
`playIfMyTurn` swallows action TimeoutError and `driveToReveal` confirms
advance via the observer snapshot; (T004) **`retries: 0`** in CI + local (a
residual flake must now fail loudly), paired with `trace: 'retain-on-failure'`
so a failure is still diagnosable; (T005) CI e2e restructured from mixed shards
to a **per-engine matrix** (chromium/firefox/webkit/msedge run in parallel),
commit-status contract `e2e/cross-browser` preserved for promote.yml; (T006) a
test-only **client grace seam** (`graceMsFor()`) shrinks the 30s `GRACE_MS`
under the same `x-e2e-test-signal` gate, inert in normal runtime.
`infrastructure.md` gate section updated for the matrix + new seam. **Proof
pending:** next beta-deploy CI run is the real test — with `retries: 0`, any
residual webkit/msedge flake will now red the gate instead of hiding. Register
unchanged (24 implemented · 1 subsumed); 0 open feedback.)_

_Updated: 2026-07-24 (**Planned & tasked the e2e flake fix (F001).** Plan
`plan-e2e-flake-fix-2026-07-24-0428.md` **approved**; tasks
`tasks-e2e-flake-fix-8854.md` **ready, 0/6** across 4 phases: (1) scope the
`playIfMyTurn` submit to the current turn's enabled button + add a global
`actionTimeout` (the critical fix for the ambiguous-locator race), (2)
progress-verify turn play via the observer snapshot, (3) tighten CI `retries`
+ per-engine matrix, (4) optional test-only client grace seam to shrink the
30s `GRACE_MS`. F001 marked incorporated → feedback flipped to planned. Phases
1–2 resolve the flake; 3–4 are hardening/speed. Register unchanged (24
implemented · 1 subsumed); 0 open feedback. Next: `/ardd-implement`.)_

_Updated: 2026-07-24 (**Cross-browser e2e gate is GREEN, but a real
retry-masked flake was captured as feedback.** The CI e2e job was fixed
(build shared, scope Playwright to `*.spec.ts`, repair summit's skip) and now
runs the suite end-to-end against live beta — commit status recorded success,
so promote is unblocked. However, webkit (3×) and msedge (6×) flake on the
same signature ("Target closed" clicking "Present your contribution") and are
the slow shards; `retries: 1` masks it. Root cause (see
`.project/plans/research-webkit-e2e-flakes-2026-07-24.md`): a real
`Test timeout` rewritten as "Target closed", from a check-then-act race on an
ambiguous accessible name — `WritingDrawing.svelte` has three
"Present your contribution" buttons, so Playwright re-resolves to a disabled
one after the round advances and spins to the 240s timeout (no `actionTimeout`
set). Logged as **F001 in `feedback-e2e-webkit-msedge-flake` (open)** with all
5 ranked remediations for the next `/ardd-plan`. 1 open feedback.)_

_Updated: 2026-07-23 (**Confirmation-dialog work SHIPPED (5/5, merged).** A
shared `ConfirmDialog` component landed (`client/src/lib/components/`), the
Reveal unread-books warning migrated onto it behavior-preserving, and all
three destructive Moderation Panel controls — End game, Restart, **and Kick**
(dialog names the player) — are now confirmation-gated. Branch merged to `main`
(`3098784`) and reaped; `reusable-confirmation-modal-co` and
`host-control-confirmation-guar` → **implemented**, feedback F001 closed, suite
green. **Two deliberate implementation deviations from the plan/artifact
wording** (both sound, no re-plan needed): the component uses **callback props
(`onConfirm`/`onCancel`) not events** — matching the codebase's universal
callback-prop convention and Svelte 5 realities — and adds an **`ariaLabel`
prop** (defaults to heading) so the migrated Reveal warning keeps its existing
accessible name. Focus-trap open question resolved: a dependency-free
`svelte:window` Tab-cycle between the two controls, initial focus on cancel,
Escape=cancel. Register: 24 implemented · 1 subsumed; 0 backlogged/tasked, 0
open feedback. `ui.md` and `infrastructure.md` diagrams remain stale.)_

_Updated: 2026-07-23 (**Planned & tasked the confirmation-dialog work.**
`ui.md` gained a **Confirmation Dialog (shared component)** section; all three
destructive Moderation Panel controls — End game, Restart, **and Kick** — now
specify a confirmation (a plain are-you-sure, no read-state); the Reveal
unread-books warning migrates
onto the shared component with behavior unchanged, and read/not-read framing
is documented as Reveal-only. Feedback F001 marked incorporated → planned,
bound to the plan. Plan
`plan-reusable-confirmation-modal-co-2026-07-23-029e.md` **approved**; tasks
`tasks-reusable-confirmation-modal-co-9935.md` **ready, 0/5** across 3 phases
(build the component → migrate Reveal → guard the panel; Phases 2 & 3 parallel
after Phase 1). Both `reusable-confirmation-modal-co` and
`host-control-confirmation-guar` → tasked. Register: 2 tasked · 22 implemented
· 1 subsumed; 0 open feedback. `ui.md` and `infrastructure.md` diagrams both
stale. Next: `/ardd-implement`.)_

_Updated: 2026-07-23 (**Cross-browser e2e test gate SHIPPED to beta (13/13,
merged).** The delegated worktree completed all 13 tasks; branch merged to
`main` (`adcc105`) and reaped, feature `cross-browser-e2e-game-flow-te` →
**implemented**, tasks file → completed. Delivered: Playwright suite
(chromium/firefox/webkit/msedge), a socket.io observer that asserts exact
`DrawOps`, test-only seams (an `x-e2e-test-signal` header gated by
`E2E_TEST_SIGNAL_SECRET`, curation-discard for tagged traffic, a timer seam),
a settings matrix, a beta-deploy CI job recording a per-sha GitHub commit
status (`e2e/cross-browser`), and a `promote.yml` gate that **blocks on
red-or-missing**. `E2E_SEAM_ENABLED` added as a second per-channel fly key
(beta true / prod false) via the generated template.
**TWO CAVEATS carried forward (not yet resolved):** (1) only chromium ran to
green locally — firefox/webkit/msedge specs are written but were exercised
only in principle; CI is their first real run. (2) **A one-time manual step is
REQUIRED before the gate protects curation**: set `E2E_TEST_SIGNAL_SECRET` as
BOTH a Fly secret on `exquisite-telephone-beta` and a matching GitHub Actions
repo secret — until then, test ratings would write to beta's real Curation
Store while specs still pass green (false confidence). Register: 2 backlogged ·
22 implemented · 1 subsumed; 1 open feedback. `infrastructure.md` diagram
remains stale.)_

_Updated: 2026-07-23 (**Logged host-control-confirmation feedback + backlogged
two features; e2e suite implementation in flight.** Feedback F001
(`feedback-host-control-confirmations`, **open**): the moderation panel's
destructive host controls (End game / Restart / Kick) fire with no
confirmation, unlike the Reveal page's read-state-aware guard. Backlogged
`reusable-confirmation-modal-co` (one reusable confirm dialog, customizable
text, replacing today's hand-rolled inline modals) and
`host-control-confirmation-guar` (extend confirmation to all destructive host
controls; read/not-read state surfaced only in the reveal case). Register: 2
backlogged · 1 tasked · 21 implemented · 1 subsumed; 1 open feedback. **In
flight:** the `cross-browser-e2e-game-flow-te` tasks
(`tasks-cross-browser-e2e-game-flow-te-3d40.md`) are being implemented in a
delegated worktree — 3/13 at last check; on completion it auto-merges to main
(merge_policy: auto), reaps, and re-runs status. `infrastructure.md` diagram
remains stale (`/ardd-diagram infrastructure`).)_

_Updated: 2026-07-23 (**Planned & tasked `cross-browser-e2e-game-flow-te`.**
A Playwright cross-browser e2e suite (Chromium/Firefox/WebKit/msedge) for the
main game flow, wired as a **beta-deploy job** (gated by the existing
code-change `changes` signal — fix/feat runs the full suite, docs/chore runs
nothing) that records a per-commit result, which `promote.yml` reads to gate
prod (red-or-missing blocks). Design landed in `infrastructure.md` (new
End-to-End Test Gate section; two bounded `[OPEN:]` items — the curation
test-tag mechanism and per-sha result storage/missing-result policy — both
scoped to implementation, artifact kept `stable`). Plan
`plan-cross-browser-e2e-game-flow-te-2026-07-23-cbcb.md` **approved**; tasks
`tasks-cross-browser-e2e-game-flow-te-3d40.md` **ready, 0/13** across 5
phases. Register now: 1 tasked · 21 implemented · 1 subsumed. `infrastructure.md`
diagram is now **stale** (run `/ardd-diagram infrastructure`). Next: run the
tasks with `/ardd-implement`.)_

_Updated: 2026-07-23 (**Backlogged `cross-browser-e2e-game-flow-te`** — an
end-to-end suite covering the main game flow (lobby → write/draw → reveal)
across Firefox, Safari, Chrome, and Edge, meant to run against beta as a
promote gate before prod. Register now: 1 backlogged · 21 implemented · 1
subsumed. Everything else unchanged and clean — four stable artifacts,
diagrams current, 0 defects, 0 open feedback, nothing in flight. Plan it with
`/ardd-plan cross-browser-e2e-game-flow-te` when ready.)_

_Updated: 2026-07-23 (**ArDD install updated: v1.0.5-beta.1 → v1.1.1-beta.3**
(source `c0386d3` → `9bc9b38`, beta channel). All skills reinstalled, no
migrations pending, README badge already present. Project state is otherwise
unchanged from the block below and fully clean: four stable artifacts, all
diagrams current, no open placeholders, 0 recorded defects, 0 open feedback,
nothing in flight, no orphaned completion flips, and every feature
implemented/subsumed. `up-to-date` — no further ArDD update available.)_

_Updated: 2026-07-23 (**Boudoir Damask redesign shipped to beta.** The app was
re-skinned from the light butter/marigold theme to Boudoir Damask: a deep
bordeaux ground hung with a gold fleur-de-lis damask, champagne placards and
gilt frames floating on it, sapphire as the interactive accent. Every on-ground
text spot was framed on a new `.plaque` surface (verified end-to-end in a live
2-player walkthrough). The splash title moved to Pirata One (self-hosted,
gold-gradient, no outline). Finally the palette tokens were renamed to their
colours (`butter`→`champagne`, `marigold`→`gold`, `bubblegum`→`sapphire`,
`velvet`→`wine`, `grass`→`emerald`; `ink`/`bordeaux` kept), and `ui.md`'s Visual
Identity rewritten to match. Suite green (227 client), typecheck + lint clean.

All of this is on `main` → **beta only**. **Prod is still on `v0.2.2`, the old
light theme** — a prod promote is deliberately held pending sign-off. Backlog,
feedback, and work queue are all empty.)_

## Artifacts Found

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| ui.md | stable ✅ | — |

No `[OPEN: ...]` items outstanding.

## Cross-Artifact Issues

None. The redesign is a UI-only restyle: `ui.md` Visual Identity was rewritten
for it; `datamodel.md` and `infrastructure.md` are unaffected and consistent.

## Constitution Compliance

No violations. (Prod running an older theme than beta is normal dual-channel
deploy lag, not a production shortcut — no annotation owed.)

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — current ✅ (the redesign restyled existing components and added a CSS
  `.plaque` utility; the structure-only component diagram is unchanged)

## Code-vs-Artifact Defects

- 0 defects — DEFECTS.md verified 2026-07-22. Artifacts match the code.

## Feedback

- No open feedback.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 21 implemented · 1 subsumed — see
  `.project/features/`. Backlog empty.

## In Flight

Nothing in flight — no worktrees, no ready or in-progress tasks files.

## Deployment

- **Prod:** `v0.2.2` at `ex-tel.ty-pe.com` — still the **old light theme**
  (the Boudoir redesign has not been promoted).
- **Beta:** current `main` at `beta-ex-tel.ty-pe.com` — the full Boudoir Damask
  redesign + Pirata One title + token name-sweep.

## Tooling

- ArDD update available: installed `c0386d3`, source at `v1.1.1-beta.3` (beta
  channel) — run /ardd-update.

## Summary

0 issues found. The project is at a clean rest; the redesign is complete and
verified on beta. Recommended next step: **promote to prod when you're ready to
ship the redesign** (currently held per your instruction). Optional tooling:
`/ardd-update` to pull the available ArDD release.
