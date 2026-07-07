import asyncio
import json
import logging
from collections.abc import AsyncIterator
from typing import Any
from urllib.parse import urlparse

import asyncpg

from app.config import get_settings

logger = logging.getLogger(__name__)

CHANNEL = "weatherwire_new_message"


class MessageStreamHub:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._listener_task: asyncio.Task | None = None
        self._connection: asyncpg.Connection | None = None

    def _database_dsn(self) -> str:
        url = urlparse(get_settings().database_url.replace("+asyncpg", ""))
        return (
            f"postgresql://{url.username}:{url.password}@{url.hostname}:{url.port or 5432}{url.path}"
        )

    async def start(self) -> None:
        if self._listener_task is not None:
            return
        self._listener_task = asyncio.create_task(self._listen_loop())

    async def stop(self) -> None:
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None
        if self._connection:
            await self._connection.close()
            self._connection = None

    async def _listen_loop(self) -> None:
        while True:
            try:
                self._connection = await asyncpg.connect(self._database_dsn())
                await self._connection.add_listener(CHANNEL, self._on_notify)
                logger.info("Listening for Postgres notifications on %s", CHANNEL)
                while True:
                    await asyncio.sleep(3600)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Message stream listener failed; retrying in 5s")
                if self._connection:
                    await self._connection.close()
                    self._connection = None
                await asyncio.sleep(5)

    def _on_notify(self, _connection: asyncpg.Connection, _pid: int, _channel: str, payload: str) -> None:
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            logger.warning("Ignoring invalid NOTIFY payload")
            return
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass

    async def subscribe(self) -> AsyncIterator[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            self._subscribers.discard(queue)

    def publish_local(self, event: dict[str, Any]) -> None:
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass


stream_hub = MessageStreamHub()
