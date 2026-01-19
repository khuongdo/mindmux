/**
 * API Manager for MindMux
 * Orchestrates HTTP server and route registration
 */

import { getHTTPServer, HTTPServer } from './http-server.js';
import { healthHandler } from './routes/health.js';
import { statusHandler } from './routes/status.js';
import { eventsHandler } from './routes/events.js';
import { metricsHandler } from './routes/metrics.js';
import { createLogger } from '../monitoring/logger.js';

const logger = createLogger('APIManager');

export class APIManager {
  private httpServer: HTTPServer;
  private host: string;
  private port: number;
  private isStarted: boolean = false;

  constructor(host: string = 'localhost', port: number = 3000) {
    this.host = host;
    this.port = port;
    this.httpServer = getHTTPServer(host, port);
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // Health endpoint
    this.httpServer.register('GET', '/health', async (req, res) => {
      const handler = await healthHandler(this.httpServer);
      await handler(req, res);
    });

    // Status endpoint
    this.httpServer.register('GET', '/status', statusHandler(this.httpServer));

    // Metrics endpoint
    this.httpServer.register('GET', '/metrics', metricsHandler(this.httpServer));

    // Events endpoint (SSE)
    this.httpServer.register('GET', '/events', eventsHandler);

    // Root endpoint
    this.httpServer.register('GET', '/', (req, res) => {
      this.httpServer.sendJSON(res, 200, {
        name: 'MindMux Monitoring API',
        version: '0.1.0',
        endpoints: ['/health', '/status', '/metrics', '/events'],
      });
    });

    logger.info('routes_registered', { count: 5 });
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      logger.warn('api_already_started', {});
      return;
    }

    try {
      await this.httpServer.start();
      this.isStarted = true;
      logger.info('api_started', { host: this.host, port: this.port });
    } catch (error) {
      logger.error('api_start_failed', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      await this.httpServer.stop();
      this.isStarted = false;
      logger.info('api_stopped', {});
    } catch (error) {
      logger.error('api_stop_failed', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  getRunning(): boolean {
    return this.isStarted;
  }

  getHost(): string {
    return this.host;
  }

  getPort(): number {
    return this.port;
  }
}

let instance: APIManager | null = null;

export function getAPIManager(host?: string, port?: number): APIManager {
  if (!instance) {
    instance = new APIManager(host, port);
  }
  return instance;
}

export function resetAPIManager(): void {
  instance = null;
}
