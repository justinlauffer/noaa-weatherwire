import asyncio
import logging

from nwws_receiver import NoaaPortMessage

from app.config import Settings, get_settings
from app.database import async_session_factory
from app.services.ingest.client import create_wx_wire
from app.services.ingest.parser import from_noaaport_message
from app.services.ingest.repository import GapTracker, persist_message, update_ingest_connected

logger = logging.getLogger(__name__)

RECONNECT_DELAY_SECONDS = 30


class IngestWorker:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client = None
        self._gap_tracker = GapTracker()
        self._running = False
        self._processor_task: asyncio.Task | None = None

    async def _handle_message(self, message: NoaaPortMessage) -> None:
        payload = from_noaaport_message(message)
        if payload is None:
            return

        async with async_session_factory() as session:
            inserted_id = await persist_message(session, payload, self._gap_tracker)
            if inserted_id:
                logger.info(
                    "Stored %s %s (%s)",
                    payload.issuing_office,
                    payload.awips_id,
                    payload.nwws_id,
                )

    async def _process_loop(self) -> None:
        if self._client is None:
            return
        try:
            async for message in self._client:
                try:
                    await self._handle_message(message)
                except Exception:
                    logger.exception("Failed to process message %s", getattr(message, "awipsid", "?"))
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Ingest processor loop failed")
            async with async_session_factory() as session:
                await update_ingest_connected(session, connected=False, error="Processor loop failed")

    async def start(self) -> None:
        if not self.settings.nwws_user or not self.settings.nwws_password:
            raise ValueError("NWWS_USER and NWWS_PASSWORD must be set for ingest worker")

        self._running = True
        self._client = create_wx_wire(self.settings)

        await self._client.start()
        connected = self._client.is_client_connected()

        async with async_session_factory() as session:
            await update_ingest_connected(
                session,
                connected=connected,
                error=None if connected else "Failed to connect to NWWS-OI",
            )

        if not connected:
            await self.stop()
            raise RuntimeError("Failed to connect to NWWS-OI")

        self._processor_task = asyncio.create_task(self._process_loop())
        logger.info("NWWS-OI ingest worker connected")

    async def stop(self) -> None:
        self._running = False
        if self._processor_task:
            self._processor_task.cancel()
            try:
                await self._processor_task
            except asyncio.CancelledError:
                pass
            self._processor_task = None
        if self._client:
            await self._client.stop()
            self._client = None
        async with async_session_factory() as session:
            await update_ingest_connected(session, connected=False)
        logger.info("NWWS-OI ingest worker stopped")

    async def run_forever(self) -> None:
        while self._running:
            try:
                await self.start()
                await asyncio.Event().wait()
                return
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception("Ingest worker error: %s", exc)
                async with async_session_factory() as session:
                    await update_ingest_connected(
                        session,
                        connected=False,
                        error=str(exc),
                    )
                await self.stop()
                if not self._running:
                    break
                logger.info("Retrying NWWS connection in %s seconds", RECONNECT_DELAY_SECONDS)
                await asyncio.sleep(RECONNECT_DELAY_SECONDS)
