from __future__ import annotations
from typing import Optional, Union
"""SQLAlchemy model for Module."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Module(Base):
    """Represents a university module/course unit (e.g., IT2060 - Database Systems)."""

    __tablename__ = "modules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    lecturer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assessment_structure: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    outline_processed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    learning_outcomes: Mapped[list["LearningOutcome"]] = relationship(
        "LearningOutcome", back_populates="module", cascade="all, delete-orphan"
    )
    weeks: Mapped[list["Week"]] = relationship(
        "Week", back_populates="module", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="module", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Module {self.code}: {self.name}>"


class Week(Base):
    """Represents a teaching week within a module."""

    __tablename__ = "weeks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subtopics: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    module: Mapped["Module"] = relationship("Module", back_populates="weeks")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="week")

    __table_args__ = (
        {"schema": None},
    )

    def __repr__(self) -> str:
        return f"<Week {self.week_number}: {self.topic}>"
