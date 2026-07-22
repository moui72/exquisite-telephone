<p align="center">
  <a href="https://svelte.dev"><img alt="Svelte 5" src="https://shieldcn.dev/badge/Svelte-5.svg?variant=secondary&amp;logo=svelte&amp;logoColor=ff3e00" /></a>
  <a href="https://socket.io"><img alt="Socket.IO 4" src="https://shieldcn.dev/badge/Socket.IO-4.svg?variant=secondary&amp;logo=socketdotio&amp;logoColor=ffffff" /></a>
  <a href="https://github.com/moui72/exquisite-telephone/actions/workflows/ci.yml"><img alt="CI status" src="https://shieldcn.dev/github/ci/moui72/exquisite-telephone.svg?variant=secondary" /></a>
  <!-- ardd-badge-version-start -->
  <a href="https://github.com/moui72/artifact-driven-dev"><img alt="built with ArDD" src="https://shieldcn.dev/badge/dynamic/json.svg?url=https://raw.githubusercontent.com/moui72/exquisite-telephone/main/.github/badges/ardd-version.json&amp;query=%24.message&amp;label=built%20with%20ArDD&amp;color=yellow&amp;labelColor=%232F4858&amp;variant=secondary&amp;logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiByb2xlPSJpbWciIGFyaWEtbGFiZWw9IkFyREQiPgo8IS0tIFNvdXJjZSBvZiB0cnV0aCBmb3IgdGhlIEFyREQgYmFkZ2UgbWFyazogdGhlIGJhZGdlIHdvcmtmbG93IGlubGluZXMgdGhpcyBmaWxlIHZlcmJhdGltIGFzIHRoZSBlbmRwb2ludCBKU09OJ3MgbG9nb1N2Zy4gRGFyay1iYWNrZ3JvdW5kIHZhcmlhbnQgKGJhZGdlIGxhYmVsIHNpZGUpOiB3aGl0ZSByaW5nL3JlY3Q7IHRoZSBmb3VydGggdHJpYW5nbGUgaXMgd2hpdGUsIG1hdGNoaW5nIHRoZSBsb2dvJ3MgZGFyay1jb250ZXh0IHRyZWF0bWVudC4gLS0%2BCjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjM0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNiIvPgo8cmVjdCB4PSI0MSIgeT0iMzkiIHdpZHRoPSIxOCIgaGVpZ2h0PSIyMiIgcng9IjMiIGZpbGw9IiNmZmZmZmYiLz4KPHBvbHlnb24gcG9pbnRzPSIxMCwwIC04LC05IC04LDkiIGZpbGw9IiNmMjY0MTkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQxIDE3KSByb3RhdGUoLTE1KSIvPgo8cG9seWdvbiBwb2ludHM9IjEwLDAgLTgsLTkgLTgsOSIgZmlsbD0iI2Y2YWUyZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTcgNDEpIHJvdGF0ZSgtNzUpIi8%2BCjxwb2x5Z29uIHBvaW50cz0iMTAsMCAtOCwtOSAtOCw5IiBmaWxsPSIjODZiYmQ4IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4MyA1OSkgcm90YXRlKDEwNSkiLz4KPHBvbHlnb24gcG9pbnRzPSIxMCwwIC04LC05IC04LDkiIGZpbGw9IiNmZmZmZmYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU5IDgzKSByb3RhdGUoMTY1KSIvPgo8L3N2Zz4K" /></a>
  <!-- ardd-badge-version-end -->
  <a href="https://github.com/sponsors/moui72"><img alt="sponsor" src="https://shieldcn.dev/badge/sponsor-%E2%9D%A4-ea4aaa.svg?variant=secondary&amp;theme=pink" /></a>
</p>

# Exquisite Telephone

A browser-based multiplayer party game in the spirit of Telestrations and
skribbl.io: players alternate **writing a phrase** and **drawing it**, each
"book" passes around the circle, and at the end everyone sees how a phrase
drifted through the chain of translation. Sessions are small private groups
joining by a room code — no accounts, no persistent identity beyond a
session.

Play it now:

- **Production** — <https://ex-tel.ty-pe.com>
- **Beta** (latest `main`) — <https://beta-ex-tel.ty-pe.com>

## Tech stack

A pnpm workspace of three packages — `shared` (types/logic), `server`
(Node + Socket.IO), and `client` (Svelte + Vite). One Node process hosts the
realtime layer and, in production, serves the built client itself. Game state
lives in server memory; there is no database. See the architecture diagrams
below (generated from the design docs in `.project/artifacts/`).

## Running locally

**Prerequisites:** Node 22 (see `.nvmrc`) and [pnpm](https://pnpm.io).

```bash
pnpm install
```

The server and client run as two dev processes. In separate terminals:

```bash
pnpm dev:server   # game server on http://localhost:3000
pnpm dev:client   # Vite dev server on http://localhost:5173
```

Then open **<http://localhost:5173>**. The client connects to the socket
server same-origin (`io()`); in dev, Vite proxies `/socket.io` traffic to the
server on port 3000, so no extra configuration is needed. Open a second
browser (or an incognito window) to join the same room code as another
player.

To run the production shape locally — one process serving the built client:

```bash
pnpm build
pnpm --filter server start   # serves the built client on PORT (default 3000)
```

## Checks

```bash
pnpm lint         # eslint
pnpm typecheck    # shared build + tsc across all packages
pnpm test         # full workspace test suite
```

A Husky pre-commit hook runs all three, in that order, before a commit is
accepted. The same lint / type-check / test suite runs in CI on every push
and pull request, and **CI is the gate of record** — the hook is a local
convenience that catches the same issues earlier.

## Deployment

The app deploys to [Fly.io](https://fly.io) as **two separate apps**, one per
channel:

|              | Production                 | Beta                            |
| ------------ | -------------------------- | ------------------------------- |
| URL          | <https://ex-tel.ty-pe.com> | <https://beta-ex-tel.ty-pe.com> |
| Fly app      | `exquisite-telephone`      | `exquisite-telephone-beta`      |
| Config       | `fly.toml`                 | `fly.staging.toml`              |
| Deploys from | `release` branch           | `main` branch                   |
| Trigger      | manual workflow dispatch   | automatic on every push         |

- **Beta deploys automatically:** every push to `main` deploys beta within
  minutes (`.github/workflows/ci.yml`), so anything merged is live on beta
  right away.
- **Production is an explicit human act:** it deploys only via the
  `promote.yml` workflow (manual dispatch), which fast-forwards `release`
  from `main` and then runs `flyctl deploy` against `fly.toml`. `release` only
  ever receives a fast-forward of `main` and is never developed on directly.

The two Fly configs are meant to differ in exactly one key (`app`), so they
are **generated from a single template** rather than hand-maintained — run
`pnpm gen:fly` to regenerate and `pnpm check:fly` to verify; CI fails if the
committed files drift from the generated output.

## Contributing

Issues and pull requests are welcome.

- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org)
  (`feat`, `fix`, `refactor`, `docs`, …) — see `CLAUDE.md` for the scopes used
  here.
- **Tests come first:** every behavior change is expected to be accompanied by
  a test (the project follows a test-first paradigm). Make sure `pnpm lint`,
  `pnpm typecheck`, and `pnpm test` all pass before opening a PR — CI will run
  them.
- **Design decisions** live in `.project/artifacts/` and are managed with the
  [Artifact-Driven Development](https://github.com/moui72/artifact-driven-dev)
  (ArDD) workflow; `.project/README.md` is a guide to reading those files. If
  a change alters product behavior or architecture, update the relevant
  artifact alongside the code.
- **Contribution licensing:** because the project is dual-licensed
  (noncommercial for everyone, commercial by separate arrangement — see
  [License](#license)), contributions must come in under terms that let the
  maintainer relicense them commercially. By opening a pull request you agree
  your contribution may be offered under both the noncommercial license and
  any commercial license the maintainer grants.

If you enjoy the game, you can support development via
[GitHub Sponsors](https://github.com/sponsors/moui72).

## License

This project is **source-available, not open source**. It is licensed under
the [PolyForm Noncommercial License 1.0.0](./LICENSE.md): you may use, fork,
modify, and share it freely for any **noncommercial** purpose. **Commercial
use requires a separate license** from the copyright holder — open an issue
or reach out via [github.com/moui72](https://github.com/moui72) to arrange
one. See [`LICENSE.md`](./LICENSE.md) for the full terms.

## Datamodel

```mermaid
erDiagram
    ROOM ||--o{ PLAYER : "players"
    ROOM ||--o{ BOOK : "books"
    ROOM }o--|| PLAYER : "hostPlayerId"
    ROOM |o--o| TIMEOUTVOTE : "pendingTimeoutVote"
    BOOK ||--o{ ENTRY : "entries"
    BOOK }o--|| PLAYER : "originAuthorId"
    ENTRY }o--|| PLAYER : "authorId"
    RATINGEVENT |o--o| PROMPTRATING : "folds when origin=bank"
    RATINGEVENT |o--o| CANDIDATEPHRASE : "folds when origin=player-written"

    ROOM {
        string id "short room code"
        string hostPlayerId FK
        enum status "lobby|writing|decorating|reveal|ended"
        enum promptMode "free-form|curated"
        boolean monochromeOnly
        int turnTimerMinutes "nullable"
        int lapsPerBook "nullable, 1-3"
        boolean nonContinuable
        timestamp roundStartedAt
        json bookReads "reveal: Book.id -> reader Player.id[]"
        json currentlyReading "reveal: Player.id -> open Book.id"
        timestamp decorationWindowStartedAt "nullable, decorating window"
        json coverSubmissions "playerIds finalized in decorating"
    }
    PLAYER {
        string id "ephemeral, no account"
        string roomId FK
        string name
        boolean connected
        string sessionToken
        boolean kicked
    }
    BOOK {
        string id
        string roomId FK
        string originAuthorId FK
        Entry entries "ordered chain"
        json cover "origin author draw-ops, nullable"
        string coverTemplate "template id, nullable"
    }
    ENTRY {
        string id
        string bookId FK
        string authorId FK
        int position "0-indexed"
        enum type "text|drawing"
        string content "phrase or draw-ops"
        boolean emptyByTimeout
    }
    TIMEOUTVOTE {
        string stalledPlayerIds
        string eligibleVoterIds
        json votes
        timestamp voteDeadline
    }
    RATINGEVENT {
        string phrase "verbatim"
        enum value "up|down"
        enum origin "bank|player-written"
        timestamp ratedAt
    }
    PROMPTRATING {
        string phrase "bank phrase, key"
        int up
        int down
    }
    CANDIDATEPHRASE {
        string phrase "player-written, key"
        int votes
        timestamp firstLoggedAt
    }
```

## Infrastructure

```mermaid
graph TD
    subgraph client[Browser - Svelte SPA]
        UI[Client app]
        PNG[PNG export - client-side rasterize, branded/divided strip]
    end

    subgraph proc[Single Node process - one port]
        SIO[Socket.IO realtime layer]
        STATIC[Serves built client dist/]
        STATE[In-memory game state - Rooms/Books/Entries]
        SESS[Session store - token to player, short TTL]
        SWEEP[Turn timer sweep - 30s setInterval]
        CUR[Curation store - append-only JSON events]
    end

    VOL[(Fly volume - curation.json)]
    FLY[Fly.io - beta from main, prod from release]

    UI -->|"socket events (submit entry, submit cover)"| SIO
    STATIC -->|serves build| UI
    SIO --> STATE
    SIO --> SESS
    SWEEP -->|advances stalled rounds| STATE
    SWEEP -->|closes expired decorating window| STATE
    SIO -->|"rating rides onSubmitEntry"| CUR
    CUR -->|one file per event| VOL
    UI --> PNG
    proc -->|deployed as one app| FLY
```

## UI

```mermaid
graph TD
    App[App.svelte - routes by Room.status]
    App --> SalonFooter[SalonFooter - always present]
    App --> Lobby[Lobby View]
    App --> WD[Writing / Drawing View]
    App --> Decorate[DecorationWindow - status decorating, 2-min gated]
    App --> Reveal[Reveal View - self-guided]
    App --> States[Terminal states - ended / kicked / error]

    SalonFooter -->|host gavel opens| ModPanel[ModerationPanel]
    SalonFooter -->|? opens| Rules[RulesOverview panel - tabbed]
    Rules --> RulesTab[Rules tab - default]
    Rules --> AboutTab[About tab - credits + repo/sponsor links]

    Lobby --> InfoTip[InfoTooltip - per host setting]
    Lobby -->|derives from activePlayers| Rules

    WD --> Canvas[DrawingCanvas - draw ops]
    WD --> TurnStatus[TurnStatus - whose turn]
    WD --> InfoTip
    WD -->|waiting-state decoration + 30s grace| CoverCanvas

    Decorate --> CoverCanvas[CoverDecorationCanvas - reuses DrawingCanvas]
    CoverCanvas --> TemplatePicker[Template picker - 9 backgrounds]
    CoverCanvas -->|book-id-keyed draft| CoverDraft[coverDraft store]

    Reveal --> CardGrid[Card grid - drawn cover or generateCoverArt, read badges]
    CardGrid --> BookModal[Per-book modal - manual paging, save-to-PNG]

    Lobby --> Gilt[GiltFrame]
    WD --> Gilt
    Decorate --> Gilt
    States --> Gilt
```

