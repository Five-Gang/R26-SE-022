"""Application configuration.

We use pydantic-settings to load and validate config from environment variables.
Why: typed config beats `os.getenv` strings everywhere. Bad config fails fast at
startup, not in production at 2am.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All app configuration in one place. Values come from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # database — built from individual parts so docker-compose can override host
    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str = "db"
    postgres_port: int = 5432

    # app
    app_env: str = "development"
    app_secret_key: str = Field(min_length=16)
    app_log_level: str = "INFO"
    app_cors_origins: str = "http://localhost:5173"

    @property
    def database_url(self) -> str:
        """SQLAlchemy 2.0 + psycopg 3 sync URL."""
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.app_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached so we read .env once per process, not per request."""
    return Settings()  # type: ignore[call-arg]
