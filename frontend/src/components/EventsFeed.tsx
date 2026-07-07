"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { VtecActionBadge } from "@/components/VtecActionBadge";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResponsiveDataList, type DataColumn } from "@/components/ui/ResponsiveDataList";
import { useFeedData } from "@/hooks/useFeedData";
import { useFeedPagination } from "@/hooks/useFeedPagination";
import { formatDateTime, getEvents } from "@/lib/api";
import type { EventFilters, VtecEventSummary } from "@/lib/types";

type EventsFeedProps = {
  filters: EventFilters;
};

export function EventsFeed({ filters }: EventsFeedProps) {
  const { page, setPage } = useFeedPagination();
  const [activeOnly, setActiveOnly] = useState(filters.active_only ?? false);

  const fetchPage = useCallback(
    (currentPage: number) => getEvents({ ...filters, page: currentPage, active_only: activeOnly }),
    [filters, activeOnly],
  );

  const { items, total, hasMore, error, loading } = useFeedData({
    page,
    fetchPage,
    enablePolling: false,
  });

  const columns: DataColumn<VtecEventSummary>[] = [
    {
      key: "latest",
      header: "Latest (UTC)",
      className: "whitespace-nowrap font-mono text-xs",
      render: (event) => formatDateTime(event.latest_issued_at),
    },
    {
      key: "status",
      header: "Status",
      render: (event) => (
        <VtecActionBadge action={event.latest_action} label={event.latest_action_label} />
      ),
    },
    {
      key: "event",
      header: "Event",
      render: (event) => (
        <>
          <div className="font-mono text-xs">{event.event_key}</div>
          <div className="text-xs text-text-secondary">
            {event.phenomena_label} {event.significance_label}
          </div>
        </>
      ),
    },
    {
      key: "office",
      header: "Office",
      render: (event) => (
        <>
          <div className="font-mono text-sm">{event.office}</div>
          {event.office_name && (
            <div className="text-xs text-text-secondary">
              {event.office_name.replace(/^NWS Forecast Office /, "")}
            </div>
          )}
        </>
      ),
    },
    {
      key: "updates",
      header: "Updates",
      className: "font-mono text-xs",
      hideOnMobile: true,
      render: (event) => event.message_count,
    },
    {
      key: "summary",
      header: "Summary",
      render: (event) => (
        <Link
          href={`/events/${encodeURIComponent(event.event_key)}`}
          className="text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          {event.latest_summary}
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="VTEC Events"
        description={`${total.toLocaleString()} distinct VTEC events grouped by office, phenomena, and ETN.`}
      />

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Checkbox
          checked={activeOnly}
          onChange={(event) => {
            setPage(1);
            setActiveOnly(event.target.checked);
          }}
        />
        <span>Active only (exclude expired and cancelled)</span>
      </label>

      {error && <ErrorBanner message={error} />}

      {items.length === 0 && !loading ? (
        <EmptyState
          title="No VTEC events yet"
          description="Events appear when ingested products include VTEC lines or CAP VTEC parameters."
        />
      ) : (
        <ResponsiveDataList
          items={items}
          columns={columns}
          getRowKey={(event) => event.event_key}
        />
      )}

      <Pagination
        page={page}
        hasMore={hasMore}
        loading={loading}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => current + 1)}
      />
    </div>
  );
}
