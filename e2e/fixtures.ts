import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { LobbyPage } from './pages/lobby.js';
import { WritingDrawingPage } from './pages/writingDrawing.js';
import { RevealPage } from './pages/reveal.js';

/**
 * The shared test-only signal (infrastructure.md — Curation-write
 * isolation on live beta). Sent on EVERY request each player context makes,
 * as the `x-e2e-test-signal` header, so the server tags this traffic and
 * routes its prompt-ratings away from beta's real Curation Store (T004).
 * The CI job supplies the real secret; locally it matches the value the
 * playwright.config webServer sets.
 */
const TEST_SIGNAL = process.env.E2E_TEST_SIGNAL_SECRET ?? 'local-e2e-secret';
const TEST_SIGNAL_HEADER = 'x-e2e-test-signal';

/** One seated player: its own browser context (isolated session token) and page. */
export interface GamePlayer {
  name: string;
  context: BrowserContext;
  page: Page;
  lobby: LobbyPage;
  writing: WritingDrawingPage;
  reveal: RevealPage;
}

export interface Game {
  roomCode: string;
  host: GamePlayer;
  /** All players including the host, in seat order. */
  players: GamePlayer[];
  /** The non-host players. */
  guests: GamePlayer[];
}

export interface GameFactory {
  /**
   * Create a room hosted by the first name and join the rest, each in its
   * OWN browser context (a shared context's localStorage session token
   * would collide across players — infrastructure.md). Returns once every
   * guest is seated in the host's lobby.
   */
  create(playerNames: [string, ...string[]]): Promise<Game>;
}

interface Fixtures {
  game: GameFactory;
}

export const test = base.extend<Fixtures>({
  game: async ({ browser, baseURL }, use) => {
    const created: BrowserContext[] = [];

    async function newPlayer(name: string): Promise<GamePlayer> {
      const context = await browser.newContext({
        baseURL: baseURL ?? undefined,
        extraHTTPHeaders: { [TEST_SIGNAL_HEADER]: TEST_SIGNAL },
      });
      created.push(context);
      const page = await context.newPage();
      return {
        name,
        context,
        page,
        lobby: new LobbyPage(page),
        writing: new WritingDrawingPage(page),
        reveal: new RevealPage(page),
      };
    }

    const factory: GameFactory = {
      async create(playerNames) {
        const [hostName, ...guestNames] = playerNames;
        const host = await newPlayer(hostName);
        await host.lobby.goto();
        const roomCode = await host.lobby.createRoom(hostName);

        const guests: GamePlayer[] = [];
        for (const guestName of guestNames) {
          const guest = await newPlayer(guestName);
          await guest.lobby.goto();
          await guest.lobby.joinRoom(roomCode, guestName);
          guests.push(guest);
        }

        // Host sees the full roster before the caller starts the game.
        await host.lobby.waitForPlayerCount(playerNames.length);
        return { roomCode, host, players: [host, ...guests], guests };
      },
    };

    await use(factory);

    for (const context of created) await context.close();
  },
});

export { expect } from '@playwright/test';
