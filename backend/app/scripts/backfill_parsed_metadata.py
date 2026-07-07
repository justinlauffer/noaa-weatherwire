"""Re-parse stored weather messages to populate parsed metadata fields."""

import asyncio
import logging

from sqlalchemy import select

from app.database import async_session_factory
from app.models import WeatherMessage
from app.services.ingest.body_parser import parse_message_body

logger = logging.getLogger(__name__)


async def backfill_parsed_metadata(batch_size: int = 100) -> int:
    updated = 0
    async with async_session_factory() as session:
        result = await session.execute(
            select(WeatherMessage)
            .where(WeatherMessage.parsed_metadata.is_(None))
            .order_by(WeatherMessage.issued_at.desc())
            .limit(batch_size)
        )
        messages = result.scalars().all()
        for message in messages:
            metadata = parse_message_body(
                raw_body=message.raw_body,
                awips_id=message.awips_id,
                wmo_heading=message.wmo_heading,
            )
            message.product_category = metadata.product_category
            message.product_designator = metadata.product_designator
            message.product_type_name = metadata.product_type_name
            message.product_class = metadata.product_class
            message.is_alert = metadata.is_alert
            message.parsed_metadata = metadata.as_dict()
            updated += 1

        if updated:
            await session.commit()
    return updated


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    total = 0
    while True:
        count = await backfill_parsed_metadata()
        total += count
        if count == 0:
            break
        logger.info("Backfilled %s messages (%s total)", count, total)
    logger.info("Backfill complete (%s messages updated)", total)


if __name__ == "__main__":
    asyncio.run(main())
