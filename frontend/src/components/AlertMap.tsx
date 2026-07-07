"use client";

import type { Feature, GeoJsonObject } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useMessageStream } from "@/hooks/useMessageStream";
import { formatDateTime, getMapFeatures } from "@/lib/api";
import type { MapFeatureCollection, MapLayerFilter } from "@/lib/types";

import "leaflet/dist/leaflet.css";

const LAYER_KEYS = ["warning", "watch", "advisory", "statement"] as const;

const LAYER_CSS_VARS: Record<(typeof LAYER_KEYS)[number], string> = {
  warning: "--map-warning",
  watch: "--map-watch",
  advisory: "--map-advisory",
  statement: "--map-statement",
};

const LAYER_FILL_OPACITY: Record<(typeof LAYER_KEYS)[number], number> = {
  warning: 0.25,
  watch: 0.2,
  advisory: 0.18,
  statement: 0.12,
};

function getCssColor(variable: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  return (
    getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback
  );
}

function buildLayerStyles(): Record<string, PathOptions> {
  const styles: Record<string, PathOptions> = {};
  for (const key of LAYER_KEYS) {
    const color = getCssColor(LAYER_CSS_VARS[key], "#64748b");
    styles[key] = {
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: LAYER_FILL_OPACITY[key],
    };
  }
  return styles;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type AlertMapProps = {
  initialData: MapFeatureCollection;
  initialFilters: MapLayerFilter;
};

function FitBounds({ data }: { data: MapFeatureCollection }) {
  const map = useMap();

  useEffect(() => {
    if (!data.features.length) {
      map.setView([39.8, -98.5], 4);
      return;
    }

    import("leaflet").then((L) => {
      const layer = L.geoJSON(data as GeoJsonObject);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 });
      }
    });
  }, [data, map]);

  return null;
}

export function AlertMap({ initialData, initialFilters }: AlertMapProps) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeRevision, setThemeRevision] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setThemeRevision((revision) => revision + 1);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // themeRevision forces recomputation when system color scheme changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- buildLayerStyles reads CSS variables from the DOM
  const layerStyles = useMemo(() => buildLayerStyles(), [themeRevision]);

  const visibleFeatures = useMemo(() => {
    const allowed = new Set(
      Object.entries(filters.layers)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key),
    );
    return {
      ...data,
      features: data.features.filter((feature) =>
        allowed.has(feature.properties.product_class),
      ),
    };
  }, [data, filters.layers]);

  const refresh = async (nextFilters: MapLayerFilter = filters) => {
    setLoading(true);
    try {
      const response = await getMapFeatures(nextFilters);
      setData(response);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  };

  useMessageStream({
    onMessage: () => {
      void refresh();
    },
  });

  const styleFeature = (feature?: Feature) => {
    const productClass = feature?.properties?.product_class as string | undefined;
    return layerStyles[productClass ?? "statement"] ?? layerStyles.statement;
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const props = feature.properties as MapFeatureCollection["features"][number]["properties"];
    const title = escapeHtml(props.product_type_name ?? props.product_category);
    const productClass = escapeHtml(props.product_class);
    const summary = escapeHtml(props.summary);
    const issuedAt = escapeHtml(formatDateTime(props.issued_at));
    const popup = `
      <div>
        <strong>${title}</strong><br/>
        <span style="text-transform:capitalize">${productClass}</span><br/>
        <small>${summary}</small><br/>
        <small>${issuedAt}</small>
      </div>
    `;
    layer.bindPopup(popup);
    layer.on("click", () => {
      window.location.href = `/messages/${props.weather_message_id}?from=map`;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Alert Map"
        description={`${visibleFeatures.features.length.toLocaleString()} areas from the last ${filters.hours} hours. CAP polygons and NWS zone boundaries.`}
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {(
          [
            ["warning", "Warnings"],
            ["watch", "Watches"],
            ["advisory", "Advisories"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex min-h-11 items-center gap-2">
            <Checkbox
              checked={filters.layers[key]}
              onChange={(event) => {
                const next = {
                  ...filters,
                  layers: { ...filters.layers, [key]: event.target.checked },
                };
                setFilters(next);
              }}
            />
            <span
              className="inline-block h-3 w-3 rounded-sm border border-border"
              style={{ backgroundColor: `var(${LAYER_CSS_VARS[key]})` }}
            />
            {label}
          </label>
        ))}
        <Select
          className="w-auto"
          value={filters.hours}
          onChange={(event) => {
            const next = { ...filters, hours: Number(event.target.value) };
            setFilters(next);
            void refresh(next);
          }}
        >
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={48}>Last 48 hours</option>
          <option value={72}>Last 72 hours</option>
        </Select>
        <Button variant="outline" disabled={loading} onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div
        className="overflow-hidden rounded-xl border border-border"
        aria-busy={loading}
      >
        <MapContainer
          center={[39.8, -98.5]}
          zoom={4}
          className="h-[70vh] min-h-[420px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds data={visibleFeatures} />
          {visibleFeatures.features.length > 0 && (
            <GeoJSON
              key={`${visibleFeatures.features.length}-${filters.hours}`}
              data={visibleFeatures as GeoJsonObject}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>

      {visibleFeatures.features.length === 0 && (
        <p className="text-sm text-text-secondary">
          No mapped areas for the current filters. Try widening the time window or enabling more
          layer types. Some products lack CAP polygons or UGC zone codes.
        </p>
      )}

      <p className="text-xs text-text-tertiary">
        Zone boundaries from the{" "}
        <Link
          href="https://www.weather.gov/documentation/services-web-api"
          className="text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
        >
          NWS API
        </Link>
        . Click a shaded area to open the bulletin.
      </p>
    </div>
  );
}
