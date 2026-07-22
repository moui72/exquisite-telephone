---
status: open
created: 2026-07-22
plan: null
---

# Feedback

Follow-ups from demoing the just-shipped curation feature
(`curation-data-aggregation-pipe` / the `curation-review` skill).

## Bugs

- [ ] F001 The `curation-review` SKILL.md "Invoking the helper" copy-paste
  snippet uses top-level `await` inside `pnpm --filter server exec tsx -e
  '...'`, which this tsx/esbuild config rejects ("Top-level await is currently
  not supported with the 'cjs' output format"). Verified live. Fix: wrap the
  example in an async IIFE (or run a small file) so the documented invocation
  works as written. (code: `.claude/skills/curation-review/SKILL.md` —
  "Invoking the helper" section)

## UX

- [ ] F002 The `curation-review` skill should OFFER to fetch the snapshot
  itself as its first step — read-only `fly ssh sftp get
  …/curation-snapshot.json` — rather than requiring the maintainer to pull it
  down ahead of time. Keep it strictly read-only and preserve the
  no-mutating-`fly` boundary; offer, don't force (dev still reads the local
  path). (code: `.claude/skills/curation-review/SKILL.md` — Inputs/Procedure)
  [artifacts: infrastructure]

## Reconsidered

- [ ] F003 The manual `fly ssh console; pnpm --filter server curation:aggregate`
  step — documented in `infrastructure.md` Aggregation Pipe as "run in a
  deploy/restart window" — should instead be a **scheduled GitHub Actions
  workflow** running the aggregate weekly, **Sunday 02:00 America/New_York**.
  Planner considerations: (a) GitHub cron is UTC and does not observe DST, so
  "2am ET" drifts 06:00–07:00 UTC across the year — pick a fixed UTC time or
  document the drift; (b) the workflow needs a Fly API token (the deploy
  secrets already exist) to `fly ssh console -C` into the running machine;
  (c) the pipe archives events but the running server caches its event count
  and only re-seeds on restart, so a scheduled aggregate WITHOUT a restart
  leaves the count stale until the next deploy — trigger a restart or document
  the interaction; (d) beta and prod each have their own volume — decide
  whether the schedule targets one or both channels. [artifacts: infrastructure]
