---
slug: app-version-display-and-semver
status: tasked
logged: 2026-07-22
plan: plan-app-version-display-and-semver-2026-07-22-0c08.md
tasks: tasks-app-version-display-and-semver-dfaf.md
---

Apply semantic versioning to ex-tel releases and surface the current app version somewhere unobtrusive-but-discoverable in the UI (e.g. the Salon Footer or the help-panel About tab), so a player giving feedback can tell the maintainer which version they experienced an issue on.
Why: feedback can't currently be tied to a specific release — there's no user-visible app version and releases aren't semver-tagged, so a bug report has no stable version referent. Plan-time considerations: version origin (root package.json vs git tag) and bump-on-release; how it reaches the client (build-time Vite inject vs endpoint); a beta-vs-prod channel distinction (beta auto-deploys every code push, prod is the promoted release); integration with promote.yml. Distinct from the ArDD 'built with ArDD' README badge.
