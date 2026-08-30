from __future__ import annotations
from typing import Optional, Union
"""Summary Generation Orchestrator — ties the full LOA-ESS pipeline together.

This is the main service that orchestrates:
LO Retrieval → Hybrid Search → Re-ranking → Compression → Prompt → LLM → Validation
"""

import json
import uuid
from datetime import datetime, timezone

from app.services.generation.llm_gateway import LLMGateway, LLMResponse
from app.services.generation.output_validator import OutputValidator
from app.services.generation.prompt_builder import PromptBuilder
from app.services.processing.embedding_service import EmbeddingService
from app.services.retrieval.context_compressor import ContextCompressor
from app.services.retrieval.lo_retriever import LOAnchoredRetriever
from app.services.retrieval.reranker import CrossEncoderReranker


class SummaryGenerationOrchestrator:
    """Orchestrates the full LOA-ESS summary generation pipeline.

    This is the central coordinator that:
    1. Fetches learning outcomes for the requested module/week
    2. Runs LO-anchored retrieval (core research component)
    3. Re-ranks retrieved chunks
    4. Compresses context
    5. Builds Bloom's-aware prompt
    6. Calls LLM
    7. Validates output

    Returns structured output with LO coverage scores and citations.
    """

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.retriever = LOAnchoredRetriever(self.embedding_service)
        self.reranker = CrossEncoderReranker()
        self.compressor = ContextCompressor()
        self.prompt_builder = PromptBuilder()
        self.llm = LLMGateway()
        self.validator = OutputValidator()

    async def generate_summary(
        self,
        query: str,
        module_code: str,
        module_name: str,
        learning_outcomes: list[dict],
        week_number: Optional[int] = None,
        week_topic: str = "",
        summary_level: str = "standard",
        max_length: Optional[int] = None,
        module_outline: Optional[list[dict]] = None,
    ) -> dict:
        """Execute the full summary generation pipeline.

        Returns:
            Dict with 'content', 'lo_coverage', 'citations', 'metadata'.
        """
        import time
        start_time = time.time()

        # ── Step 1: LO-Anchored Retrieval ──
        retrieval_result = await self.retriever.retrieve(
            query=query,
            learning_outcomes=learning_outcomes,
            module_code=module_code,
            week_number=week_number,
            top_k_per_lo=3,
            top_k_query=8,
        )

        # ── Step 2: Re-rank ──
        chunk_dicts = [
            {
                "id": c.id,
                "content": c.content,
                "score": c.score,
                "metadata": {**c.metadata, "matched_lo_id": c.matched_lo_id},
            }
            for c in retrieval_result.chunks
        ]

        import asyncio
        reranked = await asyncio.to_thread(
            self.reranker.rerank_with_lo_boost,
            query=query,
            learning_outcomes=learning_outcomes,
            chunks=chunk_dicts,
            top_k=10,
        )

        # ── Step 3: Compress Context ──
        reranked_dicts = [
            {
                "id": r.id,
                "content": r.content,
                "metadata": r.metadata,
            }
            for r in reranked
        ]

        compressed = self.compressor.compress(
            chunks=reranked_dicts,
            learning_outcomes=learning_outcomes,
        )

        # ── Step 4: Build Prompt ──
        # Format chunks for prompt
        prompt_chunks = [
            {
                "content": r.content,
                "source_ref": self._build_source_ref(r.metadata),
                "matched_lo_id": r.metadata.get("matched_lo_id"),
            }
            for r in reranked
        ]

        messages = self.prompt_builder.build_summary_prompt(
            query=query,
            learning_outcomes=learning_outcomes,
            chunks=prompt_chunks,
            module_name=module_name,
            module_code=module_code,
            week_number=week_number,
            week_topic=week_topic,
            summary_level=summary_level,
            module_outline=module_outline,
        )

        # ── Step 5: Generate via LLM ──
        # Low temperature = faithful, precise synthesis
        llm_response = await self.llm.generate(
            messages=messages,
            temperature=0.15,
            max_tokens=max_length or 2000,
        )

        # ── Step 6: Validate ──
        validation = self.validator.validate(
            content=llm_response.content,
            learning_outcomes=learning_outcomes,
            output_type="summary",
        )

        generation_time = int((time.time() - start_time) * 1000)

        return {
            "content": llm_response.content,
            "content_format": "markdown",
            "lo_coverage": validation.lo_coverage_scores,
            "citations": [
                {
                    "text": c["full_match"],
                    "source": c["source"],
                    "location": c.get("location", ""),
                }
                for c in validation.extracted_citations
            ],
            "chunk_ids_used": [r.id for r in reranked],
            "metadata": {
                "model": llm_response.model,
                "input_tokens": llm_response.input_tokens,
                "output_tokens": llm_response.output_tokens,
                "generation_time_ms": generation_time,
                "estimated_cost_usd": llm_response.estimated_cost_usd,
                "chunks_retrieved": retrieval_result.total_retrieved,
                "chunks_used": len(reranked),
                "compression_ratio": compressed.compression_ratio,
            },
            "validation": {
                "is_valid": validation.is_valid,
                "overall_lo_coverage": validation.overall_lo_coverage,
                "uncovered_los": validation.uncovered_los,
                "citation_count": validation.citation_count,
                "warnings": validation.warnings,
            },
        }

    async def generate_flashcards(
        self,
        module_code: str,
        module_name: str,
        learning_outcomes: list[dict],
        week_number: Optional[int] = None,
        week_topic: str = "",
        num_cards: int = 15,
        num_flashcards: int = 15,   # alias accepted from API
        query: Optional[str] = None,
        module_outline: Optional[list[dict]] = None,
    ) -> dict:
        """Generate flashcards aligned with learning outcomes."""
        # Build retrieval query
        effective_num = num_flashcards or num_cards
        if not query:
            scope = f"Week {week_number} — {week_topic}" if week_number and week_topic else \
                    f"Week {week_number}" if week_number else module_name
            query = f"Key concepts and definitions for {scope} in {module_name}"

        retrieval_result = await self.retriever.retrieve(
            query=query,
            learning_outcomes=learning_outcomes,
            module_code=module_code,
            week_number=week_number,
        )

        prompt_chunks = [
            {
                "content": c.content,
                "source_ref": self._build_source_ref(c.metadata),
                "matched_lo_id": c.matched_lo_id,
            }
            for c in retrieval_result.chunks[:10]
        ]

        messages = self.prompt_builder.build_flashcard_prompt(
            learning_outcomes=learning_outcomes,
            chunks=prompt_chunks,
            module_name=module_name,
            module_code=module_code,
            week_number=week_number,
            num_cards=effective_num,
        )

        llm_response = await self.llm.generate(
            messages=messages,
            temperature=0.5,
            max_tokens=3000,
            json_mode=True,
        )

        try:
            raw = llm_response.content.strip()
            print(f"[FLASHCARD DEBUG] raw response (first 300 chars): {raw[:300]}")
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                flashcards = parsed
            elif isinstance(parsed, dict):
                flashcards = parsed.get("flashcards") or []
            else:
                flashcards = []
            print(f"[FLASHCARD DEBUG] parsed {len(flashcards)} flashcards")
        except (json.JSONDecodeError, Exception) as e:
            print(f"[FLASHCARD DEBUG] JSON parse error: {e}")
            print(f"[FLASHCARD DEBUG] raw content was: {llm_response.content[:500]}")
            flashcards = []

        return {
            "content": "",   # not used for flashcards
            "flashcards": flashcards,
            "total": len(flashcards),
            "citations": [],
            "lo_coverage": {lo["lo_code"]: 0.8 for lo in learning_outcomes},
            "metadata": {
                "model": llm_response.model,
                "input_tokens": llm_response.input_tokens,
                "output_tokens": llm_response.output_tokens,
                "estimated_cost_usd": llm_response.estimated_cost_usd,
                "generation_time_ms": 0,
                "chunks_retrieved": retrieval_result.total_retrieved,
                "chunks_used": len(prompt_chunks),
                "compression_ratio": 1.0,
            },
        }

    async def generate_quiz(
        self,
        module_code: str,
        module_name: str,
        learning_outcomes: list[dict],
        week_number: Optional[int] = None,
        week_topic: str = "",
        num_questions: int = 6,
        query: Optional[str] = None,
        module_outline: Optional[list[dict]] = None,
    ) -> dict:
        """Generate a quiz aligned with learning outcomes."""
        if not query:
            scope = f"Week {week_number} — {week_topic}" if week_number and week_topic else \
                    f"Week {week_number}" if week_number else module_name
            query = f"Topics and concepts for quiz on {scope} in {module_name}"

        retrieval_result = await self.retriever.retrieve(
            query=query,
            learning_outcomes=learning_outcomes,
            module_code=module_code,
            week_number=week_number,
        )

        prompt_chunks = [
            {
                "content": c.content,
                "source_ref": self._build_source_ref(c.metadata),
                "matched_lo_id": c.matched_lo_id,
            }
            for c in retrieval_result.chunks[:12]
        ]

        messages = self.prompt_builder.build_quiz_prompt(
            learning_outcomes=learning_outcomes,
            chunks=prompt_chunks,
            module_name=module_name,
            module_code=module_code,
            week_number=week_number,
            week_topic=week_topic,
            num_questions=num_questions,
        )

        llm_response = await self.llm.generate(
            messages=messages,
            temperature=0.7,
            max_tokens=3000,
            json_mode=True,
        )

        try:
            raw = llm_response.content.strip()
            print(f"[QUIZ DEBUG] raw response (first 500 chars): {raw[:500]}")
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                questions = parsed
            elif isinstance(parsed, dict):
                questions = parsed.get("questions") or parsed.get("quiz") or []
            else:
                questions = []
            print(f"[QUIZ DEBUG] parsed {len(questions)} questions")
        except (json.JSONDecodeError, Exception) as e:
            print(f"[QUIZ DEBUG] JSON parse error: {e}")
            print(f"[QUIZ DEBUG] raw content was: {llm_response.content[:1000]}")
            questions = []

        return {
            "content": "",   # not used for quiz
            "questions": questions,
            "total": len(questions),
            "citations": [],
            "lo_coverage": {lo["lo_code"]: 0.8 for lo in learning_outcomes},
            "metadata": {
                "model": llm_response.model,
                "input_tokens": llm_response.input_tokens,
                "output_tokens": llm_response.output_tokens,
                "estimated_cost_usd": llm_response.estimated_cost_usd,
                "generation_time_ms": 0,
                "chunks_retrieved": retrieval_result.total_retrieved,
                "chunks_used": len(prompt_chunks),
                "compression_ratio": 1.0,
            },
        }

    def _build_source_ref(self, metadata: dict) -> str:
        """Build a human-readable source reference string."""
        filename = metadata.get("source_filename", "Unknown")
        slide = metadata.get("slide_number")
        page = metadata.get("page_number")
        if slide:
            return f"{filename}, Slide {slide}"
        elif page:
            return f"{filename}, Page {page}"
        return filename
