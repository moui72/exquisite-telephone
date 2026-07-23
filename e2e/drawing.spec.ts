import { test, expect } from './fixtures.js';
import { joinAsObserver } from './helpers/observer.js';
import type { DrawOps, StrokeOp } from '@exquisite-telephone/shared';

/**
 * T008 — the deterministic drawing spec. A browser drives one intentional
 * stroke on the drawing canvas via pointer actions with FIXED endpoints,
 * submits the turn, and the exact submitted `DrawOps` are read back through
 * the observer helper and asserted — the vector model, never a pixel
 * comparison (infrastructure.md — Drawing assertions).
 *
 * Colour and width are deterministic app defaults (`#1e293b`, width 3 —
 * DrawingCanvas), so they are asserted exactly; the stroke geometry is
 * asserted at its endpoints (the canvas records the exact points the
 * pointer traversed, subject only to sub-pixel mouse rounding).
 */
test.setTimeout(120_000);

const STROKE: DrawOps = [
  { type: 'stroke', points: [{ x: 50, y: 60 }, { x: 250, y: 180 }], color: '#1e293b', width: 3 },
];

test('a drawn stroke is observed as exact vector DrawOps', async ({ game, baseURL }) => {
  const { roomCode, host, players, guests } = await game.create(['Ada', 'Bo', 'Cy']);
  const observer = await joinAsObserver(roomCode, {
    baseURL: baseURL ?? undefined,
    name: 'Docent',
    testSignal: process.env.E2E_TEST_SIGNAL_SECRET ?? 'local-e2e-secret',
    // Advance the opening (text) round, then go quiet — a competing drawing
    // submission would broadcast and reset the host's in-progress drawing.
    autoPlay: true,
    autoPlayTextTurnsOnly: true,
  });

  try {
    await host.lobby.waitForPlayerCount(players.length + 1);
    await host.lobby.startGame();
    await observer.waitForStatus('writing');

    // Round 0: every browser player submits its opening phrase (waiting for
    // each easel to render first); the observer auto-plays its own opening
    // text seat, so all four position-0 turns land and the round advances.
    await expect(host.page.getByLabel('Your phrase')).toBeVisible();
    await host.writing.submitText('an opening phrase');
    for (const g of guests) {
      await expect(g.page.getByLabel('Your phrase')).toBeVisible();
      await g.writing.submitText('an opening phrase');
    }

    // Round 1: the host now has a drawing turn. Wait for the turn EASEL
    // (its distinctive hint) rather than any "Drawing canvas" — the cover
    // canvas shown during the round-gated wait / 30s grace shares that
    // aria-label but its strokes go to a cover draft, not the turn. The
    // timeout covers the up-to-30s decoration grace before the easel takes
    // over. Then drive the fixed stroke and submit (no rating cast — this
    // spec is about the drawing payload).
    await expect(host.page.getByText('Draw exactly what the phrase says')).toBeVisible({
      timeout: 40_000,
    });
    await host.writing.drawStrokes(STROKE);
    await host.writing.submitDrawing();

    // The observer broadcast-reads the first position-1 drawing entry and
    // its exact parsed ops.
    const entry = await observer.waitForEntry((e) => e.type === 'drawing' && e.position === 1);
    const ops = observer.drawOpsFor(entry);

    // The dispatched pointer coordinates invert the canvas' own mapping, so
    // the observed vector ops equal the requested stroke EXACTLY — colour
    // and width are the deterministic app defaults, geometry is the two
    // dispatched endpoints.
    expect(ops).toEqual(STROKE);
    const op = ops[0] as StrokeOp;
    expect(op.type).toBe('stroke');
  } finally {
    observer.close();
  }
});
