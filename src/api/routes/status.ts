/**
 * Status endpoint handler
 */

import { IncomingMessage, ServerResponse } from 'http';
import { getStatusAggregator } from '../../monitoring/status-aggregator.js';
import { HTTPServer } from '../http-server.js';

export function statusHandler(httpServer: HTTPServer): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    const statusAggregator = getStatusAggregator();
    const snapshot = statusAggregator.getSnapshot();

    // Parse query parameters for filtering
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const agentStatus = url.searchParams.get('agent_status');
    const taskStatus = url.searchParams.get('task_status');

    let response = snapshot;

    if (agentStatus) {
      response = {
        ...snapshot,
        agents: statusAggregator.filterByAgentStatus(agentStatus),
      };
    }

    if (taskStatus) {
      response = {
        ...response,
        tasks: statusAggregator.filterByTaskStatus(taskStatus),
      };
    }

    httpServer.sendJSON(res, 200, response);
  };
}
