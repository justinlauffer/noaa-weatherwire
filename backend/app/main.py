import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import features, health, messages
from app.services.stream import stream_hub

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("API service started")
    await stream_hub.start()
    yield
    await stream_hub.stop()
    logger.info("API service stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="WeatherWire API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(messages.router)
    app.include_router(features.router)

    return app


app = create_app()
