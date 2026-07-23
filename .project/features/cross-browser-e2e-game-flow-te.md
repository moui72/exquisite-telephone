---
slug: cross-browser-e2e-game-flow-te
status: backlogged
logged: 2026-07-23
---

An end-to-end test suite exercising the main game flow (lobby → write/draw turns → reveal) across Firefox, Safari, Chrome, and Edge, intended to run against the beta deploy as a gate before promoting a release to prod.
Why: prod promotes are currently held on manual sign-off with no automated cross-browser confidence; a green e2e run against beta gives an objective promote gate and catches browser-specific rendering/interaction regressions the unit suite can't.
