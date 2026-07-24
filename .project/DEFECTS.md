# Defects

_Last verified: 2026-07-24_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

Full artifact-vs-code survey of `constitution.md`, `datamodel.md`,
`infrastructure.md`, and `ui.md` (four parallel surveys). This run followed
the `artifact-drift-cleanup` plan that resolved all six findings from the
prior 2026-07-24 survey — every one of those is confirmed fixed and has
dropped out. The two findings below are **new**: each is an incomplete-
reconciliation sibling of a fix just made — a companion clause in the same
section that carried the same stale wording and was not corrected alongside
its neighbor. Both are cosmetic/drift (misleading documentation), not broken
contracts; the code is correct in both. `constitution.md` and `ui.md` are
clean. No never-built scope to route to backlog.

## datamodel.md

- **Claim:** Laps per book — the author-rotation formula is
  "`(originIndex + position) % players.length`", described (in the same
  parenthetical) as unchanged and correct across multiple laps.
  **Actual:** Author rotation is computed over the **active** (non-kicked)
  roster, not `players.length`: `computeNextEntry` derives
  `originIndex = active.findIndex(...)`, `authorIndex = (originIndex +
  position) % activeCount`, and `author = active[authorIndex]`, where
  `active = activePlayers(room)`. It never indexes with `% players.length`.
  This is the companion half of the completion-formula clause fixed this
  run (T001 / former defect `8c27d9ca`): the completion sentence was
  corrected to `activePlayers`, but the author-rotation sentence in the same
  parenthetical still reads `players.length`, so the reconciliation was
  partial. Divergent only when a room has kicked players — the exact
  scenario the clause exists to describe.
  **Location:** `.project/artifacts/datamodel.md` → Laps per book (author-
  rotation clause) vs `shared/src/turnAdvancement.ts` → `computeNextEntry`.
  **Severity:** drift (cosmetic in the no-kick case; misleading precisely
  where kicks matter) — artifact wording is stale in one clause; the code
  is correct.

## infrastructure.md

- **Claim:** Config Lockstep — "The per-channel values table is the
  allowlist … Today that is `app` alone; the volume IDs differ in reality
  but are not named in either config, so they don't appear." The same
  "`app` is the only key in the per-channel values table" assertion is
  repeated in the generated fly-config header comment.
  **Actual:** The generator's per-channel values table has **two** keys:
  `{ app, e2eSeamEnabled }` — `prod: { app: 'exquisite-telephone',
  e2eSeamEnabled: 'false' }`, `beta: { …, e2eSeamEnabled: 'true' }`. So
  `E2E_SEAM_ENABLED` legitimately differs per channel in the generated
  configs (`fly.toml` = `false`, `fly.staging.toml` = `true`). The artifact
  is internally inconsistent: its own E2E-gate section anticipates the seam
  config being allowlisted, while the Config Lockstep section still says
  "`app` alone". The stale one-key assertion also lives in the committed
  generated configs' header comment and the template that produces them.
  **Location:** `.project/artifacts/infrastructure.md` → Config Lockstep
  section vs `scripts/fly-config/generate.ts` (values table) and
  `scripts/fly-config/fly.template.toml` (header comment, propagated into
  `fly.toml` / `fly.staging.toml`).
  **Severity:** drift — the mechanism is correct and generates correctly;
  only the "app alone" wording (artifact + generated header comment) is
  stale, now that a second per-channel key exists.
