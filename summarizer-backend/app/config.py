from __future__ import annotations
"""LOA-ESS Backend Application Configuration.

Centralized settings management using pydantic-settings.
All configuration is loaded from environment variables / .env file.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────
    app_name: str = "LOA-ESS"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"
    api_v1_prefix: str = "/api/v1"

    # ── PostgreSQL ───────────────────────────────────────────
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "loa_ess"
    postgres_user: str = "loa_ess_user"
    postgres_password: str = "devpassword"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Qdrant ───────────────────────────────────────────────
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_grpc_port: int = 6334

    # ── Redis ────────────────────────────────────────────────
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # ── MinIO ────────────────────────────────────────────────
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "loa-ess-documents"
    minio_secure: bool = False

    # ── LLM Configuration ───────────────────────────────────
    llm_provider: Literal["gemini", "openai"] = "gemini"
    llm_temperature_summary: float = 0.3
    llm_temperature_quiz: float = 0.7
    llm_max_output_tokens: int = 4096

    # OpenAI
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    openai_llm_model: str = "gpt-4o-mini"

    # Google Gemini
    google_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # ── Embedding Configuration ──────────────────────────────
    embedding_provider: Literal["openai", "local"] = "openai"
    embedding_dimensions: int = 1536
    local_embedding_model: str = "all-MiniLM-L6-v2"

    # ── Retrieval Configuration ──────────────────────────────
    retrieval_top_k: int = 20
    rerank_top_k: int = 10
    hybrid_alpha: float = 0.7  # Dense weight
    hybrid_beta: float = 0.3  # Sparse weight

    # ── Celery ───────────────────────────────────────────────
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # ── Langfuse ─────────────────────────────────────────────
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
