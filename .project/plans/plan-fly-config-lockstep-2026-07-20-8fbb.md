---
status: approved
branch: fly-config-lockstep
created: 2026-07-20
features: [fly-config-lockstep, release-promotion-workflow]
surfaced-defects: []
---

# Plan: Deploy-config lockstep, release promotion, and the host's frozen-room signal

## Goal

Make the two Fly configs impossible to drift by generating both from one
source, replace the manual `release` fast-forward with a dispatchable
workflow, and give the host a frozen-room signal on the footer gavel that
doesn't require opening the moderation modal.

## Scope

**Included**

- `fly-config-lockstep` — a generator producing `fly.toml` and
  `fly.staging.toml` from one template plus a per-channel values table,
  with a CI check that regenerates and diffs.
- `release-promotion-workflow` — a `workflow_dispatch` workflow that
  fast-forwards `release` from `main`, failing loudly on divergence.
- Feedback F001 (`.project/feedback/feedback-main-338d.md`) — the Salon
  Footer gavel carries a frozen-room indication while
  `Room.nonContinuable` is `true`.

**Not included**

- `curation-data-aggregation-pipe` — deferred to `/ardd-research`. The
  fold already exists (`aggregateEvents`, `curationStore.ts:127`) and has
  no caller, but the feature's stated purpose is the prompt-injection
  boundary for untrusted player text, and that shape is undecided.
  Designing a security boundary inline in a plan is the wrong venue; it
  stays `backlogged`.
- Any change to the `deploy-beta` / `deploy-prod` jobs themselves. The
  promotion workflow triggers the existing prod deploy via the push it
  makes; it does not deploy anything itself.
- Un-suppressing the host's page-body `nonContinuable` notice in
  `WritingDrawing.svelte`. That suppression stays; the fix is the gavel
  signal (see [[ui]] Moderation Panel).

## Technical Approach

**Config generation.** Today both configs declare an identical key set
and differ only in `app` (verified 2026-07-20) — so the generator starts
from a green state and its first output must be byte-identical to what's
committed, which is the strongest possible test of the template. The
generated files stay checked in so `flyctl deploy --config <file>` is
unchanged and a reader sees real config in the repo. The per-channel
values table is the allowlist of legitimate differences; adding a key to
it is the explicit act of declaring a channel difference. See
[[infrastructure]] Deployment — Config Lockstep.

The check runs in CI's `checks` job, which is skipped on `release` —
correct, not a gap, since `release` only ever fast-forwards `main`.

**Release promotion.** A `workflow_dispatch` that checks out `main` and
pushes it to `release` without `--force`. A non-fast-forward rejection is
a hard failure, never a merge: divergence means `release` holds a commit
that never passed `checks` on `main`, which is exactly the assumption
letting `release` skip them. See [[infrastructure]] Deployment — Release
Promotion.

**Gavel frozen-room signal.** `SalonFooter.svelte` currently takes only
`onShowRules`, `onShowModeration`, and `roomCode` — it has no session or
room access, so it cannot see `Room.nonContinuable` today. Rather than
reaching into the global store from the footer, `App.svelte` (which
already derives `isHost` at L76) passes the flag down as a prop, keeping
the footer presentational and the state derivation in one place
(Principle VI). The indication is not colour-alone and its accessible
label states the room can't continue (Baseline Accessibility).

## Phase Breakdown

### Phase 1 — Host frozen-room signal (F001)

No dependencies. Fully independent of Phases 2–3; touches only client
code.

- Pass a `nonContinuable` prop from `App.svelte` into
  `SalonFooter.svelte`.
- Render the gavel's frozen-room indication when it's `true` —
  non-colour-alone, with an accessible label naming the frozen state.
- Component tests: gavel shows the indication when `nonContinuable`, not
  otherwise, and never renders at all for a non-host.

Addresses F001, `.project/feedback/feedback-main-338d.md`.
[artifacts: ui, datamodel]

### Phase 2 — Fly config generation

No dependencies. Must land before Phase 3, since Phase 3's workflow
operates on a deploy surface Phase 2 defines.

- Add a template + per-channel values table (`app` the sole channel key)
  and a generator script; wire it into `package.json` scripts (Manifest
  Hygiene is a declared Quality Standard).
- Test-first: the generator's output for both channels equals the
  currently-committed files byte-for-byte.
- Regenerate both configs, preserving the substantive comments already in
  `fly.staging.toml` by moving them into the template.
- Add a CI step in the `checks` job that regenerates and fails on any
  diff.

Implements `fly-config-lockstep`. [artifacts: infrastructure]

### Phase 3 — Release promotion workflow

Depends on Phase 2 (the generated-config check must be part of `checks`
before promotion is automated, so a cut can't carry drift to prod).

- Add `.github/workflows/promote.yml`: `workflow_dispatch`, checks out
  `main` at full depth, pushes to `release` without force.
- Fail explicitly with an actionable message on non-fast-forward rejection.
- Update the manual-promotion convention comment in `fly.staging.toml`.

Implements `release-promotion-workflow`. [artifacts: infrastructure]

## Complexity Tracking

| Deviation | Why justified (Principle I) |
|---|---|
| A generator + template for two 40-line config files | The register calls generation the stronger option because it makes drift unexpressible rather than merely detected — and this exact drift already cost beta its curation data on every deploy. A comparison lint would catch the next occurrence after it's written; generation removes the place to write it. |
| A second GitHub workflow file | Promotion is a distinct trigger (`workflow_dispatch`) from CI's push/PR triggers. Folding it into `ci.yml` would put a manual production action behind the same file every push evaluates. |

## Open Questions

1. **Template format.** A `.toml` template with placeholder substitution
   keeps the source readable as TOML; a JS/TS object emitting TOML is
   more expressive but makes the source no longer look like the artifact
   it produces. Resolve at Phase 2 implementation — the byte-identity
   test constrains either choice equally.
2. **Which token pushes to `release`.** The default `GITHUB_TOKEN` may
   not trigger the `deploy-prod` workflow on the resulting push
   (GitHub suppresses workflow-triggered-by-`GITHUB_TOKEN` runs). If so,
   promotion needs a PAT or a deploy key. This must be verified during
   Phase 3, not assumed — a silently non-triggering promotion is worse
   than the manual push it replaces.
3. **Gavel indication treatment.** Whether the frozen-room signal is a
   badge, an icon swap, or a border change is a visual-identity call left
   to implementation within the non-colour-alone constraint.

## Production Annotation Summary

No new production shortcuts are introduced by this plan. The existing
annotations in [[infrastructure]] (single process, no durable
persistence, no zero-downtime deploys) are unchanged — none of this work
touches game-state durability or the single-machine constraint.
