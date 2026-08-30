from __future__ import annotations
from typing import Optional, Union
"""Summary, Flashcard, Quiz, and Mind Map generation API endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import GeneratedOutput, Module, SummaryRequest
from app.schemas import RatingRequest, SummaryGenerateRequest, SummaryResponse

router = APIRouter()


@router.post("", response_model=SummaryResponse, status_code=201)
async def generate_summary(
    data: SummaryGenerateRequest, db: AsyncSession = Depends(get_db)
):
    """Generate an educational summary, flashcard set, quiz, or mind map.

    This is the core endpoint that orchestrates the full LOA-ESS pipeline:
    1. Identifies relevant learning outcomes for the module/week
    2. Performs LO-anchored hybrid retrieval
    3. Re-ranks and compresses context
    4. Constructs Bloom's-aware prompt
    5. Generates output via LLM
    6. Validates LO coverage
    7. Extracts citations
    """
    # Validate module exists
    module_result = await db.execute(
        select(Module).where(Module.id == data.module_id)
    )
    module = module_result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Create summary request record
    request = SummaryRequest(
        module_id=data.module_id,
        week_number=data.week_number,
        query_text=data.query,
        output_type=data.output_type,
        summary_level=data.summary_level,
        request_params=data.options.model_dump() if data.options else None,
    )
    db.add(request)
    await db.flush()

    # ── Fetch Module Learning Outcomes ──
    from app.models import LearningOutcome
    lo_query = select(LearningOutcome).where(LearningOutcome.module_id == module.id)
    lo_result = await db.execute(lo_query)
    los = lo_result.scalars().all()

    lo_dicts = [
        {
            "lo_code": lo.lo_code,
            "text": lo.text,
            "bloom_level": lo.bloom_level,
            "bloom_verb": lo.bloom_verb or "",
            "topic_keywords": lo.topic_keywords or [],
        }
        for lo in los
    ]

    # ── Fetch Module Weekly Outline ──
    from app.models.module import Week
    weeks_result = await db.execute(
        select(Week).where(Week.module_id == module.id).order_by(Week.week_number)
    )
    weeks = weeks_result.scalars().all()
    module_outline = [
        {
            "week_number": w.week_number,
            "topic": w.topic,
            "subtopics": w.subtopics or [],
            "description": w.description or "",
        }
        for w in weeks
    ]

    # Resolve week topic for the requested week
    week_topic = ""
    if data.week_number:
        matched = next((w for w in weeks if w.week_number == data.week_number), None)
        if matched:
            week_topic = matched.topic

    # ── Route to correct generator based on output_type ──────────────────────
    from app.services.generation.summary_generator import SummaryGenerationOrchestrator
    orchestrator = SummaryGenerationOrchestrator()

    import time
    start_time = time.time()

    if data.output_type == "quiz":
        pipeline_result = await orchestrator.generate_quiz(
            query=data.query,
            module_code=module.code,
            module_name=module.name,
            learning_outcomes=lo_dicts,
            week_number=data.week_number,
            week_topic=week_topic,
            module_outline=module_outline,
            num_questions=data.options.num_quiz_questions if data.options else 10,
        )
    elif data.output_type == "flashcards":
        pipeline_result = await orchestrator.generate_flashcards(
            query=data.query,
            module_code=module.code,
            module_name=module.name,
            learning_outcomes=lo_dicts,
            week_number=data.week_number,
            week_topic=week_topic,
            module_outline=module_outline,
            num_flashcards=data.options.num_flashcards if data.options else 15,
        )
    else:
        # Default: summary
        pipeline_result = await orchestrator.generate_summary(
            query=data.query,
            module_code=module.code,
            module_name=module.name,
            learning_outcomes=lo_dicts,
            week_number=data.week_number,
            week_topic=week_topic,
            summary_level=data.summary_level,
            max_length=data.options.max_length if data.options else None,
            module_outline=module_outline,
        )


    elapsed_ms = int((time.time() - start_time) * 1000)

    # ── Determine content to persist ─────────────────────────────────────────
    # For flashcards / quiz, the generator stores the list under its own key
    # and leaves content="" . Serialize the structured list as JSON so the
    # GET endpoint can always find it by reading the content column.
    import json as _json

    if data.output_type == "flashcards":
        stored_content = _json.dumps({"flashcards": pipeline_result.get("flashcards", [])})
        content_format = "json"
    elif data.output_type == "quiz":
        stored_content = _json.dumps({"questions": pipeline_result.get("questions", [])})
        content_format = "json"
    else:
        stored_content = pipeline_result.get("content", "")
        content_format = "markdown"

    # Save output to database
    output = GeneratedOutput(
        request_id=request.id,
        output_type=data.output_type,
        content=stored_content,
        content_format=content_format,
        lo_coverage=pipeline_result.get("lo_coverage", {}),
        citations=pipeline_result.get("citations", []),
        generation_time_ms=pipeline_result.get("metadata", {}).get("generation_time_ms", elapsed_ms),
        input_tokens=pipeline_result.get("metadata", {}).get("input_tokens", 0),
        output_tokens=pipeline_result.get("metadata", {}).get("output_tokens", 0),
        estimated_cost_usd=pipeline_result.get("metadata", {}).get("estimated_cost_usd", 0.0),
        llm_model=pipeline_result.get("metadata", {}).get("model", "gemini-2.5-flash"),
    )
    db.add(output)
    await db.flush()
    await db.refresh(output)

    lo_coverage_info = [
        {
            "lo_code": lo_code,
            "lo_text": next((l["text"] for l in lo_dicts if l["lo_code"] == lo_code), ""),
            "coverage_score": float(score),
            "bloom_level": next((l["bloom_level"] for l in lo_dicts if l["lo_code"] == lo_code), "Understand"),
        }
        for lo_code, score in pipeline_result.get("lo_coverage", {}).items()
    ]

    return SummaryResponse(
        id=output.id,
        content=output.content,
        content_format=output.content_format,
        output_type=output.output_type,
        learning_outcomes_covered=lo_coverage_info,
        citations=[
            {
                "text": c.get("text", ""),
                "source": c.get("source", "Lecture Material"),
                "location": c.get("location") or "",
            }
            for c in pipeline_result.get("citations", [])
        ],
        metadata=pipeline_result.get("metadata", {
            "model": output.llm_model,
            "input_tokens": output.input_tokens,
            "output_tokens": output.output_tokens,
            "generation_time_ms": output.generation_time_ms,
            "estimated_cost_usd": output.estimated_cost_usd,
            "chunks_retrieved": 0,
            "chunks_used": 0,
        }),
        questions=pipeline_result.get("questions"),
        flashcards=pipeline_result.get("flashcards"),
        created_at=output.created_at,
    )


@router.get("/{summary_id}", response_model=SummaryResponse)
async def get_summary(summary_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve a previously generated summary, flashcard set, or quiz."""
    result = await db.execute(
        select(GeneratedOutput).where(GeneratedOutput.id == summary_id)
    )
    output = result.scalar_one_or_none()
    if not output:
        raise HTTPException(status_code=404, detail="Summary not found")

    # ── Parse structured data from stored content ──────────────────────────────
    # For flashcards and quiz, the content field stores a JSON payload.
    # Parse it back so the UI can consume the structured list.
    import json

    flashcards = None
    questions = None

    if output.output_type == "flashcards":
        try:
            parsed = json.loads(output.content)
            if isinstance(parsed, list):
                flashcards = parsed
            elif isinstance(parsed, dict) and "flashcards" in parsed:
                flashcards = parsed["flashcards"]
        except (json.JSONDecodeError, TypeError):
            # Content may be plain markdown fallback — leave as None
            flashcards = []

    elif output.output_type == "quiz":
        try:
            parsed = json.loads(output.content)
            if isinstance(parsed, list):
                questions = parsed
            elif isinstance(parsed, dict) and "questions" in parsed:
                questions = parsed["questions"]
        except (json.JSONDecodeError, TypeError):
            questions = []

    # ── Rebuild LO coverage from stored lo_coverage dict ──────────────────────
    lo_coverage_list = []
    if output.lo_coverage:
        for lo_code, score in output.lo_coverage.items():
            lo_coverage_list.append({
                "lo_code": lo_code,
                "lo_text": "",
                "coverage_score": float(score),
                "bloom_level": "Understand",
            })

    # ── Rebuild citations from stored citations list ───────────────────────────
    citations_list = [
        {
            "text": c.get("text", ""),
            "source": c.get("source", "Lecture Material"),
            "location": c.get("location") or "",
        }
        for c in (output.citations or [])
    ]

    return SummaryResponse(
        id=output.id,
        content=output.content,
        content_format=output.content_format,
        output_type=output.output_type,
        learning_outcomes_covered=lo_coverage_list,
        citations=citations_list,
        flashcards=flashcards,
        questions=questions,
        metadata={
            "model": output.llm_model or "unknown",
            "input_tokens": output.input_tokens or 0,
            "output_tokens": output.output_tokens or 0,
            "generation_time_ms": output.generation_time_ms or 0,
            "estimated_cost_usd": output.estimated_cost_usd or 0.0,
            "chunks_retrieved": 0,
            "chunks_used": len(output.chunk_ids_used or []),
        },
        created_at=output.created_at,
    )


@router.get("", response_model=list[SummaryResponse])
async def list_summaries(
    module_id: Optional[uuid.UUID] = None,
    output_type: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List generated summaries with optional filtering."""
    query = (
        select(GeneratedOutput)
        .join(SummaryRequest)
        .order_by(GeneratedOutput.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if module_id:
        query = query.where(SummaryRequest.module_id == module_id)
    if output_type:
        query = query.where(GeneratedOutput.output_type == output_type)

    result = await db.execute(query)
    outputs = result.scalars().all()

    return [
        SummaryResponse(
            id=o.id,
            content=o.content,
            content_format=o.content_format,
            output_type=o.output_type,
            learning_outcomes_covered=[],
            citations=[],
            metadata={
                "model": o.llm_model or "unknown",
                "input_tokens": o.input_tokens or 0,
                "output_tokens": o.output_tokens or 0,
                "generation_time_ms": o.generation_time_ms or 0,
                "estimated_cost_usd": o.estimated_cost_usd or 0.0,
                "chunks_retrieved": 0,
                "chunks_used": len(o.chunk_ids_used or []),
            },
            created_at=o.created_at,
        )
        for o in outputs
    ]


@router.post("/rate", status_code=200)
async def rate_output(data: RatingRequest, db: AsyncSession = Depends(get_db)):
    """Submit a student rating for a generated output."""
    result = await db.execute(
        select(GeneratedOutput).where(GeneratedOutput.id == data.output_id)
    )
    output = result.scalar_one_or_none()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")

    output.student_rating = data.rating
    output.student_feedback = data.feedback
    await db.flush()

    return {"message": "Rating submitted", "output_id": data.output_id, "rating": data.rating}
