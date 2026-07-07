export type WeatherMessageSummary = {
  weather_message_id: string;
  nwws_id: string;
  issuing_office: string;
  issuing_office_name: string | null;
  wmo_product_id: string;
  awips_id: string;
  issued_at: string;
  received_at: string;
  summary: string;
  wmo_heading: string | null;
  product_category: string;
  product_designator: string | null;
  product_type_name: string | null;
  product_class: string;
  is_alert: boolean;
  primary_vtec_action?: string | null;
  primary_vtec_action_label?: string | null;
};

export type ParsedVtec = {
  raw: string;
  product_classification: string;
  action: string;
  action_label: string;
  office: string;
  phenomena: string;
  phenomena_label: string;
  significance: string;
  significance_label: string;
  etn: string;
  start_time: string;
  end_time: string;
};

export type UgcZone = {
  code: string;
  name: string;
  state: string | null;
};

export type ParsedMetadata = {
  product_category: string;
  product_designator: string | null;
  product_type_name: string | null;
  product_class: string;
  is_alert: boolean;
  format: string;
  vtec: ParsedVtec[];
  ugc_codes: string[];
  ugc_zones?: UgcZone[];
};

export type WeatherMessageDetail = WeatherMessageSummary & {
  raw_body: string;
  nwws_delay_at: string | null;
  ingest_pid: number | null;
  sequence_num: number | null;
  parsed_metadata: ParsedMetadata | null;
  created_at: string;
};

export type OfficeInfo = {
  code: string;
  name: string | null;
};

export type WeatherMessageListResponse = {
  items: WeatherMessageSummary[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
};

export type IngestStatus = {
  connected: boolean;
  last_message_at: string | null;
  last_nwws_id: string | null;
  last_error: string | null;
  gap_detected: boolean;
  last_gap_detail: string | null;
  updated_at: string | null;
};

export type HealthResponse = {
  status: string;
  database: string;
  ingest: IngestStatus | null;
};

export type MessageFilters = {
  office?: string;
  awips_id?: string;
  wmo_product_id?: string;
  product_category?: string;
  product_class?: string;
  alerts_only?: boolean;
  since?: string;
  until?: string;
  q?: string;
  page?: number;
};

export type VtecEventSummary = {
  event_key: string;
  office: string;
  office_name: string | null;
  phenomena: string;
  phenomena_label: string;
  significance: string;
  significance_label: string;
  etn: string;
  latest_action: string;
  latest_action_label: string;
  is_active: boolean;
  message_count: number;
  latest_message_id: string;
  latest_issued_at: string;
  latest_summary: string;
};

export type VtecEventListResponse = {
  items: VtecEventSummary[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
};

export type VtecEventMessage = {
  weather_message_id: string;
  issued_at: string;
  summary: string;
  issuing_office: string;
  issuing_office_name: string | null;
  action: string;
  action_label: string;
  start_time: string | null;
  end_time: string | null;
  vtec_raw: string;
};

export type VtecEventDetail = {
  event_key: string;
  office: string;
  office_name: string | null;
  phenomena: string;
  phenomena_label: string;
  significance: string;
  significance_label: string;
  etn: string;
  latest_action: string;
  latest_action_label: string;
  is_active: boolean;
  message_count: number;
  ugc_zones: UgcZone[];
  timeline: VtecEventMessage[];
};

export type ProductTypeInfo = {
  code: string;
  name: string;
};

export type ReferenceCatalog = {
  product_types: ProductTypeInfo[];
  offices: Array<{ code: string; name: string }>;
};

export type MapFeatureProperties = {
  weather_message_id: string;
  summary: string;
  product_class: string;
  product_category: string;
  product_type_name: string | null;
  issuing_office: string;
  issued_at: string;
  is_alert: boolean;
  geometry_source: "cap" | "ugc";
  zone_code: string | null;
  zone_name: string | null;
  color: string;
};

export type MapFeature = {
  type: "Feature";
  properties: MapFeatureProperties;
  geometry: {
    type: string;
    coordinates: unknown;
  };
};

export type MapFeatureCollection = {
  type: "FeatureCollection";
  features: MapFeature[];
  meta: {
    message_count: number;
    feature_count: number;
    hours: number;
    generated_at: string;
  };
};

export type MapLayerFilter = {
  hours?: number;
  alerts_only?: boolean;
  product_class?: string;
  layers: {
    warning: boolean;
    watch: boolean;
    advisory: boolean;
  };
};

export type EventFilters = {
  page?: number;
  active_only?: boolean;
  office?: string;
};
