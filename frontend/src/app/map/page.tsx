import { MapPageClient } from "@/components/MapPageClient";
import { getMapFeatures } from "@/lib/api";
import type { MapLayerFilter } from "@/lib/types";

const DEFAULT_FILTERS: MapLayerFilter = {
  hours: 24,
  alerts_only: true,
  layers: {
    warning: true,
    watch: true,
    advisory: true,
  },
};

export default async function MapPage() {
  let initialData;
  try {
    initialData = await getMapFeatures(DEFAULT_FILTERS);
  } catch {
    initialData = {
      type: "FeatureCollection" as const,
      features: [],
      meta: { message_count: 0, feature_count: 0, hours: 24, generated_at: "" },
    };
  }

  return <MapPageClient initialData={initialData} initialFilters={DEFAULT_FILTERS} />;
}
