from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class VtecEventSummary(BaseModel):
    event_key: str
    office: str
    office_name: str | None = None
    phenomena: str
    phenomena_label: str
    significance: str
    significance_label: str
    etn: str
    latest_action: str
    latest_action_label: str
    is_active: bool
    message_count: int
    latest_message_id: UUID
    latest_issued_at: datetime
    latest_summary: str


class VtecEventListResponse(BaseModel):
    items: list[VtecEventSummary]
    total: int
    page: int
    page_size: int
    has_more: bool


class UgcZoneInfo(BaseModel):
    code: str
    name: str
    state: str | None = None


class VtecEventMessage(BaseModel):
    weather_message_id: UUID
    issued_at: datetime
    summary: str
    issuing_office: str
    issuing_office_name: str | None = None
    action: str
    action_label: str
    start_time: str | None = None
    end_time: str | None = None
    vtec_raw: str


class VtecEventDetail(BaseModel):
    event_key: str
    office: str
    office_name: str | None = None
    phenomena: str
    phenomena_label: str
    significance: str
    significance_label: str
    etn: str
    latest_action: str
    latest_action_label: str
    is_active: bool
    message_count: int
    ugc_zones: list[UgcZoneInfo] = Field(default_factory=list)
    timeline: list[VtecEventMessage]
