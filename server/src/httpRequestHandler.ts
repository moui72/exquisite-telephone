import type { IncomingMessage, ServerResponse } from 'node:http';
import { createStaticRequestHandler } from './staticServer.js';

/**
 * Composes the server's plain-HTTP request handling: a lightweight
 * `/healthz` route (used by Fly's health check, see fly.toml) checked
 * first, falling through to serving the client's static build for
 * everything else. Kept out of `index.ts` per constitution Principle X
 * (entry point wires dependencies only) and out of `staticServer.ts` so
 * each module keeps a single responsibility.
 */
export function createHttpRequestHandler(
  clientDistPath: string,
): (req: IncomingMessage, res: ServerResponse) => void {
  const staticHandler = createStaticRequestHandler(clientDistPath);

  return (req, res) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.statusCode = 200;
      res.end('ok');
      return;
    }

    staticHandler(req, res);
  };
}
