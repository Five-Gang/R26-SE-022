from __future__ import annotations
"""Models package — re-export all models for convenient imports."""

from app.models.chunk import Chunk, ChunkLOAlignment
from app.models.document import Document
from app.models.generated_output import GeneratedOutput, SummaryRequest
from app.models.learning_outcome import LearningOutcome, LearningOutcomeWeek
from app.models.module import Module, Week
from app.models.student import Student

__all__ = [
    "Module",
    "Week",
    "LearningOutcome",
    "LearningOutcomeWeek",
    "Document",
    "Chunk",
    "ChunkLOAlignment",
    "SummaryRequest",
    "GeneratedOutput",
    "Student",
]
