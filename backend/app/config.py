from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://weatherwire:weatherwire@localhost:5432/weatherwire"
    cors_origins: str = "http://localhost:3000"
    ingest_only: bool = False

    nwws_user: str = ""
    nwws_password: str = ""
    nwws_server: str = "nwws-oi.weather.gov"
    nwws_port: int = 5222
    nwws_history: int = 25

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
