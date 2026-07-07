import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.vtec_event import VtecEventDetail, VtecEventListResponse
from app.services import vtec_events as vtec_event_service
from app.services.map_features import get_map_features
from app.services.reference import ReferenceCatalogResponse, get_reference_catalog
from app.services.stream import stream_hub

router = APIRouter(prefix="/api/v1", tags=["features"])


@router.get("/events", response_model=VtecEventListResponse)
async def list_vtec_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    active_only: bool = Query(False),
    office: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> VtecEventListResponse:
    items, total = await vtec_event_service.list_vtec_events(
        db,
        page=page,
        page_size=page_size,
        active_only=active_only,
        office=office,
    )
    offset = (page - 1) * page_size
    return VtecEventListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + len(items) < total,
    )


@router.get("/events/{event_key:path}", response_model=VtecEventDetail)
async def get_vtec_event(
    event_key: str,
    db: AsyncSession = Depends(get_db),
) -> VtecEventDetail:
    event = await vtec_event_service.get_vtec_event(db, event_key)
    if event is None:
        raise HTTPException(status_code=404, detail="VTEC event not found")
    return event


@router.get("/reference", response_model=ReferenceCatalogResponse)
async def get_reference() -> ReferenceCatalogResponse:
    return get_reference_catalog()


@router.get("/map/features")
async def map_features(
    hours: int = Query(24, ge=1, le=168),
    product_class: str | None = None,
    alerts_only: bool = Query(True),
    limit: int = Query(75, ge=1, le=150),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await get_map_features(
        db,
        hours=hours,
        product_class=product_class,
        alerts_only=alerts_only,
        limit=limit,
    )


@router.get("/stream/messages")
async def stream_messages(request: Request) -> StreamingResponse:
    await stream_hub.start()

    async def event_generator():
        subscription = stream_hub.subscribe()
        try:
            async for event in subscription:
                if await request.is_disconnected():
                    break
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            await subscription.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
