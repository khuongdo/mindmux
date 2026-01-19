/**
 * Request logging middleware
 */

import { IncomingMessage, ServerResponse } from 'http';
import { createLogger } from '../../monitoring/logger.js';

const logger = createLogger('APIMiddleware');

export function requestLoggingMiddleware(req: IncomingMessage, res: ServerResponse): void {
  const startTime = Date.now();
  const method = req.method || 'GET';
  const url = req.url || '/';

  // Intercept res.end to capture response
  const originalEnd = res.end as any;
  let statusCode = res.statusCode || 500;

  (res.end as any) = function (...args: any[]) {
    statusCode = res.statusCode || 500;
    const duration = Date.now() - startTime;

    logger.info('http_request', {
      method,
      url,
      status: statusCode,
      duration_ms: duration,
    });

    return originalEnd.apply(res, args);
  };
}
