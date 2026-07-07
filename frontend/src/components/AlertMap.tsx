"use client";

import type { Feature, GeoJsonObject } from "geojson";
import type { Layer, PathOptions } from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";

import { useMessageStream } from "@/hooks/useMessageStream";
import { formatDateTime, getMapFeatures } from "@/lib/api";
import type { MapFeatureCollection, MapLayerFilter } from "@/lib/types";

import "leaflet/dist/leaflet.css";

const LAYER_STYLES: Record<string, PathOptions> = {
  warning: { color: "#dc2626", weight: 2, fillColor: "#dc2626", fillOpacity: 0.25 },
  watch: { color: "#d97706", weight: 2, fillColor: "#d97706", fillOpacity: 0.2 },
  advisory: { color: "#2563eb", weight: 2, fillColor: "#2563eb", fillOpacity: 0.18 },
  statement: { color: "#64748b", weight: 2, fillColor: "#64748b", fillOpacity: 0.12 },
};

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
    return LAYER_STYLES[productClass ?? "statement"] ?? LAYER_STYLES.statement;
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const props = feature.properties as MapFeatureCollection["features"][number]["properties"];
    const popup = `
      <div style="min-width:200px">
        <strong>${props.product_type_name ?? props.product_category}</strong><br/>
        <span style="text-transform:capitalize">${props.product_class}</span><br/>
        <small>${props.summary}</small><br/>
        <small>${formatDateTime(props.issued_at)}</small>
      </div>
    `;
    layer.bindPopup(popup);
    layer.on("click", () => {
      window.location.href = `/messages/${props.weather_message_id}`;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alert Map</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {visibleFeatures.features.length.toLocaleString()} areas from the last {filters.hours}{" "}
            hours. CAP polygons and NWS zone boundaries.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {(
            [
              ["warning", "Warnings"],
              ["watch", "Watches"],
              ["advisory", "Advisories"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
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
                className="inline-block h-3 w-3 rounded-sm border"
                style={{ backgroundColor: LAYER_STYLES[key]?.fillColor as string }}
              />
              {label}
            </label>
          ))}
          <select
            className="rounded-lg border border-border bg-background px-2 py-1"
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
          </select>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1"
            disabled={loading}
            onClick={() => void refresh()}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-error px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
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
        <Link href="https://www.weather.gov/documentation/services-web-api" className="text-primary">
          NWS API
        </Link>
        . Click a shaded area to open the bulletin.
      </p>
    </div>
  );
}
