"""Structured logging via structlog.

Why structured: when this runs in production with 30 students hitting it, you
need to grep logs by student_id, by endpoint, by latency bucket. Plain text
logs make that impossible. JSON logs make it trivial.
"""

import logging
import sys

import structlog

from app.core.config import get_settings


def configure_logging() -> None:
    """Wire up stdlib logging + structlog. Called once on app startup."""
    settings = get_settings()
    level = getattr(logging, settings.app_log_level.upper(), logging.INFO)

    # stdlib logging — uvicorn uses this under the hood
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    # in dev, use the pretty console renderer; in prod, JSON for log aggregators
    renderer: structlog.types.Processor
    if settings.app_env == "development":
        renderer = structlog.dev.ConsoleRenderer(colors=True)
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Use this everywhere instead of logging.getLogger."""
    return structlog.get_logger(name)
