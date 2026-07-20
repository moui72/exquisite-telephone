---
plan: plan-fly-config-lockstep-2026-07-20-8fbb.md
generated: 2026-07-20
status: in-progress
---

# Tasks

## Phase 1: Host frozen-room signal (F001)

- [x] T001 [artifacts: ui, datamodel] Write a failing component test for
  `client/src/lib/components/SalonFooter.svelte` asserting the gavel button
  renders a frozen-room indication when a new `nonContinuable` prop is `true`
  and does not when `false`. The indication must not be conveyed by colour
  alone (Baseline Accessibility) and its accessible name must state the room
  can't continue — assert on the accessible name, not on a CSS class. The prop
  does not exist yet; the test is expected to fail to compile/run until T002.

- [x] T002 [artifacts: ui] Add a `nonContinuable: boolean = false` prop to
  `SalonFooter.svelte` (its current props are `onShowRules`,
  `onShowModeration`, `roomCode` — it has no session/store access and must
  stay presentational) and render the frozen-room indication on the gavel when
  it is `true`. Make T001 pass. Do not touch the host suppression at
  `client/src/lib/views/WritingDrawing.svelte:161-166` — that stays as-is; see
  [[ui]] Moderation Panel.

- [x] T003 [artifacts: ui] Wire the prop in `client/src/lib/App.svelte`, which
  already derives `isHost` around L76 where it passes
  `onShowModeration`: pass `room?.nonContinuable ?? false` down to
  `SalonFooter`. Keeping the derivation in `App.svelte` rather than reading the
  global store inside the footer preserves single-source-of-state
  ([[constitution]] Principle VI). Add a test covering that a host in a
  `nonContinuable` room sees the indication end-to-end at the App level.

- [x] T004 [artifacts: ui] Add a regression test asserting the gavel button
  (and therefore the indication) is absent entirely for a non-host, even when
  `room.nonContinuable` is `true` — `App.svelte` passes
  `onShowModeration: null` for non-hosts, and the moderation affordance must
  never leak to them.

## Phase 2: Fly config generation

- [x] T005 Record a baseline before changing anything: copy the current
  `fly.toml` and `fly.staging.toml` into the test fixtures directory used by
  the generator test in T006. These files are currently in correct lockstep
  **at the level of parsed config values** (verified 2026-07-20 — identical key
  sets, every value identical except `app`), which is what makes them a valid
  oracle. They are **not** byte-identical to each other: `fly.staging.toml`
  L6-17 carries lockstep/drift-history/manual-promotion comments `fly.toml`
  does not, and `fly.toml` carries its own `fly scale count 1` note. That
  asymmetry is the reason T006 compares parsed values rather than raw bytes —
  a single template with a one-key values table cannot reproduce two different
  comment blocks, and forcing it to would push comments into the values table
  and defeat the allowlist. This task has no test requirement of its own; it
  produces the fixture the next test consumes.

- [x] T006 [artifacts: infrastructure] Write a failing test asserting that,
  for each channel, the **parsed** generator output equals the parsed T005
  fixture on every key except `app`, and equals the channel's declared `app`
  value on that one. Compare parsed TOML, not raw bytes — comments are
  deliberately out of scope for this comparison (see T005). Cover both
  channels. Also assert the per-channel values table contains exactly one key
  (`app`): that assertion is the allowlist guard — a new channel-specific key
  cannot be added without a deliberate test change. The generator does not
  exist yet; this test fails first.

- [ ] T007 [artifacts: infrastructure] Implement the generator: one config
  template plus a per-channel values table mapping each channel to its `app`
  value and output filename (`exquisite-telephone` -> `fly.toml`,
  `exquisite-telephone-beta` -> `fly.staging.toml`). Resolve Open Question 1
  (TOML template with placeholder substitution vs. a JS object emitting TOML)
  here — T006's parsed-value test constrains either choice equally, so prefer
  whichever keeps the source readable as the artifact it produces. Comments
  live in the template and are therefore **unified across both outputs**: take
  the union of what the two files carry today (`fly.staging.toml` L2-17's
  lockstep/drift-history/manual-promotion notes and `fly.toml`'s `fly scale
  count 1` note), and add a line stating both files are generated and must not
  be hand-edited. Do not drop any of them; a note that is true of only one
  channel should say so in its own text rather than becoming a values-table
  key. Make T006 pass.

- [ ] T008 [artifacts: infrastructure] Regenerate both configs from the
  template and commit the output. Expect a **comment-only diff** against the
  committed files (the unification from T007) — every parsed key and value
  must be unchanged apart from `app`. Any substantive value diff means the
  template is wrong, not that the configs were: the pre-change files are the
  oracle here, since the deployed apps are running on them. Verify by
  re-running T006 and by eyeballing the diff for value changes specifically,
  not just its size.

- [ ] T009 Add a `gen:fly` (generate) and a `check:fly` (regenerate and diff,
  non-zero exit on any difference) script to the root `package.json`. Declared
  scripts must match what actually exists on disk — Manifest/Script Hygiene is
  a declared Quality Standard in [[constitution]], and a stale script entry is
  treated as a bug.

- [ ] T010 [artifacts: infrastructure] Add a `check:fly` step to the `checks`
  job in `.github/workflows/ci.yml`. It belongs in `checks` (not a new job) so
  it inherits the existing skip on `release` — correct rather than a gap, since
  `release` only ever receives a fast-forward of `main` whose tree already
  passed. Verify the step fails as intended by temporarily hand-editing a
  generated config and confirming a non-zero exit locally.

## Phase 3: Release promotion workflow

- [ ] T011 [artifacts: infrastructure] Resolve Open Question 2 before writing
  the workflow: determine whether a push made with the default `GITHUB_TOKEN`
  triggers the existing `deploy-prod` job on `release`. GitHub suppresses
  workflow runs triggered by `GITHUB_TOKEN` pushes, which would make promotion
  silently deploy nothing — worse than the manual push it replaces. Record the
  finding and, if suppression applies, the chosen alternative (PAT or deploy
  key) and the secret name it needs. Research/decision task — no test
  requirement; the answer gates T012.

- [ ] T012 [artifacts: infrastructure] Add `.github/workflows/promote.yml`: a
  `workflow_dispatch`-only workflow that checks out the repo at full depth
  (`fetch-depth: 0` — a shallow clone cannot compute fast-forwardness) and
  pushes `main` to `release` with a plain non-force push, using the credential
  decided in T011. Concurrency-group it so two dispatches can't race.

- [ ] T013 [artifacts: infrastructure] Make a non-fast-forward rejection a hard,
  explicit failure with an actionable message — never a merge, never a force
  push. Divergence means `release` holds a commit `main` doesn't have, which
  never passed `checks` on `main`; that is exactly the invariant letting
  `release` skip them, so the workflow must surface it for a human rather than
  repair it. See [[infrastructure]] Deployment — Release Promotion.

- [ ] T014 [artifacts: infrastructure] Update the manual-promotion convention
  comment in the config template (originating from `fly.staging.toml` L2-3) to
  point at the promotion workflow instead of the remembered `git push` — edit
  the template, not the generated output, then regenerate via T009's script.
  [[constitution]] Principle IV: documentation describes only what is currently
  true.
