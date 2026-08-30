from __future__ import annotations
"""Compare endpoint — runs LOA-ESS pipeline vs generic AI side-by-side.

Returns both outputs for the same query so users can see the difference live.
The 'generic' call uses the same LLM but with NO curriculum context, NO LOs,
NO retrieved chunks — exactly simulating what ChatGPT/generic AI would produce.
"""

import asyncio
import uuid
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Module
from app.services.generation.llm_gateway import LLMGateway

router = APIRouter()


class CompareRequest(BaseModel):
    module_id: uuid.UUID
    query: str
    week_number: Optional[int] = None


class CompareResponse(BaseModel):
    query: str
    generic_ai: dict       # what a generic chatbot would produce
    loa_ess: dict          # what our pipeline produces
    generation_time_ms: int


@router.post("", response_model=CompareResponse, status_code=200)
async def compare_summaries(data: CompareRequest, db: AsyncSession = Depends(get_db)):
    """Run the same query through both a generic LLM and the full LOA-ESS pipeline.

    This endpoint is designed for live demonstration: the panel can see
    the same question answered generically vs curriculum-aware.
    """

    # ── Validate module ───────────────────────────────────────────
    module_result = await db.execute(select(Module).where(Module.id == data.module_id))
    module = module_result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # ── Fetch LOs and weeks ───────────────────────────────────────
    from app.models import LearningOutcome
    from app.models.module import Week

    lo_result = await db.execute(
        select(LearningOutcome).where(LearningOutcome.module_id == module.id)
    )
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

    week_topic = ""
    if data.week_number:
        matched = next((w for w in weeks if w.week_number == data.week_number), None)
        if matched:
            week_topic = matched.topic

    # ── Build generic-AI prompt (no LO context, no slides) ───────
    # This faithfully represents what ChatGPT sees when a student pastes
    # the same question into the chat box — no curriculum knowledge at all.
    generic_system = (
        "You are a helpful AI assistant. Answer the student's question about their course topic."
    )
    generic_user = (
        f"Please summarize the following topic for a university student:\n\n{data.query}\n\n"
        "Provide a clear, informative summary."
    )
    generic_messages = [
        {"role": "system", "content": generic_system},
        {"role": "user",   "content": generic_user},
    ]

    # ── Build LOA-ESS pipeline ────────────────────────────────────
    from app.services.generation.summary_generator import SummaryGenerationOrchestrator
    orchestrator = SummaryGenerationOrchestrator()

    start = time.time()

    # Run both in parallel
    generic_task = LLMGateway().generate(
        messages=generic_messages,
        temperature=0.7,
        max_tokens=1500,
    )
    loaess_task = orchestrator.generate_summary(
        query=data.query,
        module_code=module.code,
        module_name=module.name,
        learning_outcomes=lo_dicts,
        week_number=data.week_number,
        week_topic=week_topic,
        summary_level="standard",
        module_outline=module_outline,
    )

    generic_result, loaess_result = await asyncio.gather(generic_task, loaess_task)

    elapsed = int((time.time() - start) * 1000)

    # ── Count LO mentions in each output (simple heuristic) ──────
    generic_text = generic_result.content
    loaess_text = loaess_result.get("content", "")

    lo_codes = [lo["lo_code"] for lo in lo_dicts]
    generic_lo_hits = sum(1 for code in lo_codes if code.lower() in generic_text.lower())
    loaess_lo_hits = sum(1 for code in lo_codes if code.lower() in loaess_text.lower())

    import re
    generic_citations = len(re.findall(r'\[Source:', generic_text))
    loaess_citations = len(re.findall(r'\[Source:', loaess_text))

    return CompareResponse(
        query=data.query,
        generic_ai={
            "content": generic_result.content,
            "model": "Generic AI (no curriculum context)",
            "lo_coverage": generic_lo_hits,
            "total_los": len(lo_dicts),
            "citations": generic_citations,
            "tokens": generic_result.output_tokens,
            "generation_time_ms": generic_result.generation_time_ms,
        },
        loa_ess={
            "content": loaess_text,
            "model": loaess_result.get("metadata", {}).get("model", "gemini-2.5-flash"),
            "lo_coverage": loaess_lo_hits,
            "total_los": len(lo_dicts),
            "citations": loaess_citations,
            "chunks_used": loaess_result.get("metadata", {}).get("chunks_used", 0),
            "tokens": loaess_result.get("metadata", {}).get("output_tokens", 0),
            "generation_time_ms": loaess_result.get("metadata", {}).get("generation_time_ms", 0),
            "lo_coverage_scores": loaess_result.get("lo_coverage", {}),
        },
        generation_time_ms=elapsed,
    )
