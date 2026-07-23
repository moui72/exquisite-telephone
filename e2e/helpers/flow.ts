import { expect } from '@playwright/test';
import type { Game, GameFactory, GamePlayer } from '../fixtures.js';
import { joinAsObserver, type Observer } from './observer.js';
import { LobbyPage } from '../pages/lobby.js';

const TEST_SIGNAL = process.env.E2E_TEST_SIGNAL_SECRET ?? 'local-e2e-secret';

export interface CoreFlowOptions {
  /** Player display names (browser contexts). One observer seat is added on top. */
  playerNames: [string, ...string[]];
  /** Apply lobby settings on the host before the game starts. */
  applySettings?: (lobby: LobbyPage) => Promise<void>;
  /** Tick the small-game acknowledgement when starting below the floor. */
  acknowledgeSmallGame?: boolean;
  baseURL?: string;
}

/**
 * The reusable core flow (lobby → write/draw → reveal), shared by the flow
 * spec and the settings matrix. A tagged observer seat auto-plays so the
 * round-gated game completes while it reads authoritative state; the flow
 * asserts the `reveal` transition and that every book completed its laps.
 * Returns the final room and the game handle for further assertions.
 */
export async function runCoreFlow(
  game: GameFactory,
  options: CoreFlowOptions,
): Promise<{ observer: Observer; result: Game }> {
  const result = await game.create(options.playerNames);
  const observer = await joinAsObserver(result.roomCode, {
    baseURL: options.baseURL,
    name: 'Docent',
    testSignal: TEST_SIGNAL,
    autoPlay: true,
  });

  await result.host.lobby.waitForPlayerCount(options.playerNames.length + 1);
  if (options.applySettings) await options.applySettings(result.host.lobby);
  await result.host.lobby.startGame(options.acknowledgeSmallGame ?? false);

  await observer.waitForStatus('writing');
  await driveToReveal(result.players);

  const room = await observer.waitForStatus('reveal');
  const laps = room.lapsPerBook ?? 0;
  expect(laps).toBeGreaterThan(0);
  for (const book of room.books) {
    expect(book.entries).toHaveLength(room.players.length * laps);
  }
  return { observer, result };
}

/**
 * Poll-drive a set of browser players from the writing/drawing phase all
 * the way to the reveal gallery: each pass, every player that has a turn
 * ready acts on it, and any player in the cover-decoration window presents
 * their cover to close it early (rather than waiting out the 2-minute
 * window). Returns once every player's page shows the reveal gallery.
 *
 * Turn progression is round-gated on the server, so a pass that acts on
 * nobody simply means the round is mid-advance — the loop waits briefly and
 * retries until the deadline.
 */
export async function driveToReveal(players: GamePlayer[], timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let acted = false;
    for (const p of players) {
      if (await p.writing.playIfMyTurn()) acted = true;
      const present = p.page.getByRole('button', { name: 'Present your cover' });
      if (await present.isVisible().catch(() => false)) {
        await present.click();
        acted = true;
      }
    }
    if (await allAtReveal(players)) return;
    if (!acted) await players[0].page.waitForTimeout(250);
  }
  throw new Error('flow did not reach reveal within the timeout');
}

/** True when every player's page is showing the reveal gallery. */
export async function allAtReveal(players: GamePlayer[]): Promise<boolean> {
  for (const p of players) {
    const visible = await p.page
      .getByRole('heading', { name: 'The Gallery Opens' })
      .isVisible()
      .catch(() => false);
    if (!visible) return false;
  }
  return true;
}
