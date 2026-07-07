import asyncio
import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any, Literal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WeatherMessage
from app.services.ingest.cap_parser import parse_cap_polygons
from app.services.ingest.ugc_zones import lookup_ugc_zone

logger = logging.getLogger(__name__)
NWS_USER_AGENT = "WeatherWire/0.1 (https://github.com/studio-tech/noaa-weatherwire)"

GeometrySource = Literal["cap", "ugc"]
PRODUCT_COLORS = {
    "warning": "#dc2626",
    "watch": "#d97706",
    "advisory": "#2563eb",
    "statement": "#64748b",
}


def _ugc_zone_type(code: str) -> str:
    if len(code) >= 3 and code[2] == "C":
        return "county"
    if len(code) >= 3 and code[2] == "M":
        return "marine"
    return "forecast"


@lru_cache(maxsize=2048)
def _fetch_zone_geometry_sync(code: str) -> dict[str, Any] | None:
    zone_type = _ugc_zone_type(code)
    url = f"https://api.weather.gov/zones/{zone_type}/{code}"
    try:
        with httpx.Client(timeout=8.0, headers={"User-Agent": NWS_USER_AGENT}) as client:
            response = client.get(url)
            if response.status_code != 200:
                return None
            geometry = response.json().get("geometry")
            if not geometry:
                return None
            return geometry
    except httpx.HTTPError:
        return None


async def fetch_zone_geometry(code: str) -> dict[str, Any] | None:
    return await asyncio.to_thread(_fetch_zone_geometry_sync, code)


def _feature_from_geometry(
    *,
    geometry: dict[str, Any],
    message: WeatherMessage,
    geometry_source: GeometrySource,
    zone_code: str | None = None,
    zone_name: str | None = None,
) -> dict[str, Any]:
    return {
        "type": "Feature",
        "properties": {
            "weather_message_id": str(message.weather_message_id),
            "summary": message.summary,
            "product_class": message.product_class,
            "product_category": message.product_category,
            "product_type_name": message.product_type_name,
            "issuing_office": message.issuing_office,
            "issued_at": message.issued_at.isoformat(),
            "is_alert": message.is_alert,
            "geometry_source": geometry_source,
            "zone_code": zone_code,
            "zone_name": zone_name,
            "color": PRODUCT_COLORS.get(message.product_class, "#64748b"),
        },
        "geometry": geometry,
    }


async def _geometries_for_message(message: WeatherMessage) -> list[dict[str, Any]]:
    features: list[dict[str, Any]] = []
    seen_zone_geometry: set[str] = set()

    for polygon_coords in parse_cap_polygons(message.raw_body):
        features.append(
            _feature_from_geometry(
                geometry={"type": "Polygon", "coordinates": polygon_coords},
                message=message,
                geometry_source="cap",
            )
        )

    metadata = message.parsed_metadata or {}
    ugc_codes = metadata.get("ugc_codes", [])
    for code in ugc_codes:
        normalized = code.strip().upper().split(">")[0]
        if not normalized or normalized in seen_zone_geometry:
            continue
        geometry = await fetch_zone_geometry(normalized)
        if geometry is None:
            continue
        seen_zone_geometry.add(normalized)
        zone = lookup_ugc_zone(normalized)
        features.append(
            _feature_from_geometry(
                geometry=geometry,
                message=message,
                geometry_source="ugc",
                zone_code=normalized,
                zone_name=zone["name"],
            )
        )

    return features


async def get_map_features(
    session: AsyncSession,
    *,
    hours: int = 24,
    product_class: str | None = None,
    alerts_only: bool = True,
    limit: int = 75,
) -> dict[str, Any]:
    hours = min(max(hours, 1), 168)
    limit = min(max(limit, 1), 150)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    stmt = (
        select(WeatherMessage)
        .where(WeatherMessage.issued_at >= since)
        .order_by(WeatherMessage.issued_at.desc())
        .limit(limit)
    )
    if alerts_only:
        stmt = stmt.where(WeatherMessage.is_alert.is_(True))
    if product_class:
        stmt = stmt.where(WeatherMessage.product_class == product_class.lower())

    messages = (await session.execute(stmt)).scalars().all()

    semaphore = asyncio.Semaphore(8)

    async def bounded(message: WeatherMessage) -> list[dict[str, Any]]:
        async with semaphore:
            try:
                return await _geometries_for_message(message)
            except Exception:
                logger.exception("Failed to build map features for %s", message.weather_message_id)
                return []

    feature_groups = await asyncio.gather(*(bounded(message) for message in messages))
    features = [feature for group in feature_groups for feature in group]

    return {
        "type": "FeatureCollection",
        "features": features,
        "meta": {
            "message_count": len(messages),
            "feature_count": len(features),
            "hours": hours,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }
