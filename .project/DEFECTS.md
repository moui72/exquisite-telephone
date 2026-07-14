# Defects

_Last verified: 2026-07-13_

No defects found — artifacts match the codebase as of this run.

All 4 defects from the previous pass (2026-07-13) are resolved:

- **ui.md** late-join rejection: `joinRoom` now rejects a join once
  `Room.status` has left `lobby` (`server/src/domain/roomStore.ts`,
  `server/src/socket/handlers.ts`), matching the documented Error state.
- **ui.md** Loading state: removed from the artifact (was documented but
  never built, with no functional gap to justify building it).
- **constitution.md** Principle X: `server/src/index.ts` now explicitly
  constructs `sessionStore` and `logger` and passes them into
  `createSocketServer`, rather than relying on that function's default
  parameters — dependency construction is now fully centralized in the
  entry point as the principle requires.
- **datamodel.md** `Room.status` enum: the stale `drawing` value was
  removed; the field's notes now clarify the phase is room-wide only
  (`lobby`/`writing`/`reveal`/`ended`) and that per-player write/draw state
  is tracked via `Entry.type` instead.

_Note (not a defect): `server/src/httpRequestHandler.ts`'s `/healthz` route,
referenced by `fly.toml`'s health check, isn't mentioned in
infrastructure.md's Deployment section. Not a contradicted claim — just a
possible documentation gap left for `/ardd-refine` to consider._
