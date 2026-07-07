import { Suspense } from "react";

import { EventsFeed } from "@/components/EventsFeed";
import { FeedSkeleton } from "@/components/ui/Skeleton";
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

  return <EventsFeed filters={filters} />;
}

export default function EventsPage(props: EventsPageProps) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <EventsContent {...props} />
    </Suspense>
  );
}
