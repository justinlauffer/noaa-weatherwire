import { Suspense } from "react";

import { EventsFeed } from "@/components/EventsFeed";
import { getEvents } from "@/lib/api";
import type { EventFilters } from "@/lib/types";

type EventsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFilterValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

async function EventsContent({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const filters: EventFilters = {
    page: Number(getFilterValue(params, "page") ?? "1"),
    active_only: getFilterValue(params, "active_only") === "true",
    office: getFilterValue(params, "office"),
  };

  let eventsResponse;
  try {
    eventsResponse = await getEvents(filters);
  } catch {
    return (
      <div
        className="rounded-lg border border-error bg-surface-raised px-4 py-3 text-sm text-error"
        role="alert"
      >
        Failed to load VTEC events. Check that the API is running and parsed metadata has been
        backfilled.
      </div>
    );
  }

  return (
    <EventsFeed
      initialEvents={eventsResponse.items}
      initialTotal={eventsResponse.total}
      initialPage={eventsResponse.page}
      hasMore={eventsResponse.has_more}
      filters={filters}
    />
  );
}

export default function EventsPage(props: EventsPageProps) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface-raised" />}>
      <EventsContent {...props} />
    </Suspense>
  );
}
