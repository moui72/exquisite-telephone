# Exquisite Telephone — agent instructions

Project-specific guidance. Architecture and product decisions live in
`.project/artifacts/` (see `constitution.md` first); this file covers
working conventions that aren't design decisions.

## Commit messages — Conventional Commits

Adopted 2026-07-20. **Not retroactive** — history before that date uses
free-form subjects and is not worth rewriting.

```
<type>(<scope>): <subject>
```

**Types**

| Type       | Use for                                                  |
| ---------- | -------------------------------------------------------- |
| `feat`     | A new user-facing capability                             |
| `fix`      | A bug fix                                                |
| `refactor` | Behavior-preserving code change                          |
| `test`     | Adding or correcting tests only                          |
| `docs`     | Documentation, including `.project/` artifacts and plans |
| `build`    | Dockerfile, deps, workspace config                       |
| `ci`       | `.github/workflows/`                                     |
| `chore`    | Anything else with no production effect                  |

**Scopes** — the workspace package or area touched: `shared`, `server`,
`client`, `project` (ArDD state under `.project/`), `deploy`, `ci`.
Omit the scope when a change genuinely spans everything.

**Subject** — imperative mood, lowercase, no trailing period. Explain
_why_ in the body when the reason isn't obvious from the diff; this repo
already leans on substantive commit bodies and that shouldn't change.

### ArDD task commits keep their task ID

Commits produced by `/ardd-implement` carry a `T###` that ties them back
to a tasks file. Keep it, after the colon:

```
feat(server): T013 server-side prompt origin resolution
docs(project): T003 drop onRatePrompt from infrastructure.md handler list
```

The task ID is the trail from a commit back to its tasks file and plan.
Dropping it to satisfy the format would trade a real navigational aid for
a cosmetic one.

### Not enforced by a hook

The pre-commit hook runs lint, type-check, and tests — it does not check
commit-message format. This is convention, not a gate. If it starts
drifting, a `commit-msg` hook is the fix, but that adds a dependency for
a problem we don't have yet (constitution Principle I).

## Deployment is prod-only, on Railway

Production runs on Railway (project `exquisite-telephone`, service `web`,
environment `production`). There is **no beta channel** right now; it was
dropped in the move off Fly.io on 2026-11-26.

Pushing to `main` deploys nothing. Prod deploys only when someone runs the
"Promote main to release" workflow (`promote.yml`), which fast-forwards
`release` from `main` and runs `railway up`. Never connect GitHub
autodeploy on the Railway service: it would open a second prod deploy path.

Service settings (one replica, sleeping off, `/healthz` healthcheck, the
`/data` volume) live in Railway, not in a config file. Change them with
`railway environment edit` and record the change in the Deployment section
of `.project/artifacts/infrastructure.md`. The service must stay at **one
replica**: room state is in-memory, so a second replica breaks joins.
