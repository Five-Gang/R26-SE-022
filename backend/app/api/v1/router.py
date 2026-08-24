from __future__ import annotations
"""API v1 router — aggregates all endpoint routers."""

from fastapi import APIRouter

from app.api.v1 import documents, modules, summaries, compare

api_router = APIRouter()

api_router.include_router(modules.router, prefix="/modules", tags=["Modules"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(summaries.router, prefix="/summaries", tags=["Summaries"])
api_router.include_router(compare.router, prefix="/compare", tags=["Compare"])
