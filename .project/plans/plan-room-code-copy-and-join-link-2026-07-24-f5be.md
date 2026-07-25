---
status: approved
branch: room-code-copy-and-join-link
created: 2026-07-24
features: [room-code-copy-and-join-link]
surfaced-defects: []
---

# Plan — Click-to-copy room code with a copy-join-link context menu

## Goal

Make the displayed room code click-to-copy with a "copied" confirmation, add
a context menu offering a shareable join link, and have the Foyer pre-fill the
join form from that link's `room` URL parameter — all client-side.

## Scope

**In scope**

- **Click-to-copy** on the Lobby waiting-room room-code display: clicking or
  tapping copies the bare code to the clipboard with a brief "copied"
  confirmation. Feature: room-code-copy-and-join-link.
- **Context menu** on the room code (right-click on pointer devices,
  long-press on touch) with a **"copy join link"** option that copies
  `<app-origin>/?room=<code>`.
- **Foyer join-link pre-fill**: on app load, if a `room` URL query parameter
  is present, the Foyer selects the join tab and pre-fills the room-code
  field (never auto-joins).

**Out of scope** — no datamodel, infrastructure, api, or server change: the
join link is a URL to the same SPA and joining uses the existing
`session.joinRoom()` path. The open monochrome feedback
(`feedback-monochrome-as-palette-option-e4ce.md`) is unrelated and left
`open` for its own plan. Whether the Salon Footer's "Salon No. \<code\>" also
becomes interactive is an open question below, not committed here.

## Technical Approach

The room code renders in `client/src/lib/views/Lobby.svelte` (waiting-room
guest-list card, `data-testid="room-code"`) and, on every view, in
`SalonFooter.svelte`. Copy uses the async Clipboard API with a short-lived
"copied" state on the element; the join link is built from
`window.location.origin` plus `?room=<code>`. The context menu is a small
custom overlay (native `contextmenu` for right-click, a long-press timer for
touch) rather than the browser's default menu, so the single "copy join link"
action is presentable and touch-reachable — kept minimal per constitution
Principle I. Foyer pre-fill reads the `room` param from the URL on load and
seeds the existing join form (`mode = 'join'`, `roomCodeInput = <code>`);
joining is unchanged. No URL-param reading exists in the app today, so this
introduces the first read of `window.location` query state.

## Phase Breakdown

_Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file._

**Phase 1 — Click-to-copy room code** (no dependency)
- Make the Lobby room-code display copy the bare code to the clipboard on
  click/tap, with a brief "copied" confirmation cue. [feature:
  room-code-copy-and-join-link] [artifacts: ui]

**Phase 2 — Copy-join-link context menu** (depends: Phase 1 copy plumbing)
- Add a context menu on the room code (right-click / long-press) with a
  "copy join link" action that copies `<app-origin>/?room=<code>`, reusing
  the Phase 1 clipboard helper. [feature: room-code-copy-and-join-link]
  [artifacts: ui]

**Phase 3 — Foyer join-link pre-fill** (independent of Phases 1–2)
- On app load, read a `room` URL query parameter; when present, select the
  Foyer join tab and pre-fill the room-code field with its value (no
  auto-join). [feature: room-code-copy-and-join-link] [artifacts: ui]

## Complexity Tracking

| Deviation | Justification |
|---|---|
| Small custom context-menu overlay | The browser's native context menu can't host an app action; a minimal custom overlay (one action, right-click + long-press) is the least mechanism that delivers the touch-reachable "copy join link" — no menu library or new abstraction beyond it. |

## Open Questions

- **Footer interactivity.** Whether the Salon Footer's persistent "Salon No.
  \<code\>" also gets click-to-copy / the context menu, or the interaction
  stays only on the prominent Lobby display — decided in Phase 1. Default:
  Lobby display only.
- **Copied-confirmation style.** Inline cue on the element (e.g. a transient
  "copied" label / checkmark) vs. a toast — pinned during Phase 1;
  lean inline to avoid introducing a toast system.
- **URL param hygiene.** Whether to strip the `room` param from the address
  bar after reading it (so a later manual share of the current URL doesn't
  leak a stale code) — decided in Phase 3.
- **Long-press threshold.** The touch long-press duration that opens the
  context menu without interfering with tap-to-copy — pinned during Phase 2.

## Production Annotation Summary

- No production shortcut is introduced by this plan. If Clipboard API
  availability requires a fallback path (older/insecure-context browsers),
  annotate that fallback under [[ui]]'s `## Production Annotations` at
  implementation time per the constitution.
