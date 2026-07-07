from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.services.ingest.forecast_offices import lookup_office_name


class WeatherMessageSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weather_message_id: UUID
    nwws_id: str
    issuing_office: str
    wmo_product_id: str
    awips_id: str
    issued_at: datetime
    received_at: datetime
    summary: str
    wmo_heading: str | None = None
    product_category: str
    product_designator: str | None = None
    product_type_name: str | None = None
    product_class: str
    is_alert: bool = False
    primary_vtec_action: str | None = None
    primary_vtec_action_label: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def issuing_office_name(self) -> str | None:
        return lookup_office_name(self.issuing_office)


class WeatherMessageDetail(WeatherMessageSummary):
    raw_body: str
    nwws_delay_at: datetime | None = None
    ingest_pid: int | None = None
    sequence_num: int | None = None
    parsed_metadata: dict[str, Any] | None = None
    created_at: datetime


class WeatherMessageListResponse(BaseModel):
    items: list[WeatherMessageSummary]
    total: int
    page: int
    page_size: int
    has_more: bool


class IngestStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    connected: bool
    last_message_at: datetime | None = None
    last_nwws_id: str | None = None
    last_error: str | None = None
    gap_detected: bool = False
    last_gap_detail: str | None = None
    updated_at: datetime | None = None


class HealthResponse(BaseModel):
    status: str
    database: str
    ingest: IngestStatusResponse | None = None


class OfficeCount(BaseModel):
    issuing_office: str
    count: int

    @computed_field  # type: ignore[prop-decorator]
    @property
    def issuing_office_name(self) -> str | None:
        return lookup_office_name(self.issuing_office)


class OfficeInfo(BaseModel):
    code: str
    name: str | None = None


class ProductCount(BaseModel):
    awips_id: str
    count: int


class ProductCategoryCount(BaseModel):
    product_category: str
    product_type_name: str | None = None
    count: int


class ProductTypeInfo(BaseModel):
    code: str
    name: str


class StatsResponse(BaseModel):
    total_messages: int
    messages_last_hour: int
    ingest_lag_seconds: float | None = None
    by_office: list[OfficeCount]
    by_product: list[ProductCount]
    by_product_category: list[ProductCategoryCount] = Field(default_factory=list)
    alerts_last_hour: int = 0
