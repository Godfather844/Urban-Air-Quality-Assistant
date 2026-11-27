import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdvisoryResponsePayload, AirQualityReading } from '../../shared/airQuality.ts';
import { fetchAdvisory, isAbortError } from '../lib/api.ts';

export interface UseAdvisoryResult {
  advisoryData: AdvisoryResponsePayload | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Loads and manages the AI-generated (or fallback) advisory for the active reading,
 * automatically cancelling stale in-flight requests when the user switches cities.
 */
export function useAdvisory(reading: AirQualityReading): UseAdvisoryResult {
  const [advisoryData, setAdvisoryData] = useState<AdvisoryResponsePayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeControllerRef = useRef<AbortController | null>(null);

  const loadAdvisory = useCallback(async (target: AirQualityReading, forceRefresh: boolean) => {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchAdvisory(target, {
        signal: controller.signal,
        refresh: forceRefresh,
      });
      setAdvisoryData(result);
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to fetch air quality guidance. Please try again.'
      );
    } finally {
      if (activeControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAdvisory(reading, false);
    return () => {
      activeControllerRef.current?.abort();
    };
  }, [reading, loadAdvisory]);

  const refresh = useCallback(() => {
    void loadAdvisory(reading, true);
  }, [reading, loadAdvisory]);

  return { advisoryData, isLoading, error, refresh };
}
