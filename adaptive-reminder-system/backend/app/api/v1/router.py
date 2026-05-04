"""v1 API router. As you add endpoints (reviews, schedule, feedback), wire
them up here. Versioning the API from day 1 is cheap insurance against
breaking changes later.
"""

from fastapi import APIRouter

from app.api.v1 import health

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
