/**
 * Server-Sent Events (SSE) endpoint handler
 */

import { IncomingMessage, ServerResponse } from 'http';
import { getEventEmitter } from '../../monitoring/event-emitter.js';
import { createLogger } from '../../monitoring/logger.js';

const logger = createLogger('EventsRoute');

export function eventsHandler(req: IncomingMessage, res: ServerResponse): void {
  const emitter = getEventEmitter();

  logger.debug('sse_client_connected', { clientCount: emitter.getClientCount() + 1 });

  try {
    emitter.subscribe(res);
  } catch (error) {
    logger.error('sse_subscription_error', {}, error instanceof Error ? error : new Error(String(error)));
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to subscribe to events' }));
  }
}
