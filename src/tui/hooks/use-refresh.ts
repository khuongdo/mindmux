/**
 * Auto-refresh polling hook
 */

import { useEffect, useCallback, useState } from 'react';

export interface UseRefreshOptions {
  intervalMs: number;
  enabled?: boolean;
}

export function useRefresh(
  callback: () => void | Promise<void>,
  options: UseRefreshOptions
): { refresh: () => void; isRefreshing: boolean } {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { intervalMs, enabled = true } = options;

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await callback();
    } finally {
      setIsRefreshing(false);
    }
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    refresh();

    // Set up interval
    const interval = setInterval(refresh, intervalMs);

    return () => clearInterval(interval);
  }, [refresh, intervalMs, enabled]);

  return { refresh, isRefreshing };
}
