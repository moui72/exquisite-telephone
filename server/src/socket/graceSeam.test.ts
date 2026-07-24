import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { createRoomStore } from '../domain/roomStore.js';
import { createLogger } from '../observability/logger.js';
import { createSocketServer, type TestSeamConfig } from './server.js';

/**
 * T006 — the test-only CLIENT grace seam. The 30s decoration grace
 * (GRACE_MS) is a client constant the server-side turn-timer seam cannot
 * reach, so shrinking it for test traffic needs a server → client echo:
 * on connection, a socket that the SAME gate as the existing seams has
 * flagged test traffic (seam enabled AND the `x-e2e-test-signal` header
 * matching the secret) is told, via a `testSeamActive` event, that it may
 * shorten the grace. This proves the echo fires ONLY under the signal and
 * is inert otherwise — the "shortened only under the test signal, no-op
 * otherwise" half; the client-side selection is asserted in
 * client/src/lib/views/grace.test.ts.
 */
const SECRET = 'unit-grace-signal';

describe('test-only client grace seam echo (T006)', () => {
  let httpServer: HttpServer;
  const clients: ClientSocket[] = [];

  afterEach(async () => {
    for (const c of clients) c.close();
    clients.length = 0;
    if (httpServer.listening) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });

  async function startServer(seam: TestSeamConfig): Promise<number> {
    httpServer = createServer();
    createSocketServer(httpServer, createRoomStore(), undefined, createLogger(), undefined, seam);
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    return (httpServer.address() as AddressInfo).port;
  }

  function connect(port: number, header: string | undefined): ClientSocket {
    const socket = ioClient(`http://localhost:${port}`, {
      forceNew: true,
      extraHeaders: header ? { 'x-e2e-test-signal': header } : undefined,
    });
    clients.push(socket);
    return socket;
  }

  /** Resolves true if `testSeamActive` arrives before the connection settles + grace window. */
  function sawSeamActive(socket: ClientSocket, ms = 1000): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), ms);
      socket.on('testSeamActive', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  it('emits testSeamActive to a connection presenting the matching signal', async () => {
    const port = await startServer({ enabled: true, secret: SECRET });
    const socket = connect(port, SECRET);
    expect(await sawSeamActive(socket)).toBe(true);
  });

  it('does NOT emit to an untagged connection', async () => {
    const port = await startServer({ enabled: true, secret: SECRET });
    const socket = connect(port, undefined);
    expect(await sawSeamActive(socket)).toBe(false);
  });

  it('does NOT emit to a WRONG-secret connection', async () => {
    const port = await startServer({ enabled: true, secret: SECRET });
    const socket = connect(port, 'not-the-secret');
    expect(await sawSeamActive(socket)).toBe(false);
  });

  it('is inert when the seam is disabled, even with the matching header', async () => {
    const port = await startServer({ enabled: false, secret: SECRET });
    const socket = connect(port, SECRET);
    expect(await sawSeamActive(socket)).toBe(false);
  });
});
