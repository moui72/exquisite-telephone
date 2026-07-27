---
status: planned
created: 2026-07-27
plan: plan-lobby-join-link-chip-and-menu-2026-07-27-ba69.md
---

# Feedback

## Reconsidered
- [x] F001 In the Lobby (Guest List) view, display the join link as its own click-to-copy chip in smaller text under the room code — not only reachable via the context menu. Reverses the ui.md decision that the shareable join link is exposed *only* through a "copy join link" context-menu item on the room code. [artifacts: ui] (`client/src/lib/views/Lobby.svelte` Guest List block, room-code button around L336–354)
- [x] F002 Make the copy context menu available on the whole Guest List widget via right-click (not just the room-code element), and have it offer 'copy room code' and 'copy join link' as two separate items. Reverses the ui.md decision that the context menu is anchored to the room code and offers only "copy join link". [artifacts: ui] (`client/src/lib/views/Lobby.svelte` `handleContextMenu`/context-menu overlay L57–60, L356–371)
