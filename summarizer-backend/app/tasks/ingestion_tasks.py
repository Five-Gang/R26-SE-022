from __future__ import annotations
"""Document ingestion Celery tasks.

Async tasks for processing uploaded documents through the
full ingestion pipeline: parse → chunk → embed → store.
"""

import uuid
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, name="app.tasks.ingestion_tasks.process_document")
def process_document(self, document_id: str):
    """Process a single document through the ingestion pipeline.

    Pipeline:
    1. Fetch document record from DB
    2. Download file from object storage
    3. Parse (PDF/PPTX/OCR)
    4. Chunk (education-aware strategy)
    5. Generate embeddings
    6. Store chunks + embeddings in Qdrant
    7. Update document status

    This task runs asynchronously via Celery workers.
    """
    import asyncio
    asyncio.run(_process_document_async(document_id))


async def _process_document_async(document_id: str):
    """Async implementation of document processing."""
    from sqlalchemy import select
    from app.core.database import async_session_factory
    from app.models import Document, Chunk
    from app.services.ingestion import PDFParser, PPTXParser
    from app.services.processing.chunker import EducationAwareChunker
    from app.services.processing.embedding_service import EmbeddingService

    pdf_parser = PDFParser()
    pptx_parser = PPTXParser()
    chunker = EducationAwareChunker()
    embedding_service = EmbeddingService()

    async with async_session_factory() as db:
        try:
            # 1. Fetch document
            result = await db.execute(
                select(Document).where(Document.id == uuid.UUID(document_id))
            )
            document = result.scalar_one_or_none()
            if not document:
                return

            # Update status
            document.processing_status = "processing"
            await db.commit()

            from app.services.ingestion import PDFParser, PPTXParser, DocxParser
            pdf_parser = PDFParser()
            pptx_parser = PPTXParser()
            docx_parser = DocxParser()
            chunker = EducationAwareChunker()
            embedding_service = EmbeddingService()

            import asyncio as _asyncio
            mime = document.mime_type or ""
            if mime == "application/pdf" or document.filename.endswith(".pdf"):
                extraction = await _asyncio.to_thread(pdf_parser.extract, document.storage_path)
                raw_text = extraction.full_text

            elif "presentation" in mime or document.filename.endswith((".pptx", ".ppt")):
                extraction = await _asyncio.to_thread(pptx_parser.extract, document.storage_path)
                raw_text = extraction.full_text

            elif "wordprocessingml" in mime or document.filename.endswith((".docx", ".doc")):
                extraction = await _asyncio.to_thread(docx_parser.extract, document.storage_path)
                raw_text = extraction.full_text
            else:
                # Plain text
                with open(document.storage_path, errors="ignore") as f:
                    raw_text = f.read()

            document.extracted_text = raw_text

            # 3. Chunk document
            # Get module code from the related module
            module_code = ""
            if document.module_id:
                from app.models import Module
                mod_result = await db.execute(
                    select(Module).where(Module.id == document.module_id)
                )
                module = mod_result.scalar_one_or_none()
                if module:
                    module_code = module.code

            week_number = None
            if document.week_id:
                from app.models.module import Week
                week_result = await db.execute(
                    select(Week).where(Week.id == document.week_id)
                )
                week = week_result.scalar_one_or_none()
                if week:
                    week_number = week.week_number

            # Choose chunking strategy by document content & type
            if hasattr(extraction, "slides") and extraction.slides:
                slide_dicts = [
                    {
                        "slide_number": s.slide_number,
                        "title": s.title,
                        "full_text": s.full_text,
                        "has_images": s.has_images,
                        "has_tables": s.has_tables,
                    }
                    for s in extraction.slides
                ]
                edu_chunks = chunker.chunk_pptx(slide_dicts, module_code, week_number)
            elif document.document_type == "lab_sheet":
                edu_chunks = chunker.chunk_lab_sheet(raw_text, module_code, week_number)
            elif document.document_type == "module_outline":
                edu_chunks = chunker.chunk_module_outline(raw_text, module_code)
            else:
                edu_chunks = chunker.chunk_pdf_notes(raw_text, module_code, week_number)

            # 4. Initialize Qdrant collections
            await embedding_service.initialize_collections()

            # 5. Generate embeddings in batch and store
            if edu_chunks:
                chunk_contents = [c.content for c in edu_chunks]
                embeddings = await embedding_service.embed_texts(chunk_contents)

                for edu_chunk, embedding in zip(edu_chunks, embeddings):
                    # Store in Qdrant
                    point_id = await embedding_service.upsert_chunk(
                        chunk_id=edu_chunk.id,
                        embedding=embedding,
                        content=edu_chunk.content,
                        metadata={
                            "module_code": module_code,
                            "week_number": week_number,
                            "document_type": document.document_type,
                            "section_title": edu_chunk.section_title or "",
                            "slide_number": edu_chunk.slide_number,
                            "source_filename": document.original_filename,
                            **{k: v for k, v in (edu_chunk.metadata or {}).items()
                               if k not in ("module_code", "week_number", "document_type")},
                        },
                    )

                    # Store chunk record in PostgreSQL
                    db_chunk = Chunk(
                        id=uuid.UUID(edu_chunk.id),
                        document_id=document.id,
                        parent_chunk_id=(
                            uuid.UUID(edu_chunk.parent_id) if edu_chunk.parent_id else None
                        ),
                        chunk_type=edu_chunk.chunk_type,
                        content=edu_chunk.content,
                        token_count=edu_chunk.token_count,
                        slide_number=edu_chunk.slide_number,
                        section_title=edu_chunk.section_title,
                        has_code=edu_chunk.has_code,
                        has_table=edu_chunk.has_table,
                        has_image=edu_chunk.has_image,
                        chunk_metadata=edu_chunk.metadata,
                        qdrant_point_id=point_id,
                    )
                    db.add(db_chunk)

            # 6. Update document status
            document.processing_status = "completed"
            document.processed_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            document.processing_status = "failed"
            document.processing_error = str(e)
            await db.commit()
            raise


@celery_app.task(bind=True, name="app.tasks.ingestion_tasks.process_module_outline")
def process_module_outline(self, document_id: str):
    """Process a module outline: extract LOs, weeks, and assessment structure.

    This is a specialized task that parses the module outline and populates
    the structured curriculum data (LOs with Bloom's classification, weeks).
    """
    import asyncio
    asyncio.run(_process_outline_async(document_id))


async def _process_outline_async(document_id: str):
    """Async implementation of module outline processing."""
    print(f"🚀 Starting _process_outline_async for document {document_id}")
    from sqlalchemy import select
    from app.core.database import async_session_factory
    from app.models import Document, Module, LearningOutcome, Week
    from app.services.ingestion import PDFParser, DocxParser, LearningOutcomeExtractor
    from app.services.processing.embedding_service import EmbeddingService

    pdf_parser = PDFParser()
    docx_parser = DocxParser()
    lo_extractor = LearningOutcomeExtractor()
    embedding_service = EmbeddingService()

    async with async_session_factory() as db:
        try:
            # Fetch document
            result = await db.execute(
                select(Document).where(Document.id == uuid.UUID(document_id))
            )
            document = result.scalar_one_or_none()
            if not document:
                print(f"❌ Document {document_id} not found in DB")
                return

            import asyncio as _asyncio
            # Parse outline text (blocking IO — run in thread pool)
            if document.filename.endswith((".docx", ".doc")):
                extraction = await _asyncio.to_thread(docx_parser.extract, document.storage_path)
            else:
                extraction = await _asyncio.to_thread(pdf_parser.extract, document.storage_path)

            text = extraction.full_text

            # Extract structured data from module outline
            outline_data = lo_extractor.extract_from_text(text)

            # Update module with extracted data
            mod_result = await db.execute(
                select(Module).where(Module.id == document.module_id)
            )
            module = mod_result.scalar_one_or_none()
            if not module:
                return

            if outline_data.assessment_structure:
                module.assessment_structure = outline_data.assessment_structure
            if outline_data.lecturer:
                module.lecturer = outline_data.lecturer

            # Initialize embedding collections
            await embedding_service.initialize_collections()

            # Create learning outcomes
            for lo_data in outline_data.learning_outcomes:
                # Generate LO embedding for retrieval
                lo_embedding = await embedding_service.embed_text(lo_data.text)

                # Store in Qdrant
                vector_id = await embedding_service.upsert_learning_outcome(
                    lo_id=lo_data.lo_code,
                    embedding=lo_embedding,
                    lo_text=lo_data.text,
                    metadata={
                        "module_code": module.code,
                        "bloom_level": lo_data.bloom_level,
                        "bloom_verb": lo_data.bloom_verb,
                    },
                )

                # Store in PostgreSQL
                lo = LearningOutcome(
                    module_id=module.id,
                    lo_code=lo_data.lo_code,
                    text=lo_data.text,
                    bloom_level=lo_data.bloom_level,
                    bloom_verb=lo_data.bloom_verb,
                    topic_keywords=lo_data.topic_keywords,
                    embedding_vector_id=vector_id,
                )
                db.add(lo)

            # Create weeks
            for week_data in outline_data.weekly_breakdown:
                week = Week(
                    module_id=module.id,
                    week_number=week_data["week_number"],
                    topic=week_data["topic"],
                )
                db.add(week)

            module.outline_processed = True
            document.processing_status = "completed"
            document.processed_at = datetime.now(timezone.utc)
            await db.commit()

        except Exception as e:
            print(f"❌ Error in _process_outline_async: {e}")
            import traceback
            traceback.print_exc()
            document.processing_status = "failed"
            document.processing_error = str(e)
            await db.commit()
            raise
