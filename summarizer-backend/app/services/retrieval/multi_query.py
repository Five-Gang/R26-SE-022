from __future__ import annotations
from typing import Optional, Union
"""Multi-Query Retrieval — generates sub-queries for diverse coverage.

Uses LLM to decompose a user query into multiple sub-queries
that cover different aspects, then merges results for broader
context coverage.
"""

import re
from dataclasses import dataclass, field

from app.services.generation.llm_gateway import LLMGateway
from app.services.processing.embedding_service import EmbeddingService


@dataclass
class MultiQueryResult:
    """Result from multi-query expansion and retrieval."""

    original_query: str
    sub_queries: list[str] = field(default_factory=list)
    all_chunks: list[dict] = field(default_factory=list)
    unique_chunks: int = 0


class MultiQueryRetriever:
    """Generates multiple sub-queries for broader retrieval coverage.

    A single query may miss relevant context. Multi-query breaks the
    original query into 3-4 different perspectives, retrieves for each,
    then merges and deduplicates the results.

    Example:
    Query: "Explain normalization in databases"
    Sub-queries:
    - "What is database normalization and why is it needed?"
    - "First Normal Form 1NF Second Normal Form 2NF Third Normal Form 3NF"
    - "Normalization vs denormalization trade-offs"
    """

    def __init__(
        self,
        embedding_service: EmbeddingService,
        llm_gateway: Optional[LLMGateway] = None,
    ):
        self.embedding_service = embedding_service
        self.llm = llm_gateway

    async def expand_query(self, query: str, num_variants: int = 3) -> list[str]:
        """Generate sub-query variants from the original query.

        Uses LLM if available, otherwise falls back to rule-based expansion.
        """
        if self.llm:
            return await self._llm_expand(query, num_variants)
        return self._rule_based_expand(query, num_variants)

    async def retrieve(
        self,
        query: str,
        module_code: str,
        week_number: Optional[int] = None,
        top_k_per_query: int = 10,
        num_variants: int = 3,
    ) -> MultiQueryResult:
        """Expand query and retrieve for all variants.

        Args:
            query: Original user query.
            module_code: Module for scoping.
            week_number: Optional week filter.
            top_k_per_query: Results per sub-query.
            num_variants: Number of sub-queries to generate.

        Returns:
            MultiQueryResult with merged, deduplicated chunks.
        """
        result = MultiQueryResult(original_query=query)

        # Generate sub-queries
        sub_queries = await self.expand_query(query, num_variants)
        result.sub_queries = sub_queries

        # Include the original query
        all_queries = [query] + sub_queries

        # Retrieve for each query
        seen_ids: set[str] = set()
        filters = {"module_code": module_code}
        if week_number:
            filters["week_number"] = week_number

        for q in all_queries:
            embedding = await self.embedding_service.embed_text(q)
            chunks = await self.embedding_service.search_chunks(
                query_vector=embedding,
                filters=filters,
                limit=top_k_per_query,
            )

            for chunk in chunks:
                cid = chunk["id"]
                if cid not in seen_ids:
                    seen_ids.add(cid)
                    result.all_chunks.append(chunk)

        result.unique_chunks = len(result.all_chunks)
        return result

    async def _llm_expand(self, query: str, num_variants: int) -> list[str]:
        """Use LLM to generate query variants."""
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a query expansion expert. Generate alternative search queries "
                    "that cover different aspects of the original question. Each variant should "
                    "target different relevant concepts or phrasings. Return ONLY a numbered list."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Generate {num_variants} alternative search queries for: \"{query}\"\n\n"
                    "Focus on:\n"
                    "1. Different terminology/synonyms\n"
                    "2. Related sub-concepts\n"
                    "3. Different granularity levels"
                ),
            },
        ]

        response = await self.llm.generate(
            messages=messages,
            temperature=0.7,
            max_tokens=300,
        )

        # Parse numbered list
        lines = response.content.strip().split("\n")
        queries = []
        for line in lines:
            # Remove numbering like "1.", "2.", etc.
            cleaned = re.sub(r"^\d+[.)]\s*", "", line).strip()
            if cleaned and len(cleaned) > 10:
                queries.append(cleaned)

        return queries[:num_variants]

    def _rule_based_expand(self, query: str, num_variants: int) -> list[str]:
        """Rule-based query expansion fallback (no LLM needed)."""
        variants = []

        # Variant 1: Question form
        if not query.strip().endswith("?"):
            variants.append(f"What is {query}?")

        # Variant 2: Definition form
        words = query.split()
        if len(words) >= 2:
            variants.append(f"Define and explain {' '.join(words[-3:])}")

        # Variant 3: Example form
        variants.append(f"Examples of {query}")

        # Variant 4: Comparison form
        variants.append(f"Key concepts related to {query}")

        return variants[:num_variants]
