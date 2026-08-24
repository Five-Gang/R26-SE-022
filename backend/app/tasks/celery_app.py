from __future__ import annotations
"""Celery application configuration for async task processing."""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "loa_ess",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Task routing
    task_routes={
        "app.tasks.ingestion_tasks.*": {"queue": "ingestion"},
        "app.tasks.generation_tasks.*": {"queue": "generation"},
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
