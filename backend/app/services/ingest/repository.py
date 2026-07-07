import json
import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import IngestStatus, WeatherMessage
from app.services.ingest.parser import ParsedNwwsPayload
from app.services.stream import CHANNEL

logger = logging.getLogger(__name__)


async def get_or_create_ingest_status(session: AsyncSession) -> IngestStatus:
    result = await session.execute(select(IngestStatus).limit(1))
    status = result.scalar_one_or_none()
    if status is None:
        status = IngestStatus(connected=False)
        session.add(status)
        await session.commit()
        await session.refresh(status)
    return status


async def update_ingest_connected(session: AsyncSession, connected: bool, error: str | None = None) -> None:
    status = await get_or_create_ingest_status(session)
    status.connected = bool(connected)
    status.last_error = error
    status.updated_at = datetime.now(timezone.utc)
    await session.commit()


class GapTracker:
    def __init__(self) -> None:
        self._last_pid: int | None = None
        self._last_seq: int | None = None

    def check(self, ingest_pid: int | None, sequence_num: int | None) -> str | None:
        if ingest_pid is None or sequence_num is None:
            return None

        if self._last_pid is not None and self._last_seq is not None:
            if ingest_pid == self._last_pid and sequence_num > self._last_seq + 1:
                gap = f"Gap detected: expected seq {self._last_seq + 1}, got {sequence_num} (pid {ingest_pid})"
                self._last_pid = ingest_pid
                self._last_seq = sequence_num
                return gap
            if ingest_pid != self._last_pid and sequence_num != 1:
                gap = f"PID changed {self._last_pid} -> {ingest_pid} at seq {sequence_num}"
                self._last_pid = ingest_pid
                self._last_seq = sequence_num
                return gap

        self._last_pid = ingest_pid
        self._last_seq = sequence_num
        return None


async def persist_message(
    session: AsyncSession, payload: ParsedNwwsPayload, gap_tracker: GapTracker
) -> UUID | None:
    now = datetime.now(timezone.utc)
    gap_detail = gap_tracker.check(payload.ingest_pid, payload.sequence_num)
    message_id = uuid4()

    stmt = (
        insert(WeatherMessage)
        .values(
            weather_message_id=message_id,
            nwws_id=payload.nwws_id,
            issuing_office=payload.issuing_office,
            wmo_product_id=payload.wmo_product_id,
            awips_id=payload.awips_id,
            issued_at=payload.issued_at,
            received_at=now,
            nwws_delay_at=payload.nwws_delay_at,
            summary=payload.summary,
            raw_body=payload.raw_body,
            wmo_heading=payload.wmo_heading,
            ingest_pid=payload.ingest_pid,
            sequence_num=payload.sequence_num,
            product_category=payload.product_category,
            product_designator=payload.product_designator,
            product_type_name=payload.product_type_name,
            product_class=payload.product_class,
            is_alert=payload.is_alert,
            parsed_metadata=payload.parsed_metadata or None,
        )
        .on_conflict_do_nothing(index_elements=["nwws_id"])
        .returning(WeatherMessage.weather_message_id)
    )
    result = await session.execute(stmt)
    inserted_id = result.scalar_one_or_none()

    status = await get_or_create_ingest_status(session)
    status.connected = True
    status.last_message_at = now
    status.last_nwws_id = payload.nwws_id
    status.updated_at = now
    if gap_detail:
        status.gap_detected = True
        status.last_gap_detail = gap_detail
        logger.warning(gap_detail)

    if inserted_id is not None:
        notify_payload = json.dumps(
            {
                "weather_message_id": str(inserted_id),
                "issued_at": payload.issued_at.isoformat(),
                "summary": payload.summary,
                "is_alert": payload.is_alert,
                "product_class": payload.product_class,
                "issuing_office": payload.issuing_office,
                "awips_id": payload.awips_id,
            }
        )
        await session.execute(
            text("SELECT pg_notify(:channel, :payload)"),
            {"channel": CHANNEL, "payload": notify_payload},
        )

    await session.commit()

    return inserted_id
