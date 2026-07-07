import { Suspense } from "react";

import { AlertsFeed } from "@/components/AlertsFeed";
import { getMessages, getOffices } from "@/lib/api";
import type { MessageFilters, OfficeInfo } from "@/lib/types";

type AlertsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFilterValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

async function AlertsContent({ searchParams }: AlertsPageProps) {
  const params = await searchParams;
  const filters: MessageFilters = {
    office: getFilterValue(params, "office"),
    product_category: getFilterValue(params, "product_category"),
    product_class: getFilterValue(params, "product_class"),
    q: getFilterValue(params, "q"),
    page: Number(getFilterValue(params, "page") ?? "1"),
    alerts_only: true,
  };

  const [messagesResponse, offices] = await Promise.all([
    getMessages(filters),
    getOffices().catch(() => [] as OfficeInfo[]),
  ]);

  return (
    <AlertsFeed
      initialMessages={messagesResponse.items}
      initialTotal={messagesResponse.total}
      initialPage={messagesResponse.page}
      hasMore={messagesResponse.has_more}
      offices={offices}
      filters={filters}
    />
  );
}

export default function AlertsPage(props: AlertsPageProps) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface-raised" />}>
      <AlertsContent {...props} />
    </Suspense>
  );
}
