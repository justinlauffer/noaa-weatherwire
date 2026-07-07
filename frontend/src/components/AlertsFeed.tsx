"use client";

import Link from "next/link";
import { useCallback } from "react";

import { IngestStatusBadge } from "@/components/IngestStatusBadge";
import { MessageFilters } from "@/components/MessageFilters";
import { OfficeCell } from "@/components/OfficeCell";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { VtecActionBadge } from "@/components/VtecActionBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResponsiveDataList, type DataColumn } from "@/components/ui/ResponsiveDataList";
import { useFeedData } from "@/hooks/useFeedData";
import { useFeedPagination } from "@/hooks/useFeedPagination";
import { formatDateTime, getMessages } from "@/lib/api";
import type { MessageFilters as Filters, OfficeInfo, WeatherMessageSummary } from "@/lib/types";

type AlertsFeedProps = {
  offices: OfficeInfo[];
  filters: Filters;
};

export function AlertsFeed({ offices, filters }: AlertsFeedProps) {
  const { page, setPage } = useFeedPagination();

  const fetchPage = useCallback(
    (currentPage: number) => getMessages({ ...filters, page: currentPage, alerts_only: true }),
    [filters],
  );

  const { items, total, hasMore, error, liveCount, loading, ingestStatus } = useFeedData({
    page,
    fetchPage,
    shouldRefreshOnStream: (event) => Boolean(event.is_alert),
  });

  const columns: DataColumn<WeatherMessageSummary>[] = [
    {
      key: "received",
      header: "Received (UTC)",
      className: "whitespace-nowrap font-mono text-xs",
      render: (message) => formatDateTime(message.received_at, { seconds: true }),
    },
    {
      key: "vtec",
      header: "VTEC",
      render: (message) =>
        message.primary_vtec_action ? (
          <VtecActionBadge
            action={message.primary_vtec_action}
            label={message.primary_vtec_action_label ?? message.primary_vtec_action}
          />
        ) : (
          <span className="text-xs text-text-tertiary">—</span>
        ),
    },
    {
      key: "type",
      header: "Type",
      render: (message) => (
        <ProductTypeBadge
          category={message.product_category}
          typeName={message.product_type_name}
          productClass={message.product_class}
          isAlert={message.is_alert}
        />
      ),
    },
    {
      key: "office",
      header: "Office",
      render: (message) => (
        <OfficeCell code={message.issuing_office} name={message.issuing_office_name} />
      ),
    },
    {
      key: "summary",
      header: "Summary",
      render: (message) => (
        <Link
          href={`/messages/${message.weather_message_id}?from=alerts`}
          className="text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          {message.summary}
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts Dashboard"
        description={
          <>
            {total.toLocaleString()} warnings and watches in archive.
            {liveCount > 0 && (
              <span className="ml-2 text-warning">+{liveCount} new since page load</span>
            )}
          </>
        }
        trailing={<IngestStatusBadge status={ingestStatus} />}
      />

      <MessageFilters offices={offices} />

      {error && <ErrorBanner message={error} />}

      {items.length === 0 ? (
        <EmptyState
          title="No alerts in archive"
          description="Warnings and watches appear here as they are ingested from NWWS."
        />
      ) : (
        <ResponsiveDataList
          items={items}
          columns={columns}
          getRowKey={(message) => message.weather_message_id}
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
