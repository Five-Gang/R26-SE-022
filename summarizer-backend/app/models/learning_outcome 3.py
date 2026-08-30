from __future__ import annotations
from typing import Optional, Union
"""SQLAlchemy model for Learning Outcomes."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LearningOutcome(Base):
    """Represents a curriculum-defined Learning Outcome.

    Learning Outcomes are first-class entities in LOA-ESS — they serve as
    retrieval anchors and generation constraints (the core research contribution).
    Each LO is classified by Bloom's Taxonomy level to guide generation depth.
    """

    __tablename__ = "learning_outcomes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lo_code: Mapped[str] = mapped_column(String(10), nullable=False)  # "LO1", "LO2"
    text: Mapped[str] = mapped_column(Text, nullable=False)
    bloom_level: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # Union[Remember, Union[Understand], Union[Apply], Union[Analyze], Union[Evaluate], Create]
    bloom_verb: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assessment_weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    topic_keywords: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    # Reference to the Qdrant vector point ID for this LO's embedding
    embedding_vector_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    module: Mapped["Module"] = relationship("Module", back_populates="learning_outcomes")
    week_associations: Mapped[list["LearningOutcomeWeek"]] = relationship(
        "LearningOutcomeWeek", back_populates="learning_outcome", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<LO {self.lo_code} [{self.bloom_level}]: {self.text[:60]}...>"


class LearningOutcomeWeek(Base):
    """Many-to-many association: which LOs are taught in which weeks."""

    __tablename__ = "learning_outcome_weeks"

    lo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_outcomes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    week_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("weeks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    # How strongly this LO is covered in this week (0.0-1.0)
    coverage_strength: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=1.0)

    # Relationships
    learning_outcome: Mapped["LearningOutcome"] = relationship(
        "LearningOutcome", back_populates="week_associations"
    )
    week: Mapped["Week"] = relationship("Week")
