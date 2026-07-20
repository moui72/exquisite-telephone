---
slug: release-promotion-workflow
status: implemented
logged: 2026-07-20
plan: plan-fly-config-lockstep-2026-07-20-8fbb.md
tasks: tasks-fly-config-lockstep-dac2.md
---

Cutting a production release is a GitHub workflow_dispatch that fast-forwards the release branch from main, which triggers the existing prod deploy — rather than a remembered manual git push.
Why: the dual-channel deployment (main -> beta, release -> prod) is already gitops on the deploy half, but the promotion step between channels is an uncodified manual command. Making it a dispatchable workflow closes the last non-declarative step and gives release cuts an audit trail. Fast-forward only, never a merge — CI skips its checks job on release precisely because release only ever receives commits that already passed on main.
