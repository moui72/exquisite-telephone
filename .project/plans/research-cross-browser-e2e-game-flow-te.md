# Research: cross-browser e2e game-flow test suite (`cross-browser-e2e-game-flow-te`)

Date: 2026-07-23. Research only — no code changed, no dependencies added.

## Summary

- **No e2e harness exists today.** The repo is vitest-only (root `package.json` scripts; per-package `vitest.config.ts`; client unit tests run under jsdom, see `client/src/lib/components/DrawingCanvas.svelte:159-165`). Playwright would be a new root-level dev dependency and a new `e2e/` (or `tests/e2e/`) area.
- **Q1 (4 browsers, 1 per player, one test): achievable in the honest form** — one test that manually launches `firefox`, `webkit`, bundled `chromium`, and `chromium` with `channel: 'msedge'`. That is 4 distinct browser *binaries* but only 3 *engines*; "Safari" is Playwright's WebKit build, not Safari proper. Recommended as one flagship test, alongside a conventional per-browser project matrix for everything else.
- **Q2 (settings parametrization): generate tests from a typed settings matrix** (loop over a `const` array calling `test(...)`), driven through a shared "game fixture" that applies settings via the Lobby's stable element ids.
- **Q3 (canvas assertion): assert the vector stroke data, not pixels.** Drawings are stored as serialized `DrawOps` JSON (`shared/src/strokeData.ts:29-41`), and the server broadcasts the full `Room` (including every `Entry.content`) to every player on `roomUpdated` (`server/src/socket/handlers.ts:118` et al.) — so a plain Node `socket.io-client` joined to the room as a player gives the test process direct, browser-independent access to the exact submitted draw ops. Pixel snapshots only as an optional per-browser smoke check.
- **Q4 (parallelism/sharding): the room is the isolation boundary.** Rooms live in an in-memory `Map` keyed by unique generated code (`server/src/domain/roomStore.ts:16-31`) and share nothing with each other except the persisted curation file. Every test creating its own room via the UI makes the suite `fullyParallel`-safe against a single shared server (including the beta deploy), and Playwright's `--shard=i/n` composes trivially on top.

## How the game flow / drawing works (grounding)

**Flow & views.** The client is a single-page Svelte app with no router; `client/src/App.svelte:61-79` switches on `Room.status` (`'lobby' | 'writing' | 'decorating' | 'reveal' | 'ended'`, `shared/src/types.ts:17`) between `Lobby.svelte`, `WritingDrawing.svelte`, `DecorationWindow.svelte`, and `Reveal.svelte`. A game is: create/join in the Lobby → host starts → alternating write/draw turns → a 2-minute cover-decoration window → reveal.

**Socket contract.** All state changes go over Socket.IO with ack callbacks. The full event surface is registered in `server/src/socket/server.ts:84-191`: `createRoom`, `joinRoom`, `startGame`, `submitEntry`, `submitCover`, `rejoin`, `playAgain`, lobby-setting events, moderation, etc. After every mutation the handler broadcasts the **entire authoritative `Room`** to the room: `socket.to(input.roomId).emit('roomUpdated', { room })` (`server/src/socket/handlers.ts:118`, `:177`, `:218`, …). The client's session store consumes `roomUpdated`/`roomChanged` (`client/src/lib/stores/session.ts:105-113`) and persists a `sessionToken` in **localStorage** for auto-rejoin (`client/src/lib/stores/session.ts:28-52`, rejoin emit at `:151`).

**Server state.** One Node process, one in-memory `RoomStore` (`server/src/domain/roomStore.ts:16-24`); no database. Entry point wiring: `server/src/index.ts:11-27`; port from `PORT` env, default 3000 (`server/src/config.ts:30-36`). The only durable state is the curation JSON file (`server/src/config.ts:16`, `server/src/index.ts:20`).

**Drawing.** `client/src/lib/components/DrawingCanvas.svelte` is a fixed `320×240` canvas (`:248-256`) listening to **pointer events** registered in `onMount` (`:173-177`). A pointerdown→move→up sequence accumulates canvas-local points (scaled from the element's bounding rect, `:70-78`) and on pointerup appends a `StrokeOp { points, color, width }` via `onOpsChange` (`:135-144`). The fill tool appends a `FillOp` re-run at replay time (`:111-117`; algorithm in `client/src/lib/drawing/floodFill.ts`). The drawing is therefore **vector data end-to-end**: `WritingDrawing.svelte:192` submits `serializeDrawOps(drawnOps)` as `Entry.content`; the next player's reference view replays it with `parseDrawOps` (`WritingDrawing.svelte:322`); types in `shared/src/strokeData.ts` (`StrokeOp` `:11-16`, `FillOp` `:23-27`, `serializeDrawOps`/`parseDrawOps` `:39-54`). Rasterization happens only at export.

**Host lobby settings** (`client/src/lib/views/Lobby.svelte`), each with a stable element id:
- Monochrome toggle — `#monochrome-toggle` (`:262`)
- Turn timer — `#turn-timer-select` (`:282`), values Off/15/30/60/240/720 min (`:55-62`)
- Laps per book — `#laps-per-book-select` (`:303`), 1|2|3 (`:75-79`)
- Prompt mode — `#prompt-mode-select` (`:325`), free-form|curated (`:100-106`)
- Curated hand size — `#curated-prompt-count-select` (`:346`), 2–5, curated only
- Write-in toggle — `#allow-prompt-write-in-toggle` (`:365`)
- Small-game acknowledgement checkbox required below 3 players (`:377-388`), Start button `Commence the Exhibition` (`:390-400`).

**Existing tests:** vitest unit tests everywhere (`*.test.ts` beside sources); no Playwright, no e2e config anywhere (`grep -ri playwright` finds nothing outside node_modules).

## Q1 — One test driving 4 browsers, one per player

**Yes, with an honest asterisk.** Playwright's test runner normally applies one browser per *project* (the matrix model: every test re-runs per browser). But nothing stops a single test from launching browsers imperatively: `import { test, chromium, firefox, webkit } from '@playwright/test'` and inside the test call `firefox.launch()`, `webkit.launch()`, `chromium.launch()`, and `chromium.launch({ channel: 'msedge' })`, creating one context+page per player. Multiple simultaneous pages/contexts in one test is an explicitly supported Playwright pattern (its multi-page/multi-user docs); mixing `browserType`s in one test is just the same thing with manual launches instead of the built-in `browser` fixture.

The honest version of "Firefox, Safari, Chrome, Edge":
- **Firefox** — Playwright's bundled Firefox build. Real Gecko.
- **"Safari"** — Playwright's **WebKit** build. Same engine family as Safari but *not* Safari: no Safari UI layer, and on Linux CI it's WebKit-GTK, which can differ from macOS Safari in fonts/rendering details. Running the WebKit project on a macOS runner is the closest approximation; actual Safari cannot be driven by Playwright.
- **"Chrome" / "Edge"** — both Chromium. `channel: 'chrome'` / `channel: 'msedge'` launch the real branded binaries (installable in CI via `npx playwright install msedge chrome`), which is meaningfully "real Edge/Chrome" at the binary level but the same engine. Chromium-vs-Edge divergence in canvas/socket behavior is close to nil; the value of the Edge slot is mostly binary/branding coverage.

So: 4 distinct browser installations, 3 distinct engines. Say that plainly in the suite docs.

**Trade-offs of the one-test-4-browsers model:** manual launches bypass per-project fixtures (tracing, video, `use` options must be wired by hand or via a custom fixture); a failure report attributes to one test, not per-browser; and the test is heavyweight (4 browser processes ≈ 1.5–2 GB RSS). The matrix model (each test re-runs per browser, all players in one engine) gives better failure attribution and retry granularity but never exercises *mixed-engine interop* — e.g. a Firefox-drawn stroke replayed on a WebKit peer's canvas — which is precisely what this feature is for.

**Recommendation:** hybrid. One flagship "summit" spec — a full game with 4 players, one per browser (firefox / webkit / chromium / chromium-msedge), built on a custom fixture that launches and disposes all four — as the cross-engine interop gate. Everything else (the settings matrix, Q2) runs in the conventional `projects` matrix (`chromium`, `firefox`, `webkit`, plus a `msedge` channel project if desired) with all players of a test sharing one engine. Verify at implementation time: exact import path for `browserType` objects from `@playwright/test` (stable for years, but confirm against the pinned version) and channel availability on the chosen CI image.

## Q2 — Parametrizing lobby settings

Playwright has no `test.each`, but generating tests in a loop at collection time is the documented pattern:

```ts
const SETTINGS_MATRIX: GameSettings[] = [ /* named combos */ ];
for (const s of SETTINGS_MATRIX) {
  test(`full game — ${s.name}`, async ({ game }) => { … });
}
```

Each generated test is a first-class test (parallel-safe, shardable, individually retryable/reportable), and the matrix multiplies naturally with the browser `projects` matrix.

**Recommended structure:**
1. A typed `GameSettings` object mirroring the `Room` fields (`monochromeOnly`, `turnTimerMinutes`, `lapsPerBook`, `promptMode`, `curatedPromptCount`, `allowPromptWriteIn`, `playerCount` — `shared/src/types.ts:126-163`).
2. A custom fixture (`test.extend`) that owns the whole multi-client setup: create contexts/pages for N players, host creates the room, extracts the room code from the lobby (`Lobby.svelte:208` renders it), other players join, host applies settings by driving the ids listed in the grounding section, then starts. Tests receive `{ pages, roomCode, settings }`.
3. **Curate the matrix; don't cross-product.** Full cross product is 2×6×3×2×4×2 ≈ 576 combos × 4 browsers — pointless. Pick ~6–10 named combos covering each axis at least once plus the interesting interactions (curated+no-write-in, monochrome+1-lap, 2-player small-game override which exercises the acknowledgement checkbox at `Lobby.svelte:383`).
4. **The turn-timer axis is set-and-assert only.** The minimum timer is 15 minutes (`Lobby.svelte:57`); no e2e test can wait for expiry, and there is no test hook to shrink it. Assert the setting round-trips (select → `roomUpdated` → countdown UI renders via `TurnStatus`), and leave timeout-vote behavior to the existing server unit tests (`server/src/domain/timerSweep.test.ts`, `server/src/socket/handlers.test.ts`). If timer-expiry e2e is ever wanted, it needs a server-side test seam (e.g. env-gated second-scale timer values) — an app change, out of scope here.
5. Playwright *project*-level parametrization (option fixtures per project) is the alternative; it fits when a whole run should use one combo. Here settings vary per test, so loop-generated tests are the better fit.

## Q3 — Drawing on the canvas and asserting the result

### (a) Driving deterministic strokes — works
`page.mouse.down/move/up` synthesizes trusted input that real browsers translate into the pointer events the canvas listens for (`DrawingCanvas.svelte:173-177`). Recipe: `const box = await canvas.boundingBox()`, compute targets in canvas coordinates via the inverse of `toPoint`'s scaling (`:70-78` — canvas is 320×240 logical; CSS may scale it), then `mouse.move(start) → mouse.down() → mouse.move(end, { steps: 10 }) → mouse.up()`. Two caveats: stay **inside** the canvas rect (pointerleave commits the stroke early, `:177`), and expect **per-browser point counts** — pointermove frequency/coalescing differs across engines and `steps` only sets a lower bound on Chromium-style delivery. So a "deterministic" stroke is deterministic in endpoints, color, width, and op count — not in its exact point array. Tool selection (palette buttons `aria-label="Color …"` `:207`, width buttons `:216-229`, `Fill tool` button `:231-241`) is ordinary clicking.

### (b) Asserting the app's own stroke data — the robust path, and this app makes it easy
The submitted drawing is pure vector JSON: `WritingDrawing.svelte:192` sends `serializeDrawOps(drawnOps)` as `Entry.content`, and the server stores it verbatim and broadcasts the **full room, entries included**, on every `roomUpdated` (`handlers.ts:118` etc.; `Entry.content` documented as serialized vector data at `shared/src/types.ts:33-37`).

Two ways for the test to read it:

- **Node-side observer socket (recommended).** The test process opens its own `socket.io-client` connection (the server package already depends on socket.io; the test would use `socket.io-client` directly) and performs `joinRoom` as a real extra player before the game starts (join is lobby-only, `Lobby` error copy `room-not-in-lobby` at `Lobby.svelte:30`). From then on it receives every `roomUpdated { room }` and can await the drawing entry, `parseDrawOps` it (imported from `@exquisite-telephone/shared` — the exact production parser), and assert: op count, `type: 'stroke'`, `color` equals the palette hex clicked (`DrawingCanvas.svelte:10-20`), `width` equals the preset (`:23-27`), first/last points within a small tolerance of the intended endpoints, and fill ops' seed point/color. This is engine-independent, pixel-free, and immune to antialiasing. One wrinkle: the observer is a *player*, so it occupies a turn slot — either script its turns via `submitEntry` over the same socket (trivial: the payload shape is `SubmitEntryPayload`, `shared/src/types.ts:291-305`), or accept it as a 5th scripted player. That also doubles as a load-bearing tool for Q1's summit test (fast state assertions between UI steps).
- **In-page evaluation** is *not* currently possible cleanly: the session store isn't exposed on `window` (`client/src/main.ts` mounts the app; no test hook), and the DOM never carries the ops — the peer's reference view replays them straight onto canvas (`WritingDrawing.svelte:322`). Don't add an app seam when the socket path needs none.

### (c) Pixel/screenshot comparison — fallback only
`expect(locator).toHaveScreenshot()` on the read-only replay canvas works but needs per-browser (and per-OS) baseline images, tolerance tuning for antialiasing, and breaks on any palette/stroke-rendering tweak. The flood-fill op is replayed by re-running the algorithm against the rendered raster (`strokeData.ts:19-27`, `DrawingCanvas.svelte:88-93`), so fill results are especially sensitive to sub-pixel rendering differences between engines. Use at most one screenshot smoke test per browser ("a drawn stroke is visibly on the peer's canvas"), possibly replaced by a cheaper in-page `getImageData` spot check ("some non-white pixel near (x,y)") which avoids baseline management entirely.

**Recommendation:** drive strokes with `page.mouse` (a); assert via the `DrawOps` data model over a Node observer socket (b) as the primary assertion; keep (c) to a single loose visibility check per browser, if at all.

## Q4 — Suite structure, parallelism, and arbitrary sharding

**The isolation boundary is the Room.** All game state lives in `RoomStore.rooms: Map<string, Room>` (`server/src/domain/roomStore.ts:16-24`); room codes are generated collision-free (`generateUniqueRoomCode`, `:26-31`, backed by `roomCode.ts`), and no handler touches any room but the one named in its payload. Broadcasts are scoped `socket.to(input.roomId)` (`handlers.ts:118`). Session tokens are per-player UUIDs in a separate store (`server/src/domain/sessionTokenStore.ts`). Therefore N tests each creating their own room via the UI cannot collide on one shared server — which is exactly the deployment model the feature wants (run against the beta deploy as a promote gate).

Two shared-state caveats on that single server:
1. **Curation Store** (`server/src/index.ts:20`, one JSON file): tests that thumbs-up/down prompts (`SubmitEntryPayload.rating`, `shared/src/types.ts:304`) write persistent, aggregated counts. Against beta this pollutes real curation data — e2e tests should simply never click the rating buttons, or the beta app should run with a scratch `CURATION_DATA_PATH`. Flag this in the plan.
2. **Timer sweep** (`server/src/index.ts:23`) is global but only acts on rooms with expired timers — no cross-test effect given Q2's set-and-assert timer stance.

**Playwright-side structure:**
- `fullyParallel: true`; every test fully self-contained: creates its own contexts, its own room, and never reads module-level mutable state. No `test.describe.serial`, no shared storageState.
- **One context per player, always.** The session token lives in localStorage (`session.ts:28-41`) and auto-rejoin fires on connect (`:145-151`) — two players in one context would steal each other's identity. Playwright contexts have isolated storage, so this falls out naturally; just never model players as tabs of one context.
- **Server target:** for the beta-gate run, `baseURL` = the beta app URL; one shared server, per-test rooms (per the above). For local/CI-standalone runs, either (i) a single locally built server started once via Playwright's `webServer` option (same isolation argument applies — simplest, recommended), or (ii) a worker-scoped fixture that spawns one server per worker on a unique port (`PORT` env, `server/src/config.ts:31-32`; pass `CURATION_DATA_PATH` into a temp dir). (ii) buys nothing given room isolation, so prefer (i) unless a test must mutate global server state.
- **Sharding:** `npx playwright test --shard=i/n` partitions tests (by file, or finer with `fullyParallel`) with no coordination between shards. Since every test is room-isolated and shards share only the stateless-per-room beta server, any N works — CI can fan out an arbitrary shard count and merge blob reports (`--reporter=blob` + `merge-reports`). Nothing in this app constrains N.
- **Reconciling with Q1's summit test:** a 4-browser test is ~4× a normal test's footprint but is still just *one test in one worker* — it parallelizes and shards like any other. Practical guardrails: put summit specs in their own project so `workers` can be capped for that project (or rely on CI runner sizing); the settings-matrix tests (2–3 same-engine contexts each) are the bulk of the suite and parallelize cheaply. Worker count is a resource knob, not a correctness one — correctness comes from room isolation.

## Recommended approach & open questions

**Approach:**
1. Add Playwright at the repo root (`@playwright/test`, plus `socket.io-client` as an e2e dev dep) with an `e2e/` directory; no app-code changes required — the socket contract and Lobby element ids are sufficient seams.
2. Build a `game` fixture: N player contexts + a Node observer socket; host creates room, peers join by code, settings applied via Lobby ids, `startGame`.
3. One flagship mixed-engine spec: 4 players on firefox/webkit/chromium/chromium-`msedge` launched inside the test, full flow lobby → write → draw (mouse strokes) → decorating (submit cover or let window logic close) → reveal, with `DrawOps` assertions via the observer.
4. A curated settings matrix (~6–10 combos) of loop-generated single-engine tests run across the standard browser `projects`; drawing assertions data-first.
5. `fullyParallel`, blob reporter, CI fan-out with `--shard`; beta URL as `baseURL` for the promote gate.

**Open questions / to verify at implementation time:**
- Confirm mixed `browserType.launch()` inside one `@playwright/test` test against the pinned Playwright version (long-standing pattern, but verify import surface and that manual launches coexist with the runner's fixtures/tracing as expected).
- CI runner OS: WebKit-on-Linux vs a macOS runner for closer Safari fidelity; `msedge`/`chrome` channel installation on the chosen image.
- Decoration window: full-flow tests must submit covers from all players to trigger the early close (`Room.coverSubmissions`, `shared/src/types.ts:231-238`; close logic around `handlers.ts:866`) — otherwise the test waits ~2 minutes. Verify the all-submitted early close fires as expected e2e.
- Curation-data pollution on beta (ratings): decide between "tests never rate" convention vs a scratch `CURATION_DATA_PATH` on the beta app.
- Timer-expiry coverage: accept the set-and-assert limitation, or backlog a server test seam for second-scale timers.
- Whether the beta promote gate should also run the summit spec or only the (cheaper, better-attributed) matrix.
