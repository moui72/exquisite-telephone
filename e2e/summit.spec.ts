import { test, expect, chromium, firefox, webkit, type Browser } from '@playwright/test';
import { LobbyPage } from './pages/lobby.js';
import { WritingDrawingPage } from './pages/writingDrawing.js';
import { RevealPage } from './pages/reveal.js';
import { joinAsObserver } from './helpers/observer.js';
import { driveToReveal } from './helpers/flow.js';
import type { GamePlayer } from './fixtures.js';

/**
 * T009 — the flagship four-engine "summit" spec. A SINGLE test launches one
 * browser per engine (chromium, firefox, webkit, and the msedge Chromium
 * channel), each hosting one player, and runs the full flow through to
 * reveal. This is deliberately kept as one heavy flagship case, distinct
 * from the per-project matrix the rest of the suite runs — it is the only
 * test that puts all four engines in one room at once (infrastructure.md —
 * the summit spec).
 *
 * Because it drives its own engines, it must NOT also be multiplied across
 * the project matrix; it runs once, under the chromium project only (the
 * in-body skip below, using a plain boolean condition, keeps that intent
 * without the file-level callback form Playwright rejects).
 */
const TEST_SIGNAL = process.env.E2E_TEST_SIGNAL_SECRET ?? 'local-e2e-secret';

test('four engines in one room complete the flow to reveal', async ({ baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'summit runs once, not per project');
  test.setTimeout(300_000);
  const base = baseURL ?? 'http://localhost:4599';

  // One browser per engine; msedge is Chromium launched on its channel.
  const engines: { name: string; browser: Browser }[] = [
    { name: 'chromium', browser: await chromium.launch() },
    { name: 'firefox', browser: await firefox.launch() },
    { name: 'webkit', browser: await webkit.launch() },
    { name: 'msedge', browser: await chromium.launch({ channel: 'msedge' }) },
  ];

  const players: GamePlayer[] = [];
  try {
    // Each engine hosts exactly one player, in its own context (isolated
    // session token), each sending the test-signal header.
    for (const engine of engines) {
      const context = await engine.browser.newContext({
        baseURL: base,
        extraHTTPHeaders: { 'x-e2e-test-signal': TEST_SIGNAL },
      });
      const page = await context.newPage();
      players.push({
        name: engine.name,
        context,
        page,
        lobby: new LobbyPage(page),
        writing: new WritingDrawingPage(page),
        reveal: new RevealPage(page),
      });
    }

    const [host, ...guests] = players;
    await host.lobby.goto();
    const roomCode = await host.lobby.createRoom(host.name);
    for (const guest of guests) {
      await guest.lobby.goto();
      await guest.lobby.joinRoom(roomCode, guest.name);
    }

    // A tagged observer watches authoritative state and auto-plays a seat so
    // the round-gated flow completes; it also presents its cover to close
    // the decoration window.
    const observer = await joinAsObserver(roomCode, {
      baseURL: base,
      name: 'Docent',
      testSignal: TEST_SIGNAL,
      autoPlay: true,
    });

    try {
      await host.lobby.waitForPlayerCount(players.length + 1);
      await host.lobby.setLapsPerBook(1);
      await host.lobby.startGame();

      await observer.waitForStatus('writing');
      await driveToReveal(players, observer);

      const room = await observer.waitForStatus('reveal');
      for (const book of room.books) {
        expect(book.entries.length).toBeGreaterThan(0);
      }
    } finally {
      observer.close();
    }
  } finally {
    for (const engine of engines) await engine.browser.close();
  }
});
