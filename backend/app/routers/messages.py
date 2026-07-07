from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    IngestStatusResponse,
    OfficeInfo,
    ProductTypeInfo,
    StatsResponse,
    WeatherMessageDetail,
    WeatherMessageListResponse,
)
from app.services import messages as message_service

router = APIRouter(prefix="/api/v1", tags=["messages"])


@router.get("/messages", response_model=WeatherMessageListResponse)
async def list_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    office: str | None = None,
    awips_id: str | None = None,
    wmo_product_id: str | None = None,
    product_category: str | None = None,
    product_class: str | None = None,
    alerts_only: bool = Query(False),
    since: datetime | None = None,
    until: datetime | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> WeatherMessageListResponse:
    return await message_service.list_messages(
        db,
        page=page,
        page_size=page_size,
        office=office,
        awips_id=awips_id,
        wmo_product_id=wmo_product_id,
        product_category=product_category,
        product_class=product_class,
        alerts_only=alerts_only,
        since=since,
        until=until,
        q=q,
    )


@router.get("/messages/{message_id}", response_model=WeatherMessageDetail)
async def get_message(
    message_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> WeatherMessageDetail:
    message = await message_service.get_message(db, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.get("/offices", response_model=list[OfficeInfo])
async def list_offices(db: AsyncSession = Depends(get_db)) -> list[OfficeInfo]:
    return await message_service.list_offices(db)


@router.get("/product-types", response_model=list[ProductTypeInfo])
async def list_product_types() -> list[ProductTypeInfo]:
    return message_service.get_product_type_catalog()


@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)) -> StatsResponse:
    return await message_service.get_stats(db)


@router.get("/ingest-status", response_model=IngestStatusResponse)
async def get_ingest_status(db: AsyncSession = Depends(get_db)) -> IngestStatusResponse:
    status = await message_service.get_ingest_status(db)
    return IngestStatusResponse.model_validate(status)
