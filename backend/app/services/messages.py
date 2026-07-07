from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import IngestStatus, WeatherMessage
from app.schemas import (
    OfficeCount,
    OfficeInfo,
    ProductCategoryCount,
    ProductCount,
    ProductTypeInfo,
    StatsResponse,
    WeatherMessageDetail,
    WeatherMessageListResponse,
    WeatherMessageSummary,
)
from app.services.ingest.forecast_offices import lookup_office_name
from app.services.ingest.product_types import list_product_types
from app.services.ingest.repository import get_or_create_ingest_status
from app.services.ingest.ugc_zones import enrich_ugc_metadata


def enrich_message_detail(row: WeatherMessage) -> WeatherMessageDetail:
    detail = WeatherMessageDetail.model_validate(row)
    if detail.parsed_metadata:
        detail.parsed_metadata = enrich_ugc_metadata(dict(detail.parsed_metadata))
    return detail


def _to_message_summary(row: WeatherMessage) -> WeatherMessageSummary:
    summary = WeatherMessageSummary.model_validate(row)
    vtec_entries = (row.parsed_metadata or {}).get("vtec", [])
    if not vtec_entries:
        return summary
    primary = vtec_entries[0]
    return summary.model_copy(
        update={
            "primary_vtec_action": primary.get("action"),
            "primary_vtec_action_label": primary.get("action_label"),
        }
    )


async def list_messages(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    office: str | None = None,
    awips_id: str | None = None,
    wmo_product_id: str | None = None,
    product_category: str | None = None,
    product_class: str | None = None,
    alerts_only: bool = False,
    since: datetime | None = None,
    until: datetime | None = None,
    q: str | None = None,
) -> WeatherMessageListResponse:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    offset = (page - 1) * page_size

    filters = []
    if office:
        filters.append(WeatherMessage.issuing_office == office.upper())
    if awips_id:
        filters.append(WeatherMessage.awips_id == awips_id.upper())
    if wmo_product_id:
        filters.append(WeatherMessage.wmo_product_id == wmo_product_id.upper())
    if product_category:
        filters.append(WeatherMessage.product_category == product_category.upper())
    if product_class:
        filters.append(WeatherMessage.product_class == product_class.lower())
    if alerts_only:
        filters.append(WeatherMessage.is_alert.is_(True))
    if since:
        filters.append(WeatherMessage.received_at >= since)
    if until:
        filters.append(WeatherMessage.received_at <= until)
    if q:
        pattern = f"%{q}%"
        filters.append(
            or_(WeatherMessage.summary.ilike(pattern), WeatherMessage.raw_body.ilike(pattern))
        )

    count_stmt = select(func.count()).select_from(WeatherMessage)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = (await session.execute(count_stmt)).scalar_one()

    stmt = select(WeatherMessage).order_by(WeatherMessage.received_at.desc()).offset(offset).limit(page_size)
    if filters:
        stmt = stmt.where(*filters)
    rows = (await session.execute(stmt)).scalars().all()

    return WeatherMessageListResponse(
        items=[_to_message_summary(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + len(rows) < total,
    )


async def get_message(session: AsyncSession, message_id: UUID) -> WeatherMessageDetail | None:
    result = await session.execute(
        select(WeatherMessage).where(WeatherMessage.weather_message_id == message_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return enrich_message_detail(row)


async def list_offices(session: AsyncSession) -> list[OfficeInfo]:
    result = await session.execute(
        select(WeatherMessage.issuing_office)
        .distinct()
        .order_by(WeatherMessage.issuing_office)
    )
    return [
        OfficeInfo(code=code, name=lookup_office_name(code))
        for code in result.scalars().all()
    ]


async def get_stats(session: AsyncSession) -> StatsResponse:
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)

    total = (await session.execute(select(func.count()).select_from(WeatherMessage))).scalar_one()
    last_hour = (
        await session.execute(
            select(func.count()).select_from(WeatherMessage).where(WeatherMessage.received_at >= one_hour_ago)
        )
    ).scalar_one()

    office_rows = (
        await session.execute(
            select(WeatherMessage.issuing_office, func.count())
            .group_by(WeatherMessage.issuing_office)
            .order_by(func.count().desc())
            .limit(20)
        )
    ).all()

    product_rows = (
        await session.execute(
            select(WeatherMessage.awips_id, func.count())
            .group_by(WeatherMessage.awips_id)
            .order_by(func.count().desc())
            .limit(20)
        )
    ).all()

    category_rows = (
        await session.execute(
            select(
                WeatherMessage.product_category,
                func.max(WeatherMessage.product_type_name),
                func.count(),
            )
            .group_by(WeatherMessage.product_category)
            .order_by(func.count().desc())
            .limit(20)
        )
    ).all()

    alerts_last_hour = (
        await session.execute(
            select(func.count())
            .select_from(WeatherMessage)
            .where(WeatherMessage.received_at >= one_hour_ago, WeatherMessage.is_alert.is_(True))
        )
    ).scalar_one()

    status = await get_or_create_ingest_status(session)
    ingest_lag: float | None = None
    if status.last_message_at:
        ingest_lag = (now - status.last_message_at).total_seconds()

    return StatsResponse(
        total_messages=total,
        messages_last_hour=last_hour,
        ingest_lag_seconds=ingest_lag,
        by_office=[OfficeCount(issuing_office=office, count=count) for office, count in office_rows],
        by_product=[ProductCount(awips_id=awips_id, count=count) for awips_id, count in product_rows],
        by_product_category=[
            ProductCategoryCount(
                product_category=category,
                product_type_name=type_name,
                count=count,
            )
            for category, type_name, count in category_rows
        ],
        alerts_last_hour=alerts_last_hour,
    )


def get_product_type_catalog() -> list[ProductTypeInfo]:
    return [ProductTypeInfo(**entry) for entry in list_product_types()]


async def get_ingest_status(session: AsyncSession) -> IngestStatus:
    return await get_or_create_ingest_status(session)
