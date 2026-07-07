"use client";

import Link from "next/link";
import { useCallback } from "react";

import { IngestStatusBadge } from "@/components/IngestStatusBadge";
import { MessageFilters } from "@/components/MessageFilters";
import { OfficeCell } from "@/components/OfficeCell";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResponsiveDataList, type DataColumn } from "@/components/ui/ResponsiveDataList";
import { useFeedData } from "@/hooks/useFeedData";
import { useFeedPagination } from "@/hooks/useFeedPagination";
import { formatDateTime, getMessages } from "@/lib/api";
import type { MessageFilters as Filters, OfficeInfo, WeatherMessageSummary } from "@/lib/types";

type MessageFeedProps = {
  offices: OfficeInfo[];
  filters: Filters;
};

export function MessageFeed({ offices, filters }: MessageFeedProps) {
  const { page, setPage } = useFeedPagination();

  const fetchPage = useCallback(
    (currentPage: number) => getMessages({ ...filters, page: currentPage }),
    [filters],
  );

  const { items, total, hasMore, error, liveCount, loading, ingestStatus } = useFeedData({
    page,
    fetchPage,
  });

  const columns: DataColumn<WeatherMessageSummary>[] = [
    {
      key: "received",
      header: "Received (UTC)",
      className: "whitespace-nowrap font-mono text-xs",
      render: (message) => formatDateTime(message.received_at, { seconds: true }),
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
      key: "awips",
      header: "AWIPS",
      className: "font-mono",
      hideOnMobile: true,
      render: (message) => message.awips_id,
    },
    {
      key: "wmo",
      header: "WMO",
      className: "font-mono text-text-secondary",
      hideOnMobile: true,
      render: (message) => message.wmo_product_id,
    },
    {
      key: "summary",
      header: "Summary",
      render: (message) => (
        <Link
          href={`/messages/${message.weather_message_id}`}
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
        title="Weather Wire Feed"
        description={
          <>
            {total.toLocaleString()} products in archive. Live updates via SSE.
            {liveCount > 0 && (
              <span className="ml-2 text-primary">+{liveCount} new since page load</span>
            )}
          </>
        }
        trailing={<IngestStatusBadge status={ingestStatus} />}
      />

      <MessageFilters offices={offices} />

      {error && <ErrorBanner message={error} />}

      {items.length === 0 ? (
        <EmptyState
          title="Waiting for the first product"
          description="Messages appear here once the ingest worker connects to NWWS-OI and receives traffic. Check that your credentials are configured and only one ingest session is running."
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
