from __future__ import annotations
"""LOA-ESS FastAPI Application Entry Point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.database import engine, init_db
from app.core.exceptions import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown events."""
    settings = get_settings()

    # Startup
    await init_db()
    print(f"🚀 LOA-ESS Backend started ({settings.app_env})")
    print(f"📊 LLM Provider: {settings.llm_provider}")
    print(f"🔢 Embedding Provider: {settings.embedding_provider}")

    yield

    # Shutdown
    await engine.dispose()
    print("👋 LOA-ESS Backend shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="LOA-ESS API",
        description=(
            "Learning Outcome-Aware Educational Summarization System. "
            "A research-grade AI system that produces summaries aligned with "
            "curriculum-defined learning outcomes using LO-RAG architecture."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register exception handlers
    register_exception_handlers(app)

    # Include API router
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    # Health check
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "app": settings.app_name,
            "version": "0.1.0",
            "environment": settings.app_env,
        }

    return app


app = create_app()
