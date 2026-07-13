/**
 * Structured, machine-readable log events for non-trivial server
 * operations (constitution Principle IX): room creation, player
 * join/leave/reconnect, turn advance, and game completion. Each event
 * carries an outcome and enough identifiers (roomId, playerId, etc.) to
 * reproduce it without a debugger attached.
 */
export interface LogEvent {
  event: string;
  outcome: 'success' | 'failure';
  [key: string]: unknown;
}

export interface Logger {
  log(event: LogEvent): void;
}

export function createLogger(sink: (line: string) => void = defaultSink): Logger {
  return {
    log(event: LogEvent) {
      sink(JSON.stringify({ timestamp: new Date().toISOString(), ...event }));
    },
  };
}

function defaultSink(line: string): void {
  console.log(line);
}
