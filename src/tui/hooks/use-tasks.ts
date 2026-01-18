/**
 * Task state management hook
 */

import { useState, useCallback } from 'react';
import { getTuiBridge, QueueStats } from '../bridge/tui-bridge';
import { Task, TaskStatus, CreateTaskOptions } from '../../core/types';

export interface UseTasksResult {
  tasks: Task[];
  stats: QueueStats;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  enqueueTask: (options: CreateTaskOptions) => Task;
  cancelTask: (id: string) => boolean;
  getTask: (id: string) => Task | undefined;
}

export function useTasks(filter?: { status?: TaskStatus; agentId?: string }): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    queued: 0,
    assigned: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bridge = getTuiBridge();

  const refresh = useCallback(() => {
    try {
      setTasks(bridge.listTasks(filter));
      setStats(bridge.getQueueStats());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const enqueueTask = useCallback((options: CreateTaskOptions): Task => {
    const task = bridge.enqueueTask(options);
    refresh();
    return task;
  }, [refresh]);

  const cancelTask = useCallback((id: string): boolean => {
    const result = bridge.cancelTask(id);
    refresh();
    return result;
  }, [refresh]);

  const getTask = useCallback((id: string): Task | undefined => {
    return bridge.getTask(id);
  }, []);

  return {
    tasks,
    stats,
    loading,
    error,
    refresh,
    enqueueTask,
    cancelTask,
    getTask,
  };
}
