import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { createCurationStore } from './domain/curationStore.js';
import { createRoomStore } from './domain/roomStore.js';
import { createSessionTokenStore } from './domain/sessionTokenStore.js';
import { startTimerSweep } from './domain/timerSweep.js';
import { createLogger } from './observability/logger.js';
import { createSocketServer } from './socket/server.js';
import { createHttpRequestHandler } from './httpRequestHandler.js';

const config = loadConfig(process.env);
const httpRequestHandler = createHttpRequestHandler(config.clientDistPath);
const httpServer = createServer(httpRequestHandler);
const store = createRoomStore();
const sessionStore = createSessionTokenStore();
const logger = createLogger();
// The one piece of durable state in this app (infrastructure.md Curation
// Store). Constructed here and injected -- the entry point wires, it never
// defines (constitution Principle X); all file I/O lives in the store.
const curationStore = createCurationStore(config.curationDataPath, logger);

const io = createSocketServer(httpServer, store, sessionStore, logger, curationStore);
startTimerSweep(store, io, undefined, logger);

httpServer.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port}`);
});
