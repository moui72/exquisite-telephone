import { io, type Socket } from 'socket.io-client';
import { parseDrawOps, type DrawOps, type Entry, type Room } from '@exquisite-telephone/shared';

/**
 * A Node `socket.io-client` joined to a room as an extra player, used by
 * the e2e suite as an out-of-band OBSERVER of authoritative server state
 * (infrastructure.md — Drawing assertions: read the exact submitted
 * `DrawOps` from a socket.io-client observer, parsed with the PRODUCTION
 * parser, rather than comparing pixels).
 *
 * It subscribes to the same `roomUpdated` broadcast every player receives
 * and keeps the latest `Room` snapshot, exposing typed accessors for the
 * room and for each entry's parsed vector draw ops. Reusing `parseDrawOps`
 * from `shared` is deliberate — the assertion must read drawings exactly as
 * the app does, never via a re-implemented parser (constitution Principle
 * VII).
 *
 * Because `joinRoom` seats a real `Player`, an observer that never submits
 * would stall round-gating (a book waits on its due author). The helper
 * therefore optionally AUTO-PLAYS its own turns with trivial valid content
 * so a full flow can complete while the browsers drive the turns under
 * assertion; pass `autoPlay: false` for the minimal "just watch one
 * submission" case.
 */
export interface ObserverOptions {
  /** Base URL of the target server (defaults to the same env var the config uses). */
  baseURL?: string;
  /** Display name the observer joins under. */
  name?: string;
  /**
   * The test-only signal (infrastructure.md — Curation-write isolation):
   * sent as the `x-e2e-test-signal` request header so the server tags this
   * connection's traffic and never lets its prompt-ratings reach the real
   * Curation Store. Omit for an untagged observer.
   */
  testSignal?: string;
  /** Auto-submit the observer's own due turns so a full flow can complete. */
  autoPlay?: boolean;
}

const TEST_SIGNAL_HEADER = 'x-e2e-test-signal';

export interface Observer {
  /** The observer's own seated player id in the room. */
  readonly playerId: string;
  /** The most recent authoritative room snapshot the observer has seen. */
  latestRoom(): Room;
  /** Every entry across all books in the latest snapshot. */
  allEntries(): Entry[];
  /** Parsed vector draw ops for a drawing entry (empty for a text entry). */
  drawOpsFor(entry: Entry): DrawOps;
  /** Resolve once the room reaches (or already is at) the given status. */
  waitForStatus(status: Room['status'], timeoutMs?: number): Promise<Room>;
  /** Resolve with the first entry matching the predicate, waiting for broadcasts. */
  waitForEntry(match: (entry: Entry) => boolean, timeoutMs?: number): Promise<Entry>;
  /** Disconnect the observer socket. */
  close(): void;
}

interface JoinAck {
  room?: Room;
  player?: { id: string };
  error?: string;
}

/**
 * Connects an observer to `roomId` and resolves once it is seated and has
 * an initial room snapshot.
 */
export async function joinAsObserver(roomId: string, options: ObserverOptions = {}): Promise<Observer> {
  const baseURL = options.baseURL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  const socket: Socket = io(baseURL, {
    forceNew: true,
    extraHeaders: options.testSignal ? { [TEST_SIGNAL_HEADER]: options.testSignal } : undefined,
  });

  let room: Room | null = null;
  const listeners = new Set<(room: Room) => void>();

  function applyRoom(next: Room): void {
    room = next;
    for (const listener of listeners) listener(next);
  }

  socket.on('roomUpdated', (payload: { room: Room }) => applyRoom(payload.room));
  socket.on('roomChanged', (payload: { room: Room }) => applyRoom(payload.room));

  const ack = (await socket
    .timeout(10_000)
    .emitWithAck('joinRoom', { roomId, playerName: options.name ?? 'Observer' })) as JoinAck;
  if (!ack.room || !ack.player) {
    socket.close();
    throw new Error(`observer failed to join ${roomId}: ${ack.error ?? 'unknown error'}`);
  }
  const playerId = ack.player.id;
  applyRoom(ack.room);

  if (options.autoPlay) {
    // Submit trivial valid content whenever it is the observer's turn, so
    // its seat never stalls the round. Drawing turns get an empty op array
    // (valid, bounded); text turns get a short string.
    socket.on('roomUpdated', () => void tryAutoPlay());
    void tryAutoPlay();
  }

  async function tryAutoPlay(): Promise<void> {
    if (!room) return;
    for (const book of room.books) {
      const currentRound = Math.min(...room.books.map((b) => b.entries.length));
      if (book.entries.length !== currentRound) continue;
      const position = book.entries.length;
      const originIndex = room.players.findIndex((p) => p.id === book.originAuthorId);
      const authorId = room.players[(originIndex + position) % room.players.length]?.id;
      if (authorId !== playerId) continue;
      const type = position % 2 === 0 ? 'text' : 'drawing';
      const content = type === 'drawing' ? '[]' : `observer ${position}`;
      try {
        await socket.timeout(10_000).emitWithAck('submitEntry', { roomId, playerId, bookId: book.id, content });
      } catch {
        // Socket closing mid-flow (test teardown) must not surface as an
        // unhandled rejection — auto-play is best-effort.
        return;
      }
    }
  }

  function currentRoom(): Room {
    if (!room) throw new Error('observer has no room snapshot yet');
    return room;
  }

  return {
    playerId,
    latestRoom: currentRoom,
    allEntries: () => currentRoom().books.flatMap((b) => b.entries),
    drawOpsFor: (entry) => (entry.type === 'drawing' ? parseDrawOps(entry.content) : []),
    waitForStatus(status, timeoutMs = 15_000) {
      return waitUntil((r) => r.status === status, timeoutMs, currentRoom, listeners);
    },
    async waitForEntry(matchFn, timeoutMs = 15_000) {
      const r = await waitUntil(
        (snapshot) => snapshot.books.some((b) => b.entries.some(matchFn)),
        timeoutMs,
        currentRoom,
        listeners,
      );
      return r.books.flatMap((b) => b.entries).find(matchFn)!;
    },
    close: () => socket.close(),
  };
}

/**
 * Resolves once `predicate` holds for a room snapshot — checking the
 * current snapshot immediately, then on each broadcast until `timeoutMs`.
 */
function waitUntil(
  predicate: (room: Room) => boolean,
  timeoutMs: number,
  current: () => Room,
  listeners: Set<(room: Room) => void>,
): Promise<Room> {
  return new Promise<Room>((resolve, reject) => {
    if (predicate(current())) {
      resolve(current());
      return;
    }
    const timer = setTimeout(() => {
      listeners.delete(listener);
      reject(new Error(`observer timed out after ${timeoutMs}ms waiting for room condition`));
    }, timeoutMs);
    const listener = (room: Room): void => {
      if (!predicate(room)) return;
      clearTimeout(timer);
      listeners.delete(listener);
      resolve(room);
    };
    listeners.add(listener);
  });
}
