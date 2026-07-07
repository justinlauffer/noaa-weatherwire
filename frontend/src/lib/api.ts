import type {
  EventFilters,
  HealthResponse,
  MessageFilters,
  OfficeInfo,
  ReferenceCatalog,
  MapFeatureCollection,
  MapLayerFilter,
  VtecEventDetail,
  VtecEventListResponse,
  WeatherMessageDetail,
  WeatherMessageListResponse,
} from "./types";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function buildQuery(filters: MessageFilters): string {
  const params = new URLSearchParams();
  if (filters.office) params.set("office", filters.office);
  if (filters.awips_id) params.set("awips_id", filters.awips_id);
  if (filters.wmo_product_id) params.set("wmo_product_id", filters.wmo_product_id);
  if (filters.product_category) params.set("product_category", filters.product_category);
  if (filters.product_class) params.set("product_class", filters.product_class);
  if (filters.alerts_only) params.set("alerts_only", "true");
  if (filters.since) params.set("since", filters.since);
  if (filters.until) params.set("until", filters.until);
  if (filters.q) params.set("q", filters.q);
  if (filters.page) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    next: init?.next ?? { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getMessages(
  filters: MessageFilters = {},
): Promise<WeatherMessageListResponse> {
  return fetchJson(`/api/v1/messages${buildQuery(filters)}`);
}

export async function getMessage(id: string): Promise<WeatherMessageDetail> {
  return fetchJson(`/api/v1/messages/${id}`);
}

export async function getOffices(): Promise<OfficeInfo[]> {
  return fetchJson("/api/v1/offices");
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchJson("/health");
}

function buildEventQuery(filters: EventFilters): string {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.active_only) params.set("active_only", "true");
  if (filters.office) params.set("office", filters.office);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getEvents(filters: EventFilters = {}): Promise<VtecEventListResponse> {
  return fetchJson(`/api/v1/events${buildEventQuery(filters)}`);
}

export async function getEvent(eventKey: string): Promise<VtecEventDetail> {
  return fetchJson(`/api/v1/events/${encodeURIComponent(eventKey)}`);
}

export async function getReference(): Promise<ReferenceCatalog> {
  return fetchJson("/api/v1/reference");
}

function buildMapQuery(filters: MapLayerFilter): string {
  const params = new URLSearchParams();
  if (filters.hours) params.set("hours", String(filters.hours));
  if (filters.alerts_only === false) params.set("alerts_only", "false");
  if (filters.product_class) params.set("product_class", filters.product_class);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getMapFeatures(filters: MapLayerFilter = { layers: { warning: true, watch: true, advisory: true } }): Promise<MapFeatureCollection> {
  return fetchJson(`/api/v1/map/features${buildMapQuery(filters)}`);
}

export function formatDateTime(iso: string, options?: { seconds?: boolean }): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(options?.seconds ? { second: "2-digit" } : {}),
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
}
