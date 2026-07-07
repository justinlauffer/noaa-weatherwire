"use client";

import { useCallback, useEffect, useState } from "react";

import { useMessageStream } from "@/hooks/useMessageStream";
import { getHealth } from "@/lib/api";
import type { IngestStatus } from "@/lib/types";

const POLL_INTERVAL_MS = 120_000;

type UseFeedDataOptions<T> = {
  page: number;
  fetchPage: (page: number) => Promise<{ items: T[]; total: number; has_more: boolean }>;
  shouldRefreshOnStream?: (event: { is_alert?: boolean }) => boolean;
  enablePolling?: boolean;
};

export function useFeedData<T>({
  page,
  fetchPage,
  shouldRefreshOnStream,
  enablePolling = true,
}: UseFeedDataOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [response, health] = await Promise.all([fetchPage(page), getHealth()]);
      setItems(response.items);
      setTotal(response.total);
      setHasMore(response.has_more);
      setIngestStatus(health.ingest);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }, [fetchPage, page]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [response, health] = await Promise.all([fetchPage(page), getHealth()]);
        if (cancelled) {
          return;
        }
        setItems(response.items);
        setTotal(response.total);
        setHasMore(response.has_more);
        setIngestStatus(health.ingest);
        setError(null);
      } catch (refreshError) {
        if (cancelled) {
          return;
        }
        setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh data");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchPage, page]);

  useEffect(() => {
    if (!enablePolling) {
      return;
    }
    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enablePolling, refresh]);

  useMessageStream({
    onMessage: (event) => {
      if (shouldRefreshOnStream && !shouldRefreshOnStream(event)) {
        return;
      }
      setLiveCount((count) => count + 1);
      if (page === 1) {
        void refresh();
      }
    },
  });

  return {
    items,
    total,
    hasMore,
    error,
    liveCount,
    loading,
    ingestStatus,
    refresh,
  };
}
