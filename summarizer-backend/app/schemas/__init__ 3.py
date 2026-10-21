from __future__ import annotations
"""Schemas package."""

from app.schemas.document import DocumentResponse, DocumentStatusResponse, DocumentUploadResponse
from app.schemas.module import (
    LearningOutcomeCreate,
    LearningOutcomeResponse,
    ModuleCreate,
    ModuleDetailResponse,
    ModuleResponse,
    ModuleUpdate,
    WeekCreate,
    WeekResponse,
)
from app.schemas.summary import (
    FlashcardSetResponse,
    MindMapResponse,
    QuizResponse,
    RatingRequest,
    SummaryGenerateRequest,
    SummaryResponse,
)

__all__ = [
    "ModuleCreate",
    "ModuleUpdate",
    "ModuleResponse",
    "ModuleDetailResponse",
    "WeekCreate",
    "WeekResponse",
    "LearningOutcomeCreate",
    "LearningOutcomeResponse",
    "DocumentUploadResponse",
    "DocumentResponse",
    "DocumentStatusResponse",
    "SummaryGenerateRequest",
    "SummaryResponse",
    "FlashcardSetResponse",
    "QuizResponse",
    "MindMapResponse",
    "RatingRequest",
]
