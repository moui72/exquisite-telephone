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

  /** True when it is this player's turn to act (the easel is shown). */
  async isMyTurn(): Promise<boolean> {
    const drawing = await this.page
      .getByRole('img', { name: 'Drawing canvas' })
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
    const box = await canvas.boundingBox();
    if (!box) throw new Error('drawing canvas has no bounding box');
    for (const op of ops) {
      if (op.type !== 'stroke' || op.points.length === 0) continue;
      // Canvas intrinsic size is 320x240; map op coords into the on-screen box.
      const sx = box.width / 320;
      const sy = box.height / 240;
      const [first, ...rest] = op.points;
      await this.page.mouse.move(box.x + first.x * sx, box.y + first.y * sy);
      await this.page.mouse.down();
      for (const p of rest) await this.page.mouse.move(box.x + p.x * sx, box.y + p.y * sy);
      await this.page.mouse.up();
    }
  }

  async rateOpeningPhrase(value: 'up' | 'down'): Promise<void> {
    const name = value === 'up' ? 'Thumbs up — fun to draw' : 'Thumbs down — not fun to draw';
    await this.page.getByRole('button', { name }).click();
  }

  async submitDrawing(): Promise<void> {
    await this.submit();
  }

  private async submit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Present your contribution' }).click();
  }
}
