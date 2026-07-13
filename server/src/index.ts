import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { createRoomStore } from './domain/roomStore.js';
import { createSocketServer } from './socket/server.js';
import { createStaticRequestHandler } from './staticServer.js';

const config = loadConfig(process.env);
const staticRequestHandler = createStaticRequestHandler(config.clientDistPath);
const httpServer = createServer(staticRequestHandler);
const store = createRoomStore();

createSocketServer(httpServer, store);

httpServer.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port}`);
});
