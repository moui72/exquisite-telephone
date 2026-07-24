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
  await driveToReveal(result.players, observer);

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
 *
 * A DOM click is never trusted as proof that a turn landed. After a pass
 * that played at least one turn, this confirms the round actually advanced
 * by consulting the observer's AUTHORITATIVE room snapshot (total entry
 * count grew) before moving on — closing the check-then-act window that,
 * combined with the ambiguous submit name (T001) and the unbounded action
 * retry (T002), produced the webkit/msedge flake
 * (research-webkit-e2e-flakes-2026-07-24.md). If a submit silently timed
 * out (`playIfMyTurn` swallows the `actionTimeout` and returns false), the
 * server state simply won't have advanced and the next pass re-acts.
 */
export async function driveToReveal(
  players: GamePlayer[],
  observer: Observer,
  timeoutMs = 180_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const entriesBefore = observer.allEntries().length;
    let playedTurn = false;
    let acted = false;
    for (const p of players) {
      if (await p.writing.playIfMyTurn()) {
        playedTurn = true;
        acted = true;
      }
      const present = p.page.getByRole('button', { name: 'Present your cover' });
      if (await present.isVisible().catch(() => false)) {
        await present.click();
        acted = true;
      }
    }
    if (await allAtReveal(players)) return;
    if (playedTurn) {
      // Verify the click(s) actually advanced authoritative state before
      // the next pass, rather than trusting the DOM. Covers don't add
      // entries, so only require this when a turn was played; the room
      // reaching decorating/reveal is also forward progress.
      await waitForProgress(observer, entriesBefore + 1, players[0]).catch(() => {});
    } else if (!acted) {
      await players[0].page.waitForTimeout(250);
    }
  }
  throw new Error('flow did not reach reveal within the timeout');
}

/**
 * Resolves once the observer's authoritative snapshot shows real forward
 * progress — total entry count reached `minEntries`, or the room left the
 * `writing` phase (decorating/reveal) — or the short window elapses (in
 * which case the caller simply re-polls and re-acts).
 */
async function waitForProgress(
  observer: Observer,
  minEntries: number,
  pacer: GamePlayer,
  timeoutMs = 8_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (observer.allEntries().length >= minEntries) return;
    if (observer.latestRoom().status !== 'writing') return;
    await pacer.page.waitForTimeout(200);
  }
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
