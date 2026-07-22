/**
 * The `curation:aggregate` CLI (infrastructure.md Aggregation Pipe): the
 * aggregate view's ONLY reader. Deterministic, agent-free. Reads
 * `CURATION_DATA_PATH` via the shared `config`, folds + display-sanitizes
 * the event log, writes a durable snapshot (JSON + readable summary), then
 * archives the folded events so the store can accept new ratings again.
 *
 * Run in a deploy/restart window: the running server caches its event
 * count and only re-seeds it on restart (infrastructure.md — Restart to
 * refresh the cached count).
 */
import { loadConfig } from '../config.js';
import { createLogger } from '../observability/logger.js';
import { runAggregatePipe } from './pipe.js';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const logger = createLogger();
  const result = await runAggregatePipe(config.curationDataPath, { logger });
  console.log(
    `[curation:aggregate] snapshot: ${result.jsonPath}\n` +
      `[curation:aggregate] summary:  ${result.summaryPath}\n` +
      `[curation:aggregate] folded ${result.foldedNames.length}, ` +
      `skipped ${result.skippedNames.length}`,
  );
}

main().catch((error: unknown) => {
  console.error('[curation:aggregate] failed:', error);
  process.exitCode = 1;
});
