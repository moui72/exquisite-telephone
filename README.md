[![built with ArDD](https://shieldcn.dev/badge/built%20with-ArDD-blue.svg?variant=secondary&theme=blue)](https://github.com/moui72/artifact-driven-dev) [![ArDD version](https://shieldcn.dev/badge/version-v0.10.3--beta.1-lightgrey.svg?variant=secondary&theme=gray)](https://github.com/moui72/artifact-driven-dev)
[![sponsor](https://shieldcn.dev/badge/sponsor-%E2%9D%A4-ea4aaa.svg?variant=secondary&theme=pink)](https://github.com/sponsors/moui72)

## Datamodel

```mermaid
erDiagram
    ROOM ||--o{ PLAYER : "players"
    ROOM ||--o{ BOOK : "books"
    ROOM ||--o| TIMEOUTVOTE : "pendingTimeoutVote"
    PLAYER ||--o{ BOOK : "originAuthorId"
    BOOK ||--o{ ENTRY : "entries"
    PLAYER ||--o{ ENTRY : "authorId"

    ROOM {
        string id
        string hostPlayerId FK
        string status
        timestamp createdAt
        boolean monochromeOnly
        number turnTimerMinutes
        timestamp roundStartedAt
        timestamp revealStartedAt
        boolean nonContinuable
        string playAgainVotes
    }
    PLAYER {
        string id
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
    }
    ENTRY {
        string id
        string bookId FK
        string authorId FK
        integer position
        string type
        string content
        boolean emptyByTimeout
    }
    TIMEOUTVOTE {
        string stalledPlayerIds
        string eligibleVoterIds
        string votes
        timestamp voteDeadline
    }
```

## Infrastructure

```mermaid
graph TD
    Client[Svelte Client<br/>served as static dist/]
    Server[Node/TypeScript Server<br/>single process]
    SocketIO[Socket.IO Realtime Layer<br/>incl. onKickPlayer/onRestartGame]
    RoomStore[In-Memory Room/Game Store]
    SessionStore[In-Memory Session Store<br/>reconnect tolerance]
    TimerSweep[Turn Timer Sweep<br/>30s interval]
    ExportPipeline[Client-Side PNG Export]
    Fly[Fly.io<br/>single machine deployment]

    Client -- "user actions (join, submit, draw, kick, restart)" --> SocketIO
    SocketIO -- "room/game state broadcasts" --> Client
    SocketIO --> Server
    Server --> RoomStore
    Server --> SessionStore
    Server --> TimerSweep
    TimerSweep -- "opens/resolves timeout votes" --> RoomStore
    SessionStore -- "sessionToken -> playerId, roomId" --> RoomStore
    Client -- "replays stroke/text data" --> ExportPipeline
    ExportPipeline -- "PNG download" --> Client
    Fly -- "hosts" --> Server
```

## UI

```mermaid
graph TD
    App[App]
    Lobby[Lobby View]
    WritingDrawing[Writing / Drawing View]
    DrawingCanvas[Drawing Canvas]
    ModerationPanel[Moderation Panel<br/>kick / end game / restart]
    Reveal[Reveal View<br/>synced via Room.revealStartedAt]
    Kicked[Kicked State]
    Ended[Ended State]
    ErrorState[Error State]

    App --> Lobby
    App --> WritingDrawing
    App --> Reveal
    App --> Kicked
    App --> Ended
    App --> ErrorState

    WritingDrawing --> DrawingCanvas
    WritingDrawing --> ModerationPanel
    Reveal --> ModerationPanel
    Lobby --> ModerationPanel

    Lobby -- "Room.status, players[]" --> Lobby
    WritingDrawing -- "Entry.type, roundStartedAt, pendingTimeoutVote" --> WritingDrawing
    DrawingCanvas -- "draw ops: stroke, fill" --> DrawingCanvas
    ModerationPanel -- "Player.kicked, Room.nonContinuable" --> ModerationPanel
    Reveal -- "books[], entries[], revealStartedAt" --> Reveal
    Kicked -- "own Player.kicked === true" --> Kicked
```

