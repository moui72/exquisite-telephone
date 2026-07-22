---
status: approved
branch: app-version-display-and-semver
created: 2026-07-22
features: [app-version-display-and-semver]
surfaced-defects: []
---

# Plan — app version display + semver releases

## Goal

Give the app its own semantic version (auto-bumped and tagged on prod
promotion) and show a channel-aware build version string in the Salon Footer
so a player reporting an issue can name the exact release they were on.

## Scope

**In scope.**
- **Version source** — the root `package.json` `version` field is the app's
  semver, distinct from the ArDD README badge ([[infrastructure]] App
  Versioning).
- **Build-time injection** — a Vite `define` bakes a channel-aware version
  string into the client bundle from three `--build-arg`s (version, channel,
  short sha); Dockerfile `ARG`s thread them to the client build; a dev
  fallback reads `package.json` with `channel=dev` (no `fly`, no build args).
- **Display** — two places ([[ui]]): the **Salon Footer** shows the version
  small and muted on every view; the help-panel **About tab** shows it
  **prominently** as labeled copy ("Version vX.Y.Z"), next to the source link,
  for a player who opens About to report an issue.
- **Artifact-drift restoration** — `ui.md`'s Rules Overview Panel had lost its
  About-tab description (a merge-resolution casualty; the `about-tab-help-panel`
  feature is implemented in `RulesOverview.svelte` but the artifact drifted).
  This plan restores that description while adding the version to it, bringing
  `ui.md` back in line with the shipped code.
- **CI wiring** — `ci.yml`'s `deploy-beta` passes `channel=beta` + the pushed
  short sha, so beta reads `vX.Y.Z-beta+<sha>`.
- **Auto-bump + tag on promotion** — `promote.yml` gains a bump-level dispatch
  input, bumps `package.json`, commits to `main`, fast-forwards `release`,
  tags `vX.Y.Z`, creates the GitHub release, and deploys prod with
  `channel=prod`.

**Not in scope.**
- **A runtime version endpoint** — the version is build-time only (Principle
  I).
- **A broader `/ardd-defects` sweep** — this plan restores the one drift it
  runs into (the About tab); a full code-vs-artifact pass is `/ardd-defects`'
  job, recommended separately.
- **Backfilling historical git tags** — tagging starts from the first
  promotion after this lands.
- **Regenerating the `infrastructure`/`ui` diagrams** — a follow-up
  `/ardd-diagram` pass, not a task here (both marked stale).

## Technical Approach

The design is settled in the artifacts; shapes below reference them.

**One string, assembled from build inputs.** A small pure function composes
the display string from `{ version, channel, sha }`: `vX.Y.Z` for
`channel=prod`, `vX.Y.Z-beta+<sha>` for `channel=beta`, and a `vX.Y.Z-dev`
form when built locally. Keeping the composition in a tested pure function
(rather than string-building inline in the footer or the Vite config) is what
makes the channel logic verifiable without a real build. The Vite `define`
supplies the three inputs from `process.env` at build time, defaulting to the
`package.json` version and `channel=dev` when the build args are absent.

**Injection path.** `flyctl deploy --build-arg APP_VERSION=… --build-arg
BUILD_CHANNEL=… --build-arg BUILD_SHA=…`; the multi-stage Dockerfile declares
matching `ARG`s and exposes them to the client build step; Vite reads them and
`define`s the composed string (or the raw inputs) into the bundle. No value
reaches the client at runtime ([[infrastructure]] App Versioning).

**Promotion owns the bump** ([[infrastructure]] Release Promotion + App
Versioning). `promote.yml` bumps `package.json` on `main` via `npm version
<level> --no-git-tag-version`, commits + pushes with the built-in
`GITHUB_TOKEN` (whose push doesn't re-trigger workflows — the recursion
property promotion already relies on), then the existing fast-forward carries
the bump onto `release`, and the workflow tags + releases + deploys. The bump
lands on `main` as the ongoing source of truth; no new divergence path.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in
the linked tasks file. Phases are ordered; later phases depend on earlier ones
as noted.

### Phase 1 — Version string + build-time injection

Foundation everything else consumes.

- A tested pure function composing the channel-aware version string from
  `{ version, channel, sha }` (prod / beta / dev forms).
- A Vite `define` (client `vite.config.ts`) supplying `{ version, channel,
  sha }` from `process.env`, defaulting to the `package.json` version and
  `channel=dev` when build args are absent; the composed string exposed to the
  client as a build constant.
- Dockerfile `ARG`s (`APP_VERSION`, `BUILD_CHANNEL`, `BUILD_SHA`) threaded to
  the client build step.

### Phase 2 — Version display (footer + About tab)

Depends on Phase 1.

- The `SalonFooter` component renders the version constant, small and muted
  (Space Mono, unobtrusive placement), on every view — readable text, not a
  control ([[ui]] Salon Footer).
- The help panel's **About tab** (`RulesOverview.svelte`, already tabbed and
  shipped) shows the same version constant **prominently** as labeled copy
  ("Version vX.Y.Z") beside the source link ([[ui]] Rules Overview Panel).
  (`ui.md`'s About-tab description was restored in this plan's artifact step
  to match the shipped component before adding the version to it.)

### Phase 3 — Beta build-arg wiring (`ci.yml`)

Depends on Phase 1.

- `ci.yml`'s `deploy-beta` passes `--build-arg BUILD_CHANNEL=beta
  --build-arg BUILD_SHA=<short sha> --build-arg APP_VERSION=<package.json
  version>` to `flyctl deploy`, so beta shows `vX.Y.Z-beta+<sha>`.

### Phase 4 — Prod auto-bump, tag, release (`promote.yml`)

Depends on Phase 1 (version source). Independent of Phases 2–3 at the code
level, but sequenced last since it is the release-cutting change.

- `promote.yml` gains a bump-level dispatch input (`patch` | `minor` |
  `major`); on promotion it bumps `package.json`, commits + pushes the bump to
  `main`, fast-forwards `release`, tags `vX.Y.Z`, creates the GitHub release,
  and deploys prod with `--build-arg BUILD_CHANNEL=prod --build-arg
  APP_VERSION=<bumped version>`.

## Complexity Tracking

| Deviation | Why justified | Simpler alternative rejected |
|---|---|---|
| `promote.yml` now commits + pushes a version bump to `main` (a workflow that writes to the repo) | Auto-bump means the release version can't be forgotten, and landing it on `main` keeps `package.json` the single source of truth; it reuses the existing fast-forward + `GITHUB_TOKEN` recursion property rather than adding new machinery. | A human hand-editing `package.json` before each promotion is forgettable and drifts from the tag; a separate versioning file duplicates what `package.json` already holds. |

## Open Questions

- **Bump-level default** — whether the `promote.yml` dispatch input defaults to
  `patch` (and how `major`/`minor` are chosen) is a per-release human call; the
  plan only wires the input, not a policy.
- **Exact footer placement/format** — far-right vs. trailing the rail, and
  whether the `+<sha>` is shown in full on beta or on hover/title — a small
  visual detail to settle during Phase 2 against the real footer layout.
