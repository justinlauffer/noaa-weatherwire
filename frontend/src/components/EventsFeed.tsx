"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useMessageStream } from "@/hooks/useMessageStream";
import { formatDateTime, getEvents } from "@/lib/api";
import type { EventFilters, VtecEventSummary } from "@/lib/types";

import { VtecActionBadge } from "./VtecActionBadge";

type EventsFeedProps = {
  initialEvents: VtecEventSummary[];
  initialTotal: number;
  initialPage: number;
  hasMore: boolean;
  filters: EventFilters;
};

export function EventsFeed({
  initialEvents,
  initialTotal,
  initialPage,
  hasMore: initialHasMore,
  filters,
}: EventsFeedProps) {
  const [events, setEvents] = useState(initialEvents);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [activeOnly, setActiveOnly] = useState(filters.active_only ?? false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await getEvents({ ...filters, page, active_only: activeOnly });
      setEvents(response.items);
      setTotal(response.total);
      setHasMore(response.has_more);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh events");
    }
  }, [filters, page, activeOnly]);

  useEffect(() => {
    setEvents(initialEvents);
    setTotal(initialTotal);
    setPage(initialPage);
    setHasMore(initialHasMore);
    setError(null);
  }, [initialEvents, initialTotal, initialPage, initialHasMore]);

  useEffect(() => {
    void refresh();
  }, [page, activeOnly, refresh]);

  useMessageStream({
    onMessage: () => {
      if (page === 1) {
        void refresh();
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">VTEC Events</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {total.toLocaleString()} distinct VTEC events grouped by office, phenomena, and ETN.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border"
          checked={activeOnly}
          onChange={(event) => {
            setPage(1);
            setActiveOnly(event.target.checked);
          }}
        />
        <span>Active only (exclude expired and cancelled)</span>
      </label>

      {error && (
        <div className="rounded-lg border border-error px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-lg font-medium">No VTEC events yet</p>
          <p className="mt-2 text-sm text-text-secondary">
            Events appear when ingested products include VTEC lines or CAP VTEC parameters.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-raised text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Latest (UTC)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Office</th>
                <th className="px-4 py-3 font-medium">Updates</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {events.map((event) => (
                <tr key={event.event_key} className="hover:bg-surface-raised/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {formatDateTime(event.latest_issued_at)}
                  </td>
                  <td className="px-4 py-3">
                    <VtecActionBadge
                      action={event.latest_action}
                      label={event.latest_action_label}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{event.event_key}</div>
                    <div className="text-xs text-text-secondary">
                      {event.phenomena_label} {event.significance_label}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-sm">{event.office}</div>
                    {event.office_name && (
                      <div className="text-xs text-text-secondary">
                        {event.office_name.replace(/^NWS Forecast Office /, "")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{event.message_count}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/events/${encodeURIComponent(event.event_key)}`}
                      className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      {event.latest_summary}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <span className="text-sm text-text-secondary">Page {page}</span>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
          disabled={!hasMore}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
