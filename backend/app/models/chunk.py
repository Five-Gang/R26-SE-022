from __future__ import annotations
from typing import Optional, Union
"""SQLAlchemy model for Chunks."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Chunk(Base):
    """Represents a text chunk extracted from a document.

    Chunks are the fundamental retrieval unit in LOA-ESS. Each chunk carries
    rich metadata for filtering and is linked to its source document and
    optionally to a parent chunk (for parent-child retrieval strategy).
    """

    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_chunk_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chunks.id", ondelete="SET NULL"), nullable=True
    )
    chunk_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="standalone"
    )  # Union[parent, Union[child], standalone]
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    slide_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    section_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    has_code: Mapped[bool] = mapped_column(Boolean, default=False)
    has_table: Mapped[bool] = mapped_column(Boolean, default=False)
    has_image: Mapped[bool] = mapped_column(Boolean, default=False)
    # Flexible metadata stored as JSON (module_code, week_number, bloom_level, etc.)
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Reference to Qdrant vector point ID
    qdrant_point_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="chunks")
    parent: Mapped[Optional["Chunk"]] = relationship(
        "Chunk", remote_side="Chunk.id", backref="children"
    )

    def __repr__(self) -> str:
        return f"<Chunk {self.id} ({self.chunk_type}, {self.token_count} tokens)>"


class ChunkLOAlignment(Base):
    """Many-to-many: tracks which chunks align with which Learning Outcomes.

    This is computed during ingestion by measuring cosine similarity between
    chunk embeddings and LO embeddings. Used to support LO-anchored retrieval.
    """

    __tablename__ = "chunk_lo_alignments"

    chunk_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chunks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    lo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_outcomes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    similarity_score: Mapped[float] = mapped_column(nullable=False)
