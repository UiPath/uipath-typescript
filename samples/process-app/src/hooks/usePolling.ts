import { useEffect, useRef, useCallback, useState } from 'react';

interface UsePollingOptions<T> {
  /** The async function to poll */
  fetchFn: () => Promise<T>;
  /** Polling interval in milliseconds (default: 5000ms) */
  interval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Callback when data is fetched successfully */
  onSuccess?: (data: T) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Whether to fetch immediately on mount/enable (default: true) */
  immediate?: boolean;
}

interface UsePollingResult<T> {
  /** The latest fetched data */
  data: T | null;
  /** Whether the poll is currently fetching */
  isPolling: boolean;
  /** Any error from the last fetch */
  error: Error | null;
  /** Manually trigger a fetch */
  refetch: () => Promise<void>;
  /** Start polling */
  start: () => void;
  /** Stop polling */
  stop: () => void;
  /** Whether polling is currently active */
  isActive: boolean;
  /** Timestamp of last successful fetch */
  lastUpdated: Date | null;
}

/**
 * A custom hook for polling data at regular intervals.
 * Useful for real-time updates without WebSocket support.
 */
export function usePolling<T>({
  fetchFn,
  interval = 5000,
  enabled = true,
  onSuccess,
  onError,
  immediate = true,
}: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isActive, setIsActive] = useState(enabled);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Sync isActive with enabled prop
  useEffect(() => {
    setIsActive(enabled);
  }, [enabled]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchFnRef = useRef(fetchFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const executeFetch = useCallback(async () => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[Polling ${timestamp}] Starting fetch...`);
    setIsPolling(true);
    setError(null);

    try {
      const result = await fetchFnRef.current();
      setData(result);
      setLastUpdated(new Date());
      console.log(`[Polling ${timestamp}] ✓ Fetch successful`, result);
      onSuccessRef.current?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`[Polling ${timestamp}] ✗ Fetch failed:`, error.message);
      onErrorRef.current?.(error);
    } finally {
      setIsPolling(false);
    }
  }, []);

  const start = useCallback(() => {
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refetch = useCallback(async () => {
    await executeFetch();
  }, [executeFetch]);

  // Track previous enabled state to detect when polling starts
  const prevEnabledRef = useRef(enabled);

  // Setup polling interval
  useEffect(() => {
    const wasEnabled = prevEnabledRef.current;
    prevEnabledRef.current = enabled;

    if (!isActive || !enabled) {
      if (intervalRef.current) {
        console.log('[Polling] Stopped - polling disabled or inactive');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear existing interval when restarting
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    console.log(`[Polling] Started - interval: ${interval}ms, immediate: ${immediate}`);

    // Execute immediately if requested, or when enabled changes from false to true
    if (immediate || (!wasEnabled && enabled)) {
      console.log('[Polling] Executing immediate fetch');
      executeFetch();
    }

    // Setup interval
    intervalRef.current = setInterval(executeFetch, interval);

    return () => {
      if (intervalRef.current) {
        console.log('[Polling] Cleanup - clearing interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, enabled, interval, immediate, executeFetch]);

  return {
    data,
    isPolling,
    error,
    refetch,
    start,
    stop,
    isActive,
    lastUpdated,
  };
}
