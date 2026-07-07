"""add parsed metadata columns

Revision ID: 002
Revises: 001
Create Date: 2026-07-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "weather_message",
        sa.Column("product_category", sa.String(length=3), nullable=False, server_default="UNK"),
    )
    op.add_column(
        "weather_message",
        sa.Column("product_designator", sa.String(length=3), nullable=True),
    )
    op.add_column("weather_message", sa.Column("product_type_name", sa.Text(), nullable=True))
    op.add_column(
        "weather_message",
        sa.Column("product_class", sa.String(length=20), nullable=False, server_default="other"),
    )
    op.add_column(
        "weather_message",
        sa.Column("is_alert", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "weather_message",
        sa.Column("parsed_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index("ix_weather_message_product_category", "weather_message", ["product_category"])
    op.create_index("ix_weather_message_product_class", "weather_message", ["product_class"])
    op.create_index("ix_weather_message_is_alert", "weather_message", ["is_alert"])
    op.alter_column("weather_message", "product_category", server_default=None)
    op.alter_column("weather_message", "product_class", server_default=None)
    op.alter_column("weather_message", "is_alert", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_weather_message_is_alert", table_name="weather_message")
    op.drop_index("ix_weather_message_product_class", table_name="weather_message")
    op.drop_index("ix_weather_message_product_category", table_name="weather_message")
    op.drop_column("weather_message", "parsed_metadata")
    op.drop_column("weather_message", "is_alert")
    op.drop_column("weather_message", "product_class")
    op.drop_column("weather_message", "product_type_name")
    op.drop_column("weather_message", "product_designator")
    op.drop_column("weather_message", "product_category")
