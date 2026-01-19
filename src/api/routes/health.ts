/**
 * Health check endpoint handler
 */

import { ServerResponse } from 'http';
import { getHealthChecker } from '../../monitoring/health-checker.js';
import { HTTPServer } from '../http-server.js';

export async function healthHandler(httpServer: HTTPServer): Promise<(req: any, res: ServerResponse) => Promise<void>> {
  return async (req, res) => {
    const healthChecker = getHealthChecker();
    const health = await healthChecker.check();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;

    httpServer.sendJSON(res, statusCode, health);
  };
}
