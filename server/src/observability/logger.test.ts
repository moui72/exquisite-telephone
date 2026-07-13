import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';

describe('structured logger (constitution Principle IX)', () => {
  it('emits a JSON line with event, outcome, timestamp, and given fields', () => {
    const lines: string[] = [];
    const logger = createLogger((line) => lines.push(line));

    logger.log({ event: 'room_created', outcome: 'success', roomId: 'ABCDE' });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed).toMatchObject({ event: 'room_created', outcome: 'success', roomId: 'ABCDE' });
    expect(typeof parsed.timestamp).toBe('string');
  });

  it('supports a failure outcome with a reason, reproducible without a debugger', () => {
    const lines: string[] = [];
    const logger = createLogger((line) => lines.push(line));

    logger.log({
      event: 'player_reconnected',
      outcome: 'failure',
      reason: 'invalid-token',
    });

    const parsed = JSON.parse(lines[0]!);
    expect(parsed.outcome).toBe('failure');
    expect(parsed.reason).toBe('invalid-token');
  });
});
