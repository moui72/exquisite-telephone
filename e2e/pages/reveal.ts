import { expect, type Page } from '@playwright/test';

/**
 * Page object for the Reveal surface (client/src/lib/views/Reveal.svelte):
 * the gallery of completed books. Drives existing accessible selectors —
 * the "The Gallery Opens" heading and the per-book "Open <name>'s book"
 * buttons.
 */
export class RevealPage {
  constructor(private readonly page: Page) {}

  /** Resolve once this client has routed into the reveal gallery. */
  async waitForReveal(timeoutMs = 30_000): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'The Gallery Opens' })).toBeVisible({
      timeout: timeoutMs,
    });
  }

  /** Open a book's reading modal by its origin author's display name. */
  async openBook(authorName: string): Promise<void> {
    await this.page.getByRole('button', { name: `Open ${authorName}'s book` }).click();
  }

  async closeBook(): Promise<void> {
    await this.page.getByRole('button', { name: 'Close book' }).click();
  }

  /** Number of book cards on display. */
  async bookCount(): Promise<number> {
    return this.page.getByRole('button', { name: /'s book$/ }).count();
  }
}
