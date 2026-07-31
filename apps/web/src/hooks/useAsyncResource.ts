"use client";

import { useEffect, useState } from "react";

interface AsyncResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Module-level so it survives remounts (e.g. navigating away and back to the same page)
// within the session, not just re-renders — a plain useState/useRef would reset on unmount.
const _resourceCache = new Map<string, unknown>();
const _CACHE_TTL_MS = 60_000;
const _cacheTimestamps = new Map<string, number>();

/** Fetches one independent dashboard section. Each call site gets its own loading/error/
 * retry state — a failure here must never block sibling sections from rendering (this is
 * why CandidateDashboard fetches profile / GitHub summary / talent score separately
 * instead of one combined endpoint). `fetcher` must be stable (wrap in useCallback).
 *
 * `cacheKey`, when provided, enables stale-while-revalidate: on mount, a still-fresh
 * cached value (within `_CACHE_TTL_MS`) is shown immediately with `loading: false` while
 * a fresh fetch runs silently in the background and replaces it on success. This avoids
 * re-paying the backend's full round-trip (including the DB's cold-connection latency)
 * every time a user navigates back to a page they already visited this session. */
export function useAsyncResource<T>(
  fetcher: (() => Promise<T>) | null,
  cacheKey?: string,
): AsyncResourceState<T> & { retry: () => void } {
  const cached = cacheKey !== undefined ? (_resourceCache.get(cacheKey) as T | undefined) : undefined;
  const cachedAt = cacheKey !== undefined ? _cacheTimestamps.get(cacheKey) : undefined;
  const hasFreshCache = cached !== undefined && cachedAt !== undefined && Date.now() - cachedAt < _CACHE_TTL_MS;

  const [state, setState] = useState<AsyncResourceState<T>>(
    hasFreshCache
      ? { data: cached as T, error: null, loading: false }
      : { data: null, error: null, loading: fetcher !== null },
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!fetcher) return;
    let cancelled = false;
    (async () => {
      // Only show the loading spinner if we don't already have cached data on screen —
      // a background revalidation shouldn't blank out what the user is already looking at.
      setState((s) => (s.data === null ? { ...s, loading: true } : s));
      try {
        const data = await fetcher();
        if (!cancelled) {
          setState({ data, error: null, loading: false });
          if (cacheKey !== undefined) {
            _resourceCache.set(cacheKey, data);
            _cacheTimestamps.set(cacheKey, Date.now());
          }
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            // Keep any stale cached data visible on a background revalidation failure —
            // only replace it with an error state if we had nothing to show at all.
            data: s.data,
            error:
              err instanceof Error && err.message.includes("Failed to fetch")
                ? "Can't reach the backend right now."
                : err instanceof Error
                  ? err.message
                  : "Failed to load",
            loading: false,
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // fetcher is intentionally the only reactive dep — callers must memoize it (useCallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, tick]);

  return { ...state, retry: () => setTick((t) => t + 1) };
}
