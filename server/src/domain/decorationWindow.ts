import type { Room } from '@exquisite-telephone/shared';
import type { Logger } from '../observability/logger.js';

/**
 * The cover-decoration window lasts 2 minutes (datamodel.md Normalization
 * Rules — Cover decoration; infrastructure.md Turn Timer Sweep).
 */
export const DECORATION_WINDOW_MS = 120_000;

/**
 * The single reveal transition, shared by the two paths that close the
 * decorating window: `onSubmitCover`'s all-submitted early close and the
 * sweep's expiry close (infrastructure.md). Extracted so the two can never
 * drift — it sets `status = 'reveal'`, clears `decorationWindowStartedAt`,
 * and emits the `game_completed` log that used to live in `onSubmitEntry`'s
 * completion branch (which now only opens the window).
 *
 * No-op unless the room is currently `decorating`, so a double call (e.g.
 * the sweep firing just after an early close) is harmless.
 */
export function transitionToReveal(room: Room, logger?: Logger): void {
  if (room.status !== 'decorating') {
    return;
  }
  room.status = 'reveal';
  room.decorationWindowStartedAt = null;
  logger?.log({ event: 'game_completed', outcome: 'success', roomId: room.id });
}

/**
 * Expiry backstop for the decorating window (infrastructure.md Turn Timer
 * Sweep): closes the window to `reveal` once
 * `decorationWindowStartedAt + DECORATION_WINDOW_MS` has passed. Pure and
 * independent of the turn-timer vote logic — and, crucially, independent of
 * `Room.turnTimerMinutes`, so a no-timer game's decorating window still
 * closes. Returns `true` if it transitioned (so the sweep can broadcast).
 */
export function closeDecorationWindowIfExpired(room: Room, now: number, logger?: Logger): boolean {
  if (room.status !== 'decorating') {
    return false;
  }
  const startedAt = room.decorationWindowStartedAt;
  if (startedAt == null || now < startedAt + DECORATION_WINDOW_MS) {
    return false;
  }
  transitionToReveal(room, logger);
  return true;
}
