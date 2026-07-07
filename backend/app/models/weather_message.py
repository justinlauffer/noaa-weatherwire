import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WeatherMessage(Base):
    __tablename__ = "weather_message"

    weather_message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nwws_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    issuing_office: Mapped[str] = mapped_column(String(4), nullable=False)
    wmo_product_id: Mapped[str] = mapped_column(String(6), nullable=False)
    awips_id: Mapped[str] = mapped_column(String(6), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    nwws_delay_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    raw_body: Mapped[str] = mapped_column(Text, nullable=False)
    wmo_heading: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ingest_pid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sequence_num: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    product_category: Mapped[str] = mapped_column(String(3), nullable=False, default="UNK")
    product_designator: Mapped[str | None] = mapped_column(String(3), nullable=True)
    product_type_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_class: Mapped[str] = mapped_column(String(20), nullable=False, default="other")
    is_alert: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    parsed_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_weather_message_issued_at", issued_at.desc()),
        Index("ix_weather_message_issuing_office", issuing_office),
        Index("ix_weather_message_awips_id", awips_id),
        Index("ix_weather_message_wmo_product_id", wmo_product_id),
        Index("ix_weather_message_product_category", product_category),
        Index("ix_weather_message_product_class", product_class),
        Index("ix_weather_message_is_alert", is_alert),
    )


class IngestStatus(Base):
    __tablename__ = "ingest_status"

    ingest_status_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    connected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_nwws_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    gap_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_gap_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
