"use client";

import { useEffect, useState } from "react";

interface AsyncResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Fetches one independent dashboard section. Each call site gets its own loading/error/
 * retry state — a failure here must never block sibling sections from rendering (this is
 * why CandidateDashboard fetches profile / GitHub summary / talent score separately
 * instead of one combined endpoint). `fetcher` must be stable (wrap in useCallback). */
export function useAsyncResource<T>(fetcher: (() => Promise<T>) | null): AsyncResourceState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncResourceState<T>>({ data: null, error: null, loading: fetcher !== null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!fetcher) return;
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const data = await fetcher();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (err) {
        if (!cancelled) {
          setState({
            data: null,
            error:
              err instanceof Error && err.message.includes("Failed to fetch")
                ? "Can't reach the backend right now."
                : err instanceof Error
                  ? err.message
                  : "Failed to load",
            loading: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // fetcher is intentionally the only reactive dep — callers must memoize it (useCallback).
  }, [fetcher, tick]);

  return { ...state, retry: () => setTick((t) => t + 1) };
}
