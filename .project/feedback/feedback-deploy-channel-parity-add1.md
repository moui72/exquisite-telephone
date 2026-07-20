---
status: planned
created: 2026-07-20
plan: plan-curation-store-hardening-2026-07-20-d61f.md
---

# Feedback

## Bugs

- [x] F001 `infrastructure.md`'s Deployment section says the app "deploys
  as a single Fly.io app running one process/container — matching
  Principle I (no premature scaling): one Dockerfile, one `fly.toml`."
  **This is false, and it is the root cause of the repeated
  dual-channel amnesia.** Reality: two Fly apps
  (`exquisite-telephone`, `exquisite-telephone-beta`), two configs
  (`fly.toml`, `fly.staging.toml`), two API tokens
  (`FLY_API_TOKEN_PROD` / `FLY_API_TOKEN_BETA`), and two CI deploy jobs
  with separate concurrency groups. The words "beta", "staging", and
  "release" appear **nowhere in any artifact**. Agents are instructed to
  read artifacts before acting, so every agent touching deployment is
  authoritatively told there is one app — which is why `fly.staging.toml`
  drifted (F002) and why the second channel keeps being forgotten. This
  is not agent carelessness; it is the artifact misinforming them.
  [artifacts: infrastructure]

  The revision must record the real topology **and** these channel
  semantics:
  - Push to `main` deploys **beta** (`fly.staging.toml`).
  - Prod deploys only from the **`release`** branch (`fly.toml`), which
    only ever receives a **fast-forward** of `main` — which is why CI
    skips its `checks` job on `release`, since those checks already
    passed on main's push.
  - Each channel has its own Fly app, config, token, **and volume**.
  - Identify every remaining one-time **manual CLI step** as such,
    because those are precisely what gets forgotten: `fly volumes
    create` per app, and `fly scale count 1` per app.

- [x] F002 `fly.staging.toml` is missing the `[mounts]` block and the
  `CURATION_DATA_PATH` env var that were added to `fly.toml`, while its
  own header comment claims "Mirrors fly.toml; only `app` differs."
  Beta auto-deploys from `main` on every push, so without
  `CURATION_DATA_PATH` the Curation Store falls back to its local dev
  default path *inside the container* and every rating beta collects is
  discarded on the next deploy. **This fails invisibly** — no error, no
  missing volume, just no data — which is a worse failure mode than
  prod's, where a missing volume stops the machine loudly. Beta also
  needs its own Fly volume created (`fly volumes create curation_data
  --app exquisite-telephone-beta --region iad --size 1`; machine region
  confirmed `iad` via `fly status`). [artifacts: infrastructure]

## Out of scope (re-filed to the feature register)

Two items here were capabilities the system does not have yet rather
than defects in existing behavior, so they were logged to
`.project/features/` instead of this file:

- `release-promotion-workflow` — a `workflow_dispatch` that
  fast-forwards `release` from `main`, making the promotion step
  declarative instead of a remembered git push.
- `fly-config-lockstep` — lint or generate the two Fly configs so they
  cannot silently diverge. Generation is the stronger option (drift
  becomes structurally impossible rather than merely detected); scoping
  that tradeoff is its own decision.

F001 and F002 are worth fixing regardless of whether either lands —
the artifact is wrong *today*, and beta is losing data *today*.
