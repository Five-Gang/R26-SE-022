from __future__ import annotations
"""Document upload and management API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Chunk, Document, Module
from app.schemas import DocumentResponse, DocumentStatusResponse, DocumentUploadResponse

router = APIRouter()

# Allowed MIME types — PDF and PPTX/PPT only
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
    "application/vnd.ms-powerpoint",  # .ppt
}

DOCUMENT_TYPES = [
    "module_outline",
    "lecture_slide",
    "lecture_note",
]


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    module_id: uuid.UUID = Form(...),
    document_type: str = Form(...),
    week_number: Optional[int] = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document for processing.

    The document will be stored in object storage and queued for
    async processing (text extraction, chunking, embedding).
    """
    # Validate document type
    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document_type. Must be one of: {DOCUMENT_TYPES}",
        )

    # Validate module exists
    module_result = await db.execute(select(Module).where(Module.id == module_id))
    module = module_result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Resolve week_id if week_number is provided
    week_id = None
    if week_number:
        from app.models import Week
        week_result = await db.execute(
            select(Week).where(Week.module_id == module_id, Week.week_number == week_number)
        )
        week = week_result.scalar_one_or_none()
        if week:
            week_id = week.id

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Generate storage path and save to uploads folder (use absolute path)
    import os
    _base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    upload_dir = os.path.join(_base_dir, "uploads", module.code)
    os.makedirs(upload_dir, exist_ok=True)

    storage_filename = f"{uuid.uuid4()}_{file.filename}"
    local_storage_path = os.path.join(upload_dir, storage_filename)

    with open(local_storage_path, "wb") as f:
        f.write(content)

    # Create document record
    document = Document(
        module_id=module_id,
        week_id=week_id,
        filename=storage_filename,
        original_filename=file.filename,
        document_type=document_type,
        storage_path=local_storage_path,
        mime_type=file.content_type,
        file_size_bytes=file_size,
        processing_status="pending",
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)

    # Queue background task for processing
    try:
        from app.tasks.ingestion_tasks import _process_outline_async, _process_document_async
        if document_type == "module_outline":
            import asyncio
            asyncio.create_task(_process_outline_async(str(document.id)))
        else:
            import asyncio
            asyncio.create_task(_process_document_async(str(document.id)))
    except Exception as e:
        print(f"Warning: Failed to dispatch ingestion task: {e}")

    return document


@router.get("/module/{module_id}", response_model=list[DocumentResponse])
async def list_module_documents(
    module_id: uuid.UUID,
    document_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all documents for a module."""
    query = select(Document).where(Document.module_id == module_id).order_by(Document.uploaded_at.desc())
    if document_type:
        query = query.where(Document.document_type == document_type)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get document details."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Check document processing status."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Count chunks created
    chunk_count = await db.execute(
        select(func.count()).select_from(Chunk).where(Chunk.document_id == document_id)
    )

    return DocumentStatusResponse(
        id=document.id,
        processing_status=document.processing_status,
        processing_error=document.processing_error,
        chunks_created=chunk_count.scalar_one(),
        processed_at=document.processed_at,
    )


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete a document and all its chunks/embeddings."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # TODO: Delete from object storage
    # TODO: Delete embeddings from Qdrant

    await db.delete(document)


@router.post("/{document_id}/reprocess", response_model=DocumentResponse)
async def reprocess_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Re-trigger ingestion for a failed or stuck document."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Reset status so pipeline will run again
    document.processing_status = "pending"
    document.processing_error = None
    await db.flush()
    await db.refresh(document)

    # Re-dispatch processing task
    try:
        from app.tasks.ingestion_tasks import _process_document_async
        import asyncio
        asyncio.create_task(_process_document_async(str(document.id)))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch task: {e}")

    return document
