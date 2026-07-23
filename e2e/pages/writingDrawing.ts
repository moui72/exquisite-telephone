import { expect, type Page } from '@playwright/test';
import type { DrawOps } from '@exquisite-telephone/shared';

/**
 * Page object for the Writing/Drawing surface
 * (client/src/lib/views/WritingDrawing.svelte). Text and drawing turns
 * share one "Present your contribution" submit; the drawing canvas is
 * targeted by its existing `role="img"` / `aria-label="Drawing canvas"`.
 */
export class WritingDrawingPage {
  constructor(private readonly page: Page) {}

  /**
   * The distinctive hint on the drawing TURN easel — used to distinguish it
   * from the cover-decoration canvas (which shares the "Drawing canvas"
   * aria-label but appears during the round-gated wait / 30s grace, and
   * whose strokes go to a cover draft, not the turn). Only when this hint is
   * present is the visible canvas the one whose submission is the turn.
   */
  private readonly drawTurnHint = 'Draw exactly what the phrase says';

  /** True when it is this player's turn to act (a turn easel is shown). */
  async isMyTurn(): Promise<boolean> {
    const drawing = await this.page
      .getByText(this.drawTurnHint)
      .isVisible()
      .catch(() => false);
    if (drawing) return true;
    return this.page
      .getByLabel('Your phrase')
      .isVisible()
      .catch(() => false);
  }

  /** Submit a free-form / blind-guess text turn. */
  async submitText(phrase: string): Promise<void> {
    await this.page.getByLabel('Your phrase').fill(phrase);
    await this.submit();
  }

  /** Pick a dealt curated phrase (or write one in) on the opening turn. */
  async chooseCuratedPrompt(phrase: string): Promise<void> {
    await this.page.getByRole('radio', { name: phrase }).check();
    await this.submit();
  }

  async writeInCuratedPrompt(phrase: string): Promise<void> {
    await this.page.getByRole('radio', { name: 'Write my own instead' }).check();
    await this.page.getByLabel('Your own phrase').fill(phrase);
    await this.submit();
  }

  /**
   * Draw the given ops as deterministic pointer gestures on the canvas,
   * then submit. Endpoints/colour/width are fixed by the caller so the
   * observer can assert the exact submitted DrawOps (infrastructure.md —
   * Drawing assertions: the vector model, not pixels).
   *
   * NOTE: the app derives colour/width from its own tool state, so a test
   * that asserts exact ops should set the tool to match, or assert only the
   * stroke geometry it controls. This helper drives the geometry.
   */
  async drawStrokes(ops: DrawOps): Promise<void> {
    const canvas = this.page.getByRole('img', { name: 'Drawing canvas' });
    await expect(canvas).toBeVisible();
    const strokes = ops.filter((op): op is Extract<DrawOps[number], { type: 'stroke' }> => op.type === 'stroke');
    // Dispatch real PointerEvents directly on the canvas element, with
    // clientX/clientY computed to invert the component's own coordinate
    // mapping (toPoint), so the recorded stroke points equal the requested
    // canvas coordinates exactly. This is more deterministic than driving
    // the OS mouse (no sub-pixel rounding, no reliance on virtual-pointer
    // capture) and makes the submitted DrawOps exactly assertable. The
    // canvas' setPointerCapture — which throws for a synthetic pointer — is
    // stubbed to a no-op for the duration.
    await canvas.evaluate((el, strokeList) => {
      const canvasEl = el as HTMLCanvasElement;
      const rect = canvasEl.getBoundingClientRect();
      const original = canvasEl.setPointerCapture;
      canvasEl.setPointerCapture = () => {};
      const toClient = (p: { x: number; y: number }) => ({
        clientX: rect.left + (p.x * rect.width) / canvasEl.width,
        clientY: rect.top + (p.y * rect.height) / canvasEl.height,
      });
      const fire = (type: string, p: { x: number; y: number }) =>
        canvasEl.dispatchEvent(new PointerEvent(type, { ...toClient(p), pointerId: 1, bubbles: true }));
      for (const stroke of strokeList as { points: { x: number; y: number }[] }[]) {
        if (stroke.points.length === 0) continue;
        fire('pointerdown', stroke.points[0]);
        for (const p of stroke.points.slice(1)) fire('pointermove', p);
        fire('pointerup', stroke.points[stroke.points.length - 1]);
      }
      canvasEl.setPointerCapture = original;
    }, strokes);
  }

  async rateOpeningPhrase(value: 'up' | 'down'): Promise<void> {
    const name = value === 'up' ? 'Thumbs up — fun to draw' : 'Thumbs down — not fun to draw';
    await this.page.getByRole('button', { name }).click();
  }

  async submitDrawing(): Promise<void> {
    await this.submit();
  }

  /** A default single deterministic stroke used to drive drawing turns. */
  static readonly DEFAULT_STROKE: DrawOps = [
    { type: 'stroke', points: [{ x: 40, y: 40 }, { x: 280, y: 200 }], color: '#000000', width: 3 },
  ];

  /**
   * If this player currently has a turn to act, complete it and return
   * true; otherwise return false. Handles all three turn shapes — a curated
   * opening (pick the first dealt phrase), a free-form/blind text turn, and
   * a drawing turn (a default deterministic stroke) — so a flow driver can
   * simply poll every player until the game reaches reveal.
   */
  async playIfMyTurn(phrase = 'a phrase worth drawing'): Promise<boolean> {
    const curatedRadio = this.page.locator('input[name="curated-prompt"]').first();
    if (await curatedRadio.isVisible().catch(() => false)) {
      await curatedRadio.check();
      await this.submit();
      return true;
    }
    const phraseInput = this.page.getByLabel('Your phrase');
    if (await phraseInput.isVisible().catch(() => false)) {
      await phraseInput.fill(phrase);
      await this.submit();
      return true;
    }
    // Only a genuine drawing TURN (identified by the easel hint) — never the
    // cover-decoration canvas shown during the round-gated wait / 30s grace.
    if (await this.page.getByText(this.drawTurnHint).isVisible().catch(() => false)) {
      await this.drawStrokes(WritingDrawingPage.DEFAULT_STROKE);
      // Rate the opening-phrase draw turn when the control is present
      // (position 1 only); optional and never gates the submit.
      const thumbsUp = this.page.getByRole('button', { name: 'Thumbs up — fun to draw' });
      if (await thumbsUp.isVisible().catch(() => false)) await thumbsUp.click();
      await this.submitDrawing();
      return true;
    }
    return false;
  }

  private async submit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Present your contribution' }).click();
  }
}
