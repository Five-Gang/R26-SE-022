from __future__ import annotations
from typing import Optional, Union
"""Custom exception classes and global exception handlers."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse


class LOAESSException(Exception):
    """Base exception for LOA-ESS application."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class DocumentProcessingError(LOAESSException):
    """Raised when document ingestion or parsing fails."""

    def __init__(self, message: str, document_id: Optional[str] = None):
        self.document_id = document_id
        super().__init__(message=message, status_code=422)


class RetrievalError(LOAESSException):
    """Raised when vector retrieval or re-ranking fails."""

    def __init__(self, message: str):
        super().__init__(message=message, status_code=500)


class GenerationError(LOAESSException):
    """Raised when LLM generation fails."""

    def __init__(self, message: str, llm_provider: Optional[str] = None):
        self.llm_provider = llm_provider
        super().__init__(message=message, status_code=502)


class LearningOutcomeNotFoundError(LOAESSException):
    """Raised when no learning outcomes are found for a module/week."""

    def __init__(self, module_code: str, week: Optional[int] = None):
        msg = f"No learning outcomes found for module {module_code}"
        if week:
            msg += f", week {week}"
        super().__init__(message=msg, status_code=404)


class ModuleNotFoundError(LOAESSException):
    """Raised when a module is not found."""

    def __init__(self, module_id: str):
        super().__init__(message=f"Module not found: {module_id}", status_code=404)


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers for the FastAPI app."""

    @app.exception_handler(LOAESSException)
    async def loa_ess_exception_handler(request: Request, exc: LOAESSException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": type(exc).__name__,
                "message": exc.message,
                "detail": None,
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTPException",
                "message": exc.detail,
                "detail": None,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred.",
                "detail": str(exc) if app.debug else None,
            },
        )
