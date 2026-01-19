/**
 * HTTP server for MindMux monitoring API
 * Serves health checks, status, metrics, and SSE endpoints
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createLogger } from '../monitoring/logger.js';

const logger = createLogger('HTTPServer');

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

interface Route {
  method: string;
  path: string;
  handler: Handler;
}

export class HTTPServer {
  private server: ReturnType<typeof createServer> | null = null;
  private routes: Route[] = [];
  private host: string;
  private port: number;
  private isRunning: boolean = false;

  constructor(host: string = 'localhost', port: number = 3000) {
    this.host = host;
    this.port = port;
  }

  register(method: string, path: string, handler: Handler): void {
    this.routes.push({ method, path, handler });
  }

  private matchRoute(
    method: string,
    path: string
  ): { handler: Handler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method.toUpperCase() !== method.toUpperCase()) continue;

      // Exact match
      if (route.path === path) {
        return { handler: route.handler, params: {} };
      }

      // Wildcard match (e.g., /events?...)
      const pattern = route.path.replace(/\?.*$/, '');
      if (path.startsWith(pattern)) {
        return { handler: route.handler, params: {} };
      }
    }
    return null;
  }

  sendJSON(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify(data, null, 2));
  }

  private sendError(res: ServerResponse, status: number, message: string): void {
    this.sendJSON(res, status, { error: message });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(async (req, res) => {
        try {
          const method = req.method || 'GET';
          const url = req.url || '/';
          const pathname = url.split('?')[0];

          const match = this.matchRoute(method, pathname);

          if (!match) {
            this.sendError(res, 404, 'Not found');
            return;
          }

          // CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }

          await match.handler(req, res);
        } catch (error) {
          logger.error('request_error', {}, error instanceof Error ? error : new Error(String(error)));
          this.sendError(res, 500, 'Internal server error');
        }
      });

      this.server.listen(this.port, this.host, () => {
        this.isRunning = true;
        logger.info('server_started', { host: this.host, port: this.port });
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('server_error', {}, error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        this.isRunning = false;
        logger.info('server_stopped', {});
        resolve();
      });
    });
  }

  getRunning(): boolean {
    return this.isRunning;
  }
}

let instance: HTTPServer | null = null;

export function getHTTPServer(host?: string, port?: number): HTTPServer {
  if (!instance) {
    instance = new HTTPServer(host, port);
  }
  return instance;
}

export function resetHTTPServer(): void {
  instance = null;
}
