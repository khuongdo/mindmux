/**
 * Event emitter for Server-Sent Events (SSE)
 * Handles real-time event streaming to clients
 */

import { ServerResponse } from 'http';

export interface SSEEvent {
  eventType: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface SSEClient {
  response: ServerResponse;
  addedAt: number;
}

export class EventEmitter {
  private clients: Set<SSEClient> = new Set();
  private eventQueue: SSEEvent[] = [];
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly CLIENT_TIMEOUT_MS = 60000; // 1 minute

  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        eventType: 'heartbeat',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
      this.cleanupStaleClients();
    }, 30000); // Every 30 seconds
  }

  private cleanupStaleClients(): void {
    const now = Date.now();
    const staleClients: SSEClient[] = [];

    this.clients.forEach((client) => {
      if (now - client.addedAt > this.CLIENT_TIMEOUT_MS) {
        staleClients.push(client);
      }
    });

    staleClients.forEach((client) => {
      try {
        client.response.end();
      } catch {
        // Already closed
      }
      this.clients.delete(client);
    });
  }

  subscribe(response: ServerResponse): void {
    const client: SSEClient = {
      response,
      addedAt: Date.now(),
    };

    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial comment
    response.write(`: SSE connection established\n\n`);

    this.clients.add(client);

    // Send queued events to new client
    this.eventQueue.forEach((event) => {
      this.sendToClient(client, event);
    });

    // Handle client disconnect
    response.on('close', () => {
      this.clients.delete(client);
    });

    response.on('error', () => {
      this.clients.delete(client);
    });
  }

  private sendToClient(client: SSEClient, event: SSEEvent): void {
    try {
      const eventString = `event: ${event.eventType}\ndata: ${JSON.stringify(event.data)}\n\n`;
      client.response.write(eventString);
    } catch {
      // Client might have disconnected
      this.clients.delete(client);
    }
  }

  broadcast(event: SSEEvent | Omit<SSEEvent, 'timestamp'>): void {
    const fullEvent: SSEEvent = {
      ...event,
      timestamp: (event as SSEEvent).timestamp || new Date().toISOString(),
    };

    // Add to queue for new subscribers
    this.eventQueue.push(fullEvent);
    if (this.eventQueue.length > this.MAX_QUEUE_SIZE) {
      this.eventQueue.shift();
    }

    // Send to all connected clients
    this.clients.forEach((client) => {
      this.sendToClient(client, fullEvent);
    });
  }

  emitAgentStatusChanged(agentId: string, status: string): void {
    this.broadcast({
      eventType: 'agent:status_changed',
      data: { agent_id: agentId, status, timestamp: new Date().toISOString() },
    });
  }

  emitTaskQueued(taskId: string, priority: number, requiredCapabilities: string[]): void {
    this.broadcast({
      eventType: 'task:queued',
      data: { task_id: taskId, priority, required_capabilities: requiredCapabilities },
    });
  }

  emitTaskCompleted(taskId: string, agentId: string, durationMs: number, success: boolean): void {
    this.broadcast({
      eventType: 'task:completed',
      data: { task_id: taskId, agent_id: agentId, duration_ms: durationMs, success },
    });
  }

  emitTaskFailed(taskId: string, agentId: string | undefined, errorMessage: string): void {
    this.broadcast({
      eventType: 'task:failed',
      data: { task_id: taskId, agent_id: agentId, error_message: errorMessage },
    });
  }

  emitError(component: string, message: string): void {
    this.broadcast({
      eventType: 'error',
      data: { component, message },
    });
  }

  emitAlert(level: string, message: string, data?: Record<string, unknown>): void {
    this.broadcast({
      eventType: 'alert:triggered',
      data: { level, message, ...data },
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.forEach((client) => {
      try {
        client.response.end();
      } catch {
        // Already closed
      }
    });
    this.clients.clear();
    this.eventQueue = [];
  }
}

let instance: EventEmitter | null = null;

export function getEventEmitter(): EventEmitter {
  if (!instance) {
    instance = new EventEmitter();
  }
  return instance;
}

export function resetEventEmitter(): void {
  if (instance) {
    instance.destroy();
  }
  instance = null;
}
