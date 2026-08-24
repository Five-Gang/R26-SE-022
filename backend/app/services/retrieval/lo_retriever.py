from __future__ import annotations
from typing import Optional, Union
"""LO-Anchored Retriever — the core research component of LOA-ESS.

Implements Learning Outcome-Guided Retrieval (LO-RAG): a dual-retrieval
architecture where LO embeddings serve as retrieval anchors alongside
user query embeddings. This ensures summaries cover intended learning
outcomes, not just statistically prominent content.
"""

from dataclasses import dataclass, field

from app.services.processing.embedding_service import EmbeddingService


@dataclass
class RetrievedChunk:
    """A chunk retrieved from the vector database with scoring metadata."""

    id: str
    content: str
    score: float
    source: str = "query"  # Union["query", Union["lo_anchor"], "both"]
    matched_lo_id: Optional[str] = None
    lo_similarity: Optional[float] = None
    metadata: dict = field(default_factory=dict)

    @property
    def source_ref(self) -> str:
        """Human-readable source reference for citations."""
        filename = self.metadata.get("source_filename", "Unknown")
        slide = self.metadata.get("slide_number")
        page = self.metadata.get("page_number")
        if slide:
            return f"{filename}, Slide {slide}"
        elif page:
            return f"{filename}, Page {page}"
        return filename


@dataclass
class RetrievalResult:
    """Complete result from the LO-anchored retrieval pipeline."""

    chunks: list[RetrievedChunk] = field(default_factory=list)
    learning_outcomes: list[dict] = field(default_factory=list)
    lo_coverage: dict[str, bool] = field(default_factory=dict)
    total_retrieved: int = 0
    total_after_rerank: int = 0


class LOAnchoredRetriever:
    """Implements the LO-RAG dual-retrieval strategy.

    Pipeline:
    1. Identify relevant Learning Outcomes for the module/week
    2. For each LO, retrieve aligned chunks using LO embeddings
    3. Retrieve query-relevant chunks using user query embedding
    4. Fuse results with deduplication
    5. Ensure LO coverage (force-retrieve for uncovered LOs)

    This is the PRIMARY RESEARCH CONTRIBUTION of LOA-ESS.
    """

    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service

    async def retrieve(
        self,
        query: str,
        learning_outcomes: list[dict],
        module_code: str,
        week_number: Optional[int] = None,
        top_k_per_lo: int = 5,
        top_k_query: int = 15,
    ) -> RetrievalResult:
        """Execute the full LO-anchored retrieval pipeline.

        Args:
            query: User's search query.
            learning_outcomes: List of LO dicts with 'id', 'text', 'bloom_level', 'embedding'.
            module_code: Module code for metadata filtering.
            week_number: Optional week number for scoping.
            top_k_per_lo: Number of chunks to retrieve per LO.
            top_k_query: Number of chunks to retrieve for the user query.

        Returns:
            RetrievalResult with fused, deduplicated chunks and LO coverage.
        """
        result = RetrievalResult(learning_outcomes=learning_outcomes)

        # ── Step 1: LO-Anchored Retrieval ──────────────────────
        # For each LO, use its embedding to find aligned chunks
        lo_chunks = []
        for lo in learning_outcomes:
            lo_embedding = lo.get("embedding")
            if not lo_embedding:
                # Generate embedding if not cached
                lo_embedding = await self.embedding_service.embed_text(lo["text"])

            # Build metadata filter
            filters = {"module_code": module_code}
            if week_number:
                filters["week_number"] = week_number

            # Search for chunks aligned with this LO
            search_results = await self.embedding_service.search_chunks(
                query_vector=lo_embedding,
                filters=filters,
                limit=top_k_per_lo,
            )

            for sr in search_results:
                chunk = RetrievedChunk(
                    id=sr["id"],
                    content=sr["content"],
                    score=sr["score"],
                    source="lo_anchor",
                    matched_lo_id=lo.get("lo_code", lo.get("id")),
                    lo_similarity=sr["score"],
                    metadata=sr["metadata"],
                )
                lo_chunks.append(chunk)

        # ── Step 2: Query-Based Retrieval ──────────────────────
        query_embedding = await self.embedding_service.embed_text(query)

        filters = {"module_code": module_code}
        if week_number:
            filters["week_number"] = week_number

        query_results = await self.embedding_service.search_chunks(
            query_vector=query_embedding,
            filters=filters,
            limit=top_k_query,
        )

        query_chunks = [
            RetrievedChunk(
                id=sr["id"],
                content=sr["content"],
                score=sr["score"],
                source="query",
                metadata=sr["metadata"],
            )
            for sr in query_results
        ]

        # ── Step 3: Fusion & Deduplication ─────────────────────
        all_chunks = self._fuse_and_dedup(lo_chunks, query_chunks)
        result.total_retrieved = len(all_chunks)

        # ── Step 4: LO Coverage Check ─────────────────────────
        covered_los = set()
        for chunk in all_chunks:
            if chunk.matched_lo_id:
                covered_los.add(chunk.matched_lo_id)

        result.lo_coverage = {
            lo.get("lo_code", lo.get("id", "")): lo.get("lo_code", lo.get("id", "")) in covered_los
            for lo in learning_outcomes
        }

        # ── Step 5: Force-Retrieve for Uncovered LOs ──────────
        uncovered = [
            lo for lo in learning_outcomes
            if lo.get("lo_code", lo.get("id", "")) not in covered_los
        ]
        for lo in uncovered:
            lo_embedding = lo.get("embedding")
            if not lo_embedding:
                lo_embedding = await self.embedding_service.embed_text(lo["text"])

            forced_results = await self.embedding_service.search_chunks(
                query_vector=lo_embedding,
                filters={"module_code": module_code},  # Broader search
                limit=2,
            )
            for sr in forced_results:
                chunk = RetrievedChunk(
                    id=sr["id"],
                    content=sr["content"],
                    score=sr["score"],
                    source="lo_anchor",
                    matched_lo_id=lo.get("lo_code", lo.get("id")),
                    lo_similarity=sr["score"],
                    metadata=sr["metadata"],
                )
                all_chunks.append(chunk)
                covered_los.add(lo.get("lo_code", lo.get("id", "")))

            # Update coverage
            result.lo_coverage[lo.get("lo_code", lo.get("id", ""))] = True

        result.chunks = all_chunks
        return result

    def _fuse_and_dedup(
        self,
        lo_chunks: list[RetrievedChunk],
        query_chunks: list[RetrievedChunk],
    ) -> list[RetrievedChunk]:
        """Fuse LO-anchored and query-based chunks with deduplication.

        When the same chunk appears in both sets, it gets a boosted score
        and is marked as source="both".
        """
        seen: dict[str, RetrievedChunk] = {}

        # Add LO chunks first
        for chunk in lo_chunks:
            key = chunk.id
            if key in seen:
                # Boost score for chunks matching multiple LOs
                existing = seen[key]
                existing.score = max(existing.score, chunk.score) * 1.1
                if chunk.matched_lo_id and existing.matched_lo_id:
                    # Track that this chunk matches multiple LOs
                    existing.source = "both"
            else:
                seen[key] = chunk

        # Add query chunks
        for chunk in query_chunks:
            key = chunk.id
            if key in seen:
                # Chunk found in both LO and query results — boost significantly
                existing = seen[key]
                existing.score = max(existing.score, chunk.score) * 1.2
                existing.source = "both"
            else:
                seen[key] = chunk

        # Sort by score descending
        fused = sorted(seen.values(), key=lambda c: c.score, reverse=True)
        return fused
