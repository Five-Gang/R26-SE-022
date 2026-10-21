from __future__ import annotations
"""Pydantic schemas for Document API endpoints."""

import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    id: uuid.UUID
    filename: str
    document_type: str
    processing_status: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: uuid.UUID
    module_id: uuid.UUID
    week_id: Optional[uuid.UUID]
    filename: str
    original_filename: str
    document_type: str
    mime_type: Optional[str]
    page_count: Optional[int]
    file_size_bytes: Optional[int]
    processing_status: str
    processing_error: Optional[str]
    uploaded_at: datetime
    processed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class DocumentStatusResponse(BaseModel):
    id: uuid.UUID
    processing_status: str
    processing_error: Optional[str]
    chunks_created: int = 0
    processed_at: Optional[datetime]
