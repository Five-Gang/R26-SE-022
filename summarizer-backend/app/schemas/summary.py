from __future__ import annotations
"""Pydantic schemas for Summary/Flashcard/Quiz generation endpoints."""

import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


# ── Summary Request/Response ─────────────────────────────────

class SummaryGenerateRequest(BaseModel):
    module_id: uuid.UUID
    week_number: Optional[int] = Field(default=None, ge=1, le=15)
    query: str = Field(default="", min_length=0, max_length=2000)
    output_type: Literal["summary", "flashcards", "quiz", "mind_map"] = "summary"
    summary_level: Literal[
        "beginner", "standard", "advanced", "exam_focused", "lo_focused"
    ] = "standard"
    options: Optional[GenerationOptions] = None


class GenerationOptions(BaseModel):
    include_examples: bool = True
    include_citations: bool = True
    bloom_focus: Optional[str] = None  # Focus on specific Bloom's level
    max_length: Optional[int] = Field(default=None, ge=200, le=8000)
    num_flashcards: int = Field(default=15, ge=5, le=50)
    num_quiz_questions: int = Field(default=10, ge=5, le=30)


class CitationInfo(BaseModel):
    text: str
    source: str
    location: str = ""              # Optional — not always available from LLM extraction
    chunk_id: Optional[uuid.UUID] = None   # Optional — citations come from LLM text, not chunk refs


class LOCoverageInfo(BaseModel):
    lo_code: str
    lo_text: str
    coverage_score: float
    bloom_level: str


class GenerationMetadata(BaseModel):
    model: str
    input_tokens: int
    output_tokens: int
    generation_time_ms: int
    estimated_cost_usd: float
    chunks_retrieved: int
    chunks_used: int


class SummaryResponse(BaseModel):
    id: uuid.UUID
    content: str
    content_format: str
    output_type: str
    learning_outcomes_covered: list[LOCoverageInfo] = []
    citations: list[CitationInfo] = []
    questions: Optional[list[dict]] = None      # for quiz output
    flashcards: Optional[list[dict]] = None     # for flashcard output
    metadata: GenerationMetadata
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Flashcard Schemas ────────────────────────────────────────

class Flashcard(BaseModel):
    id: int
    front: str
    back: str
    learning_outcome: str
    bloom_level: str
    difficulty: Literal["easy", "medium", "hard"]
    source: str


class FlashcardSetResponse(BaseModel):
    id: uuid.UUID
    module_code: str
    week_number: Optional[int]
    flashcards: list[Flashcard]
    total: int
    created_at: datetime


# ── Quiz Schemas ─────────────────────────────────────────────

class QuizQuestion(BaseModel):
    id: int
    type: Literal["mcq", "true_false", "short_answer", "scenario"]
    question: str
    options: Optional[list[str]] = None  # For MCQ
    correct_answer: str
    explanation: str
    learning_outcome: str
    bloom_level: str
    difficulty: Literal["easy", "medium", "hard"]
    source: str


class QuizResponse(BaseModel):
    id: uuid.UUID
    module_code: str
    week_number: Optional[int]
    questions: list[QuizQuestion]
    total: int
    created_at: datetime


# ── Mind Map Schemas ─────────────────────────────────────────

class MindMapNode(BaseModel):
    id: str
    label: str
    level: int
    children: list["MindMapNode"] = []
    learning_outcome: Optional[str] = None


class MindMapResponse(BaseModel):
    id: uuid.UUID
    module_code: str
    week_number: Optional[int]
    root: MindMapNode
    created_at: datetime


# ── Rating Schema ────────────────────────────────────────────

class RatingRequest(BaseModel):
    output_id: uuid.UUID
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None


# Resolve forward references
SummaryGenerateRequest.model_rebuild()
MindMapNode.model_rebuild()
