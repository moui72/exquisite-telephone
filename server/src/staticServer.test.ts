import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStaticRequestHandler } from './staticServer.js';

describe('static request handler', () => {
  let httpServer: HttpServer;
  let staticRoot: string;
  let port: number;

  beforeEach(async () => {
    staticRoot = mkdtempSync(join(tmpdir(), 'et-static-'));
    writeFileSync(join(staticRoot, 'index.html'), '<html><body>hello</body></html>');

    const handler = createStaticRequestHandler(staticRoot);
    httpServer = createServer(handler);
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    rmSync(staticRoot, { recursive: true, force: true });
  });

  it('serves index.html for a request to /', async () => {
    const response = await fetch(`http://localhost:${port}/`);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('hello');
  });

  it('responds 404 for a path with no matching static file', async () => {
    const response = await fetch(`http://localhost:${port}/does-not-exist.js`);

    expect(response.status).toBe(404);
  });
});
