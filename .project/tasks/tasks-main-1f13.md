---
plan: plan-main-2026-07-19-b1d5.md
generated: 2026-07-19
status: completed
---

# Tasks

## Phase 1: Documentation fix
- [x] T001 [artifacts: infrastructure] [defect: 62ab502f] In
  `.project/artifacts/infrastructure.md`'s Realtime Sync section, add
  `onSetLapsPerBook` to the handler list, in the same style as the
  other listed handlers (`onCreateRoom`, `onJoinRoom`, etc.) — it
  exists and works at `server/src/socket/handlers.ts:221`, registered
  in `server/src/socket/server.ts:16`, just missing from the
  documented list. Stamp `last_updated` to today via
  `.claude/skills/ardd-scripts/ardd-state.sh stamp
  .project/artifacts/infrastructure.md last_updated 2026-07-19`.
