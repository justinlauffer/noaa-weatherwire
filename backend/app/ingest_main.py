import asyncio
import logging

from app.services.ingest.worker import IngestWorker

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


async def run_ingest() -> None:
    worker = IngestWorker()
    worker._running = True
    try:
        await worker.run_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down ingest worker")
    finally:
        worker._running = False
        await worker.stop()


def main() -> None:
    asyncio.run(run_ingest())


if __name__ == "__main__":
    main()
