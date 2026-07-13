import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { createRoomStore } from './domain/roomStore.js';
import { createSocketServer } from './socket/server.js';

const config = loadConfig(process.env);
const httpServer = createServer();
const store = createRoomStore();

createSocketServer(httpServer, store);

httpServer.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port}`);
});
