import { Suspense } from "react";

import { MessageFeed } from "@/components/MessageFeed";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { getOffices } from "@/lib/api";
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

  const offices = await getOffices().catch(() => [] as OfficeInfo[]);

  return <MessageFeed offices={offices} filters={filters} />;
}

export default function HomePage(props: HomePageProps) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent {...props} />
    </Suspense>
  );
}
