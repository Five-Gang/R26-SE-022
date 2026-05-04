"""FastAPI application factory.

Why a `create_app` function rather than a top-level `app = FastAPI()`?
- Tests can build a fresh app with overridden config.
- Settings are loaded once via lifespan, not at import time.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup (before yield) and shutdown (after yield)."""
    configure_logging()
    log = get_logger(__name__)
    log.info("app.startup", env=get_settings().app_env)
    yield
    log.info("app.shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Adaptive Reminder System",
        version="0.1.0",
        description="Emotion- and progress-aware adaptive study reminder system.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/", tags=["root"])
    def root() -> dict[str, str]:
        return {"name": "Adaptive Reminder System", "docs": "/docs"}

    return app


app = create_app()
