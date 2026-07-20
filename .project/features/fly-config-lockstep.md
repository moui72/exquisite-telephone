---
slug: fly-config-lockstep
status: tasked
logged: 2026-07-20
plan: plan-fly-config-lockstep-2026-07-20-8fbb.md
tasks: tasks-fly-config-lockstep-dac2.md
---

fly.toml and fly.staging.toml cannot silently diverge — enforced either by a lint that fails CI when they differ outside an allowlist of per-channel keys, or by generating both from a single source at deploy time.
Why: the two configs are meant to differ only in app name, but staging drifted and lost the [mounts] block and CURATION_DATA_PATH, silently discarding beta's curation data on every deploy. A header comment claiming the files mirror each other is not enforcement. Generation is the stronger option since it makes drift structurally impossible rather than merely detected; scoping that tradeoff is its own decision. See [[release-promotion-workflow]].
