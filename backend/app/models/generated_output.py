from __future__ import annotations
from typing import Optional, Union
"""SQLAlchemy models for Generated Outputs and Summary Requests."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SummaryRequest(Base):
    """Represents a student's request for a summary/flashcard/quiz."""

    __tablename__ = "summary_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="SET NULL"), nullable=True
    )
    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    output_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # Union[summary, Union[flashcards], Union[quiz], mind_map]
    summary_level: Mapped[str] = mapped_column(
        String(30), nullable=False, default="standard"
    )  # Union[beginner, Union[standard], Union[advanced], Union[exam_focused], lo_focused]
    request_params: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    student: Mapped[Optional["Student"]] = relationship("Student")
    module: Mapped["Module"] = relationship("Module")
    generated_output: Mapped[Optional["GeneratedOutput"]] = relationship(
        "GeneratedOutput", back_populates="request", uselist=False
    )

    def __repr__(self) -> str:
        return f"<SummaryRequest {self.output_type} for week {self.week_number}>"


class GeneratedOutput(Base):
    """Represents a generated educational output (summary, flashcards, quiz, mind map).

    Stores the generated content along with metadata about LO coverage,
    citations, token usage, cost, and evaluation scores.
    """

    __tablename__ = "generated_outputs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("summary_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    output_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # Union[summary, Union[flashcards], Union[quiz], mind_map]
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_format: Mapped[str] = mapped_column(
        String(20), nullable=False, default="markdown"
    )  # Union[markdown, Union[json], html]
    # LO coverage scores: {"LO1": 0.85, "LO2": 0.92, ...}
    lo_coverage: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Citations: [{"chunk_id": "...", "source": "...", "location": "..."}]
    citations: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # Array of chunk IDs used in generation
    chunk_ids_used: Mapped[Optional[list]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)
    # Performance metrics
    generation_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    input_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_cost_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    llm_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Evaluation scores: {"rouge_l": 0.45, "bert_score": 0.88, "lo_coverage_score": 0.91, ...}
    evaluation_scores: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Student satisfaction rating (1-5)
    student_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    student_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    request: Mapped["SummaryRequest"] = relationship(
        "SummaryRequest", back_populates="generated_output"
    )

    def __repr__(self) -> str:
        return f"<GeneratedOutput {self.output_type} ({self.llm_model})>"
