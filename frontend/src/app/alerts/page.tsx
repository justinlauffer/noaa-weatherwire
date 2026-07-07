import { Suspense } from "react";

import { AlertsFeed } from "@/components/AlertsFeed";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { getOffices } from "@/lib/api";
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
    awips_id: getFilterValue(params, "awips_id"),
    product_category: getFilterValue(params, "product_category"),
    product_class: getFilterValue(params, "product_class"),
    q: getFilterValue(params, "q"),
    since: getFilterValue(params, "since"),
    page: Number(getFilterValue(params, "page") ?? "1"),
    alerts_only: true,
  };

  const offices = await getOffices().catch(() => [] as OfficeInfo[]);

  return <AlertsFeed offices={offices} filters={filters} />;
}

export default function AlertsPage(props: AlertsPageProps) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <AlertsContent {...props} />
    </Suspense>
  );
}
