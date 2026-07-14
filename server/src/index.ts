import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { createRoomStore } from './domain/roomStore.js';
import { createSessionTokenStore } from './domain/sessionTokenStore.js';
import { createLogger } from './observability/logger.js';
import { createSocketServer } from './socket/server.js';
import { createHttpRequestHandler } from './httpRequestHandler.js';

const config = loadConfig(process.env);
const httpRequestHandler = createHttpRequestHandler(config.clientDistPath);
const httpServer = createServer(httpRequestHandler);
const store = createRoomStore();
const sessionStore = createSessionTokenStore();
const logger = createLogger();

createSocketServer(httpServer, store, sessionStore, logger);

httpServer.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port}`);
});
