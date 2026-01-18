/**
 * Agent state management hook
 */

import { useState, useCallback } from 'react';
import { getTuiBridge, AgentWithSession } from '../bridge/tui-bridge';
import { AgentType } from '../../core/types';

export interface UseAgentsResult {
  agents: AgentWithSession[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createAgent: (name: string, type: AgentType, capabilities: string[]) => Promise<void>;
  deleteAgent: (id: string) => Promise<boolean>;
  startAgent: (id: string) => Promise<void>;
  stopAgent: (id: string) => Promise<void>;
}

export function useAgents(): UseAgentsResult {
  const [agents, setAgents] = useState<AgentWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bridge = getTuiBridge();

  const refresh = useCallback(async () => {
    try {
      const agentList = await bridge.listAgents();
      setAgents(agentList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (
    name: string,
    type: AgentType,
    capabilities: string[]
  ) => {
    try {
      bridge.createAgent(name, type, capabilities);
      await refresh();
    } catch (err) {
      throw err;
    }
  }, [refresh]);

  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    const result = bridge.deleteAgent(id);
    await refresh();
    return result;
  }, [refresh]);

  const startAgent = useCallback(async (id: string) => {
    await bridge.startAgent(id);
    await refresh();
  }, [refresh]);

  const stopAgent = useCallback(async (id: string) => {
    await bridge.stopAgent(id);
    await refresh();
  }, [refresh]);

  return {
    agents,
    loading,
    error,
    refresh,
    createAgent,
    deleteAgent,
    startAgent,
    stopAgent,
  };
}
