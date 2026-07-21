<!-- ardd-badge-start -->
[![built with ArDD](https://img.shields.io/badge/built%20with-ArDD-blue)](https://github.com/moui72/artifact-driven-dev)
<!-- ardd-badge-end -->
[![ArDD version](https://img.shields.io/github/v/release/moui72/artifact-driven-dev?include_prereleases&label=ArDD)](https://github.com/moui72/artifact-driven-dev/releases)
[![sponsor](https://shieldcn.dev/badge/sponsor-%E2%9D%A4-ea4aaa.svg?variant=secondary&theme=pink)](https://github.com/sponsors/moui72)

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
        enum status "lobby|writing|reveal|ended"
        enum promptMode "free-form|curated"
        boolean monochromeOnly
        int turnTimerMinutes "nullable"
        int lapsPerBook "nullable, 1-3"
        boolean nonContinuable
        timestamp roundStartedAt
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
        PNG[PNG export - client-side rasterize]
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

    UI -->|"socket events (join, submit entry)"| SIO
    STATIC -->|serves build| UI
    SIO --> STATE
    SIO --> SESS
    SWEEP -->|advances stalled rounds| STATE
    SIO -->|"rating rides onSubmitEntry"| CUR
    CUR -->|one file per event| VOL
    UI --> PNG
    proc -->|deployed as one app| FLY

## UI

```mermaid
graph TD
    App[App.svelte - routes by Room.status]
    App --> SalonFooter[SalonFooter - always present]
    App --> Lobby[Lobby View]
    App --> WD[Writing / Drawing View]
    App --> Reveal[Reveal View]
    App --> States[Terminal states - ended / kicked / error]

    SalonFooter -->|host gavel opens| ModPanel[ModerationPanel]
    SalonFooter -->|? opens| Rules[RulesOverview panel]

    Lobby --> InfoTip[InfoTooltip - per host setting]
    Lobby -->|derives from activePlayers| Rules

    WD --> Canvas[DrawingCanvas - draw ops]
    WD --> TurnStatus[TurnStatus - whose turn]
    WD --> InfoTip

    Reveal --> Gilt[GiltFrame - book viewer]
    Lobby --> Gilt
    WD --> Gilt
    States --> Gilt

