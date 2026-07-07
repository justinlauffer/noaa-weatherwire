import { Suspense } from "react";

import { MessageFeed } from "@/components/MessageFeed";
import { getMessages, getOffices } from "@/lib/api";
import type { MessageFilters, OfficeInfo } from "@/lib/types";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFilterValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

async function FeedContent({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const filters: MessageFilters = {
    office: getFilterValue(params, "office"),
    awips_id: getFilterValue(params, "awips_id"),
    wmo_product_id: getFilterValue(params, "wmo_product_id"),
    product_category: getFilterValue(params, "product_category"),
    product_class: getFilterValue(params, "product_class"),
    alerts_only: getFilterValue(params, "alerts_only") === "true",
    since: getFilterValue(params, "since"),
    until: getFilterValue(params, "until"),
    q: getFilterValue(params, "q"),
    page: Number(getFilterValue(params, "page") ?? "1"),
  };

  const [messagesResponse, offices] = await Promise.all([
    getMessages(filters),
    getOffices().catch(() => [] as OfficeInfo[]),
  ]);

  return (
    <MessageFeed
      initialMessages={messagesResponse.items}
      initialTotal={messagesResponse.total}
      initialPage={messagesResponse.page}
      hasMore={messagesResponse.has_more}
      offices={offices}
      filters={filters}
    />
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-64 animate-pulse rounded bg-surface-raised" />
      <div className="h-24 animate-pulse rounded-xl bg-surface-raised" />
      <div className="h-96 animate-pulse rounded-xl bg-surface-raised" />
    </div>
  );
}

export default function HomePage(props: HomePageProps) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent {...props} />
    </Suspense>
  );
}
