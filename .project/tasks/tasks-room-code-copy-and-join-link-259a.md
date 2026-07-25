---
plan: plan-room-code-copy-and-join-link-2026-07-24-f5be.md
generated: 2026-07-24
status: ready
---

# Tasks

## Phase 1: Click-to-copy room code

- [ ] T001 [artifacts: ui] Make the Lobby waiting-room room-code display (`client/src/lib/views/Lobby.svelte`, the `data-testid="room-code"` element showing `state.room.id`) click-to-copy: on click/tap, write the bare code to the clipboard via the async Clipboard API and show a brief inline "copied" confirmation cue on the element (lean inline, not a toast — no toast system exists; pin this here). Factor the clipboard write into a small reusable helper (e.g. `client/src/lib/clipboard.ts`) so Phase 2 can reuse it. Decide the footer open question: default to Lobby display only (leave `SalonFooter.svelte` unchanged). Write failing tests first (TDD, constitution Principle III) in `Lobby.test.ts` asserting a click copies the code and surfaces the confirmation cue (mock the Clipboard API), then implement. Feature: room-code-copy-and-join-link.

- [ ] T002 [artifacts: ui] Add a test for the clipboard helper created in T001 — a focused unit test (e.g. `client/src/lib/clipboard.test.ts`) covering a successful copy and a rejected/absent-Clipboard-API path (so callers can rely on it). Since the helper already exists from T001, write this as a direct unit test of that helper (no red-first ceremony needed for pre-existing code). Feature: room-code-copy-and-join-link.

## Phase 2: Copy-join-link context menu

- [ ] T003 [artifacts: ui] Add a context menu on the Lobby room-code element with a single "copy join link" action that copies `\`${window.location.origin}/?room=${code}\`` using the T001 clipboard helper. Open the menu via the native `contextmenu` event on pointer devices and a long-press timer on touch (pin a long-press threshold, e.g. ~500ms, that doesn't interfere with tap-to-copy from T001). Implement it as a minimal custom overlay (one action) — dismiss on outside click / Escape. Write failing `Lobby.test.ts` cases first (right-click opens the menu; selecting "copy join link" copies the origin-based URL with the room code; outside-click/Escape dismisses), then implement. Feature: room-code-copy-and-join-link.

## Phase 3: Foyer join-link pre-fill

- [ ] T004 [artifacts: ui] On app load, read a `room` URL query parameter (`URLSearchParams` over `window.location.search`); when present and non-empty, the Foyer selects the join tab (`mode = 'join'`) and pre-fills the room-code field (`roomCodeInput`) with the value — never auto-joining. Decide the URL-param-hygiene open question and implement accordingly (default: strip the `room` param from the address bar via `history.replaceState` after seeding, so a later manual share of the current URL doesn't leak a stale code). Wire the read at the appropriate load point (`Lobby.svelte` init or `App.svelte`). Write failing tests first (`Lobby.test.ts`): with `?room=ABCD` present the join tab is active and the field pre-filled; with no param the Foyer behaves as today. Then implement. Feature: room-code-copy-and-join-link.
