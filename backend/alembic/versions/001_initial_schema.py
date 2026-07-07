"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-07-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weather_message",
        sa.Column("weather_message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nwws_id", sa.String(length=64), nullable=False),
        sa.Column("issuing_office", sa.String(length=4), nullable=False),
        sa.Column("wmo_product_id", sa.String(length=6), nullable=False),
        sa.Column("awips_id", sa.String(length=6), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("nwws_delay_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("raw_body", sa.Text(), nullable=False),
        sa.Column("wmo_heading", sa.String(length=64), nullable=True),
        sa.Column("ingest_pid", sa.Integer(), nullable=True),
        sa.Column("sequence_num", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("weather_message_id", name="pk_weather_message"),
        sa.UniqueConstraint("nwws_id", name="uq_weather_message_nwws_id"),
    )
    op.create_index("ix_weather_message_issued_at", "weather_message", [sa.text("issued_at DESC")], unique=False)
    op.create_index("ix_weather_message_issuing_office", "weather_message", ["issuing_office"], unique=False)
    op.create_index("ix_weather_message_awips_id", "weather_message", ["awips_id"], unique=False)
    op.create_index("ix_weather_message_wmo_product_id", "weather_message", ["wmo_product_id"], unique=False)

    op.create_table(
        "ingest_status",
        sa.Column("ingest_status_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connected", sa.Boolean(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_nwws_id", sa.String(length=64), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("gap_detected", sa.Boolean(), nullable=False),
        sa.Column("last_gap_detail", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("ingest_status_id", name="pk_ingest_status"),
    )


def downgrade() -> None:
    op.drop_table("ingest_status")
    op.drop_index("ix_weather_message_wmo_product_id", table_name="weather_message")
    op.drop_index("ix_weather_message_awips_id", table_name="weather_message")
    op.drop_index("ix_weather_message_issuing_office", table_name="weather_message")
    op.drop_index("ix_weather_message_issued_at", table_name="weather_message")
    op.drop_table("weather_message")
