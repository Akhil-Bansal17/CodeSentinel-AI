import { useCallback, useEffect, useState } from "react";
import { getHealthStatus } from "../services/healthService";
import { HealthResponse } from "../types/api";

export interface HealthState {
  data: HealthResponse | null;
  isLoading: boolean;
  isAvailable: boolean;
  error: string | null;
  lastChecked: Date | null;
  refetch: () => Promise<void>;
}

export function useHealth(pollIntervalMs: number = 30000): HealthState {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await getHealthStatus();
      setData(response);
      setIsAvailable(true);
      setError(null);
      setLastChecked(new Date());
    } catch (err) {
      setIsAvailable(false);
      setData(null);
      setError(err instanceof Error ? err.message : "Backend service unavailable");
      setLastChecked(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const manualRefetch = useCallback(async () => {
    setIsLoading(true);
    await checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    let isMounted = true;

    const performCheck = async () => {
      try {
        const response = await getHealthStatus();
        if (isMounted) {
          setData(response);
          setIsAvailable(true);
          setError(null);
          setLastChecked(new Date());
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsAvailable(false);
          setData(null);
          setError(err instanceof Error ? err.message : "Backend service unavailable");
          setLastChecked(new Date());
          setIsLoading(false);
        }
      }
    };

    performCheck();

    if (pollIntervalMs > 0) {
      const interval = setInterval(performCheck, pollIntervalMs);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [pollIntervalMs]);

  return {
    data,
    isLoading,
    isAvailable,
    error,
    lastChecked,
    refetch: manualRefetch,
  };
}
