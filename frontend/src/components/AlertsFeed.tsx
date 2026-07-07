"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useMessageStream } from "@/hooks/useMessageStream";
import { formatDateTime, getHealth, getMessages } from "@/lib/api";
import type { MessageFilters as Filters, OfficeInfo, WeatherMessageSummary } from "@/lib/types";

import { IngestStatusBadge } from "./IngestStatusBadge";
import { MessageFilters } from "./MessageFilters";
import { OfficeCell } from "./OfficeCell";
import { ProductTypeBadge } from "./ProductTypeBadge";
import { VtecActionBadge } from "./VtecActionBadge";

type AlertsFeedProps = {
  initialMessages: WeatherMessageSummary[];
  initialTotal: number;
  initialPage: number;
  hasMore: boolean;
  offices: OfficeInfo[];
  filters: Filters;
};

export function AlertsFeed({
  initialMessages,
  initialTotal,
  initialPage,
  hasMore: initialHasMore,
  offices,
  filters,
}: AlertsFeedProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const [ingestStatus, setIngestStatus] = useState(
    null as Awaited<ReturnType<typeof getHealth>>["ingest"],
  );

  const refresh = useCallback(async () => {
    try {
      const [messagesResponse, health] = await Promise.all([
        getMessages({ ...filters, page, alerts_only: true }),
        getHealth(),
      ]);
      setMessages(messagesResponse.items);
      setTotal(messagesResponse.total);
      setHasMore(messagesResponse.has_more);
      setIngestStatus(health.ingest);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : "Failed to refresh alerts",
      );
    }
  }, [filters, page]);

  useEffect(() => {
    setMessages(initialMessages);
    setTotal(initialTotal);
    setPage(initialPage);
    setHasMore(initialHasMore);
    setLiveCount(0);
    setError(null);
  }, [initialMessages, initialTotal, initialPage, initialHasMore]);

  useMessageStream({
    onMessage: (event) => {
      if (!event.is_alert) {
        return;
      }
      setLiveCount((count) => count + 1);
      if (page === 1) {
        void refresh();
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {total.toLocaleString()} warnings and watches in archive.
            {liveCount > 0 && (
              <span className="ml-2 text-warning">+{liveCount} new since page load</span>
            )}
          </p>
        </div>
        <IngestStatusBadge status={ingestStatus} />
      </div>

      <MessageFilters offices={offices} />

      {error && (
        <div
          className="rounded-lg border border-error bg-surface-raised px-4 py-3 text-sm text-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-lg font-medium">No alerts in archive</p>
          <p className="mt-2 text-sm text-text-secondary">
            Warnings and watches appear here as they are ingested from NWWS.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-raised text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Issued (UTC)</th>
                <th className="px-4 py-3 font-medium">VTEC</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Office</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {messages.map((message) => (
                <tr key={message.weather_message_id} className="hover:bg-surface-raised/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {formatDateTime(message.issued_at)}
                  </td>
                  <td className="px-4 py-3">
                    {message.primary_vtec_action ? (
                      <VtecActionBadge
                        action={message.primary_vtec_action}
                        label={message.primary_vtec_action_label ?? message.primary_vtec_action}
                      />
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </td>
                    <td className="px-4 py-3">
                      <ProductTypeBadge
                        category={message.product_category}
                        typeName={message.product_type_name}
                        productClass={message.product_class}
                        isAlert={message.is_alert}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <OfficeCell
                        code={message.issuing_office}
                        name={message.issuing_office_name}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/messages/${message.weather_message_id}`}
                        className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {message.summary}
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
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <span className="text-sm text-text-secondary">Page {page}</span>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasMore}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
