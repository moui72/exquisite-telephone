import type { IncomingMessage, ServerResponse } from 'node:http';
import serveStatic from 'serve-static';

/**
 * Serves the client's built static assets (index.html, JS/CSS bundles) from
 * `rootDir`. Delegated to `serve-static` rather than hand-rolled file
 * serving (constitution Principle V) — it already handles content types,
 * range requests, and directory index resolution.
 */
export function createStaticRequestHandler(
  rootDir: string,
): (req: IncomingMessage, res: ServerResponse) => void {
  const serve = serveStatic(rootDir, { index: ['index.html'] });

  return (req, res) => {
    serve(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  };
}
