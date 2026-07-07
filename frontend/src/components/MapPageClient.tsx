"use client";

import dynamic from "next/dynamic";

import type { MapFeatureCollection, MapLayerFilter } from "@/lib/types";

const AlertMap = dynamic(() => import("@/components/AlertMap").then((mod) => mod.AlertMap), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] min-h-[420px] animate-pulse rounded-xl bg-surface-raised" />
  ),
});

type MapPageClientProps = {
  initialData: MapFeatureCollection;
  initialFilters: MapLayerFilter;
};

export function MapPageClient({ initialData, initialFilters }: MapPageClientProps) {
  return <AlertMap initialData={initialData} initialFilters={initialFilters} />;
}
