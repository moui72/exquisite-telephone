---
plan: plan-main-2026-07-13-4bd4.md
generated: 2026-07-13
status: in-progress
---

# Tasks

## Phase 0: Scaffolding
- [x] T001 [artifacts: constitution] Initialize the Node/TypeScript project: `package.json`, `tsconfig.json`, ESLint + Prettier config, a test runner (e.g. Vitest). Manifest scripts must match what's actually runnable (Manifest/Script Hygiene).
- [x] T002 [artifacts: constitution] [parallel] Scaffold the Svelte + Tailwind client app (Vite + svelte-check). No page content yet beyond a placeholder route.
- [x] T003 [artifacts: constitution] Add a pre-commit hook running lint, type-check, and tests in that order (Pre-commit Enforcement), and a CI workflow running the same checks on push/PR, gating merge (CI Enforcement).

## Phase 1: Core data model & room lifecycle
- [x] T004 [artifacts: datamodel] Write a failing test asserting the shape and required fields of `Room`, `Player`, `Book`, `Entry` as defined in datamodel.md, then define them as named, exported TypeScript types (Principle VII) to make it pass (Test-First Development).
- [x] T005 [artifacts: infrastructure, datamodel] Implement the server-side in-memory room store (create room with a short unambiguous code, add/remove player, look up by `Room.id`), test-first: a failing test for "create room returns a valid unique code" and "player join adds to room.players", then the implementation.
- [x] T006 [artifacts: infrastructure] Bootstrap the Socket.IO server bound to the room store, with `onJoinRoom`/`onCreateRoom` as independently named handlers (Dispatch Surfaces Decomposed by Concern), test-first via a Socket.IO client-side test harness.
- [x] T007 [artifacts: infrastructure, constitution] Entry point (`server/index.ts`) only reads config, constructs the room store and Socket.IO server, and starts listening — no game logic inline (Bootstrap/Entry Files Wire Dependencies Only).
- [x] T008 [artifacts: ui] [parallel] Build the Lobby view: create/join by code, host-only "start game" control, live player list bound to server state via a single Svelte store (Principle VI). Mobile-friendly layout (Principle II), baseline accessibility (labeled inputs, tab order).

## Phase 2: Game loop
- [x] T009 [artifacts: datamodel, infrastructure] Implement turn advancement logic server-side: given a `Room`, compute the next `Entry` (author, type, position) per player per book, test-first against a multi-player round-robin scenario.
- [x] T010 [artifacts: infrastructure] Add `onSubmitEntry` handler (text or drawing-stroke payload), validating `Entry.position` sequencing (datamodel Normalization Rules), broadcasting updated room state.
- [x] T011 [artifacts: ui] [parallel] Build the Writing/Drawing view: text-entry prompt or canvas depending on current `Entry.type`, pointer-event-based drawing captured as stroke data (not raster), with listeners registered/torn down across Svelte lifecycle hooks (touch cleanup quality standard). State performance budget for stroke-sync latency.
- [x] T012 [artifacts: ui] Turn-status indicator showing who's still working without revealing content.

## Phase 3: Reconnect tolerance
- [x] T013 [artifacts: infrastructure] Implement the session-token store: issue a token on join, map token -> player/room, TTL of a few minutes, test-first for "valid token within TTL resumes same seat" and "expired token is treated as a new join."
- [x] T014 [artifacts: infrastructure, datamodel] Implement rejoin-after-room-ended rejection: a valid token against an ended room returns a clear "game has ended" response rather than silently no-oping, test-first.
- [ ] T015 [artifacts: ui] [parallel] Add "reconnecting..." UI state (distinct from a hard error) and "this game has ended" state, per ui.md States.
- [ ] T016 [artifacts: infrastructure, constitution] Add structured log events for room creation, join/leave/reconnect, turn advance, and game completion (Observability), including outcome and reproducible identifiers.

## Phase 4: Reveal & export
- [ ] T017 [artifacts: datamodel, ui] Build the Reveal view: render each `Book`'s full ordered chain of entries once `Room.status == 'reveal'`.
- [ ] T018 [artifacts: infrastructure] Implement the client-side PNG export pipeline: replay a book's stroke-data drawing entries onto an off-screen canvas, composite with rendered text captions, flatten to a single PNG, test-first against a fixture book with known entries.
- [ ] T019 [artifacts: ui] [parallel] Add the per-book save control in the Reveal view wired to the export pipeline.
