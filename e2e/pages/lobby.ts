import { expect, type Page } from '@playwright/test';

/**
 * Page object for the Lobby surface (client/src/lib/views/Lobby.svelte).
 * Drives the existing accessible selectors — labelled inputs, role="tab"
 * buttons, the host-setting `<select>`s by id/label — and the one added
 * `data-testid` (the room-code display) where no stable selector existed.
 */
export class LobbyPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /** Create a room as host; returns the generated room code. */
  async createRoom(displayName: string): Promise<string> {
    await this.page.getByRole('tab', { name: 'Create room' }).click();
    await this.page.getByLabel('Display name').fill(displayName);
    await this.page.getByRole('button', { name: 'Create room' }).click();
    return this.roomCode();
  }

  /** Join an existing room by code. */
  async joinRoom(code: string, displayName: string): Promise<void> {
    await this.page.getByRole('tab', { name: 'Join room' }).click();
    await this.page.getByLabel('Display name').fill(displayName);
    await this.page.getByLabel('Room code').fill(code);
    await this.page.getByRole('button', { name: 'Join room' }).click();
  }

  /** The room code shown on the guest-list card, once the room exists. */
  async roomCode(): Promise<string> {
    const el = this.page.getByTestId('room-code');
    await expect(el).toBeVisible();
    return (await el.innerText()).trim();
  }

  /** Wait until the guest list shows `count` seated players (host view). */
  async waitForPlayerCount(count: number): Promise<void> {
    await expect(this.page.getByRole('listitem')).toHaveCount(count);
  }

  async setMonochrome(on: boolean): Promise<void> {
    const box = this.page.locator('#monochrome-toggle');
    if ((await box.isChecked()) !== on) await box.click();
  }

  async setTurnTimerMinutes(value: 15 | 30 | 60 | 240 | 720 | null): Promise<void> {
    await this.page.locator('#turn-timer-select').selectOption(value === null ? '' : String(value));
  }

  async setLapsPerBook(value: 1 | 2 | 3): Promise<void> {
    await this.page.locator('#laps-per-book-select').selectOption(String(value));
  }

  async setPromptMode(mode: 'free-form' | 'curated'): Promise<void> {
    await this.page.locator('#prompt-mode-select').selectOption(mode);
  }

  async setCuratedPromptCount(count: 2 | 3 | 4 | 5): Promise<void> {
    await this.page.locator('#curated-prompt-count-select').selectOption(String(count));
  }

  async setAllowPromptWriteIn(on: boolean): Promise<void> {
    const box = this.page.locator('#allow-prompt-write-in-toggle');
    if ((await box.isChecked()) !== on) await box.click();
  }

  /**
   * Start the game. When the active roster is below the recommended floor,
   * the host must tick the small-game acknowledgement first; pass
   * `acknowledgeSmallGame` to do so.
   */
  async startGame(acknowledgeSmallGame = false): Promise<void> {
    if (acknowledgeSmallGame) {
      const ack = this.page.getByRole('checkbox', { name: /intimately attended/i });
      if (await ack.isVisible()) await ack.check();
    }
    await this.page.getByRole('button', { name: /Commence the Exhibition/i }).click();
  }
}
