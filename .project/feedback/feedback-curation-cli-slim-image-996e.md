---
status: open
created: 2026-07-22
plan: null
---

# Feedback

## Bugs

- [ ] F001 The curation aggregation CLI cannot run on the deployed prod image,
  so the scheduled workflow (and the manual run it replaced) will fail. The
  `curation:aggregate` script is `tsx src/curation/cli.ts`, but the runtime
  Docker stage is slim — it copies only compiled `dist/` (`server/dist`,
  `shared/dist`, `client/dist`) plus pruned `--prod` `node_modules`; it has
  **no `server/src/`** and **no `tsx`** (a devDependency). So `fly ssh console
  -C 'pnpm --filter server curation:aggregate'` has nothing to execute on the
  machine. The pipe was only ever smoke-tested in dev via `tsx`; it was never
  run against the real prod image. Fix direction: compile the curation CLI into
  the server build (`server/dist/curation/cli.js`) and invoke it with `node`
  from the workflow, then update the SKILL and infrastructure docs to name the
  compiled entrypoint. Verify by running it inside the actual runtime image (or
  a local build of it), not just via `tsx`. (code:
  `.github/workflows/curation-aggregate.yml`; `server/src/curation/cli.ts`;
  `server/package.json` `curation:aggregate`; `Dockerfile` runtime stage)
  [artifacts: infrastructure]
