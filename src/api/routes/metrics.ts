/**
 * Metrics endpoint handler
 */

import { ServerResponse } from 'http';
import { getMetricsCollector } from '../../monitoring/metrics-collector.js';
import { HTTPServer } from '../http-server.js';

export function metricsHandler(httpServer: HTTPServer): (req: any, res: ServerResponse) => void {
  return (req, res) => {
    const metrics = getMetricsCollector().getMetrics();
    httpServer.sendJSON(res, 200, metrics);
  };
}
